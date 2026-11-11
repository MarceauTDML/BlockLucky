// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {VRFConsumerBaseV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";
import {AutomationCompatibleInterface} from "@chainlink/contracts/src/v0.8/automation/interfaces/AutomationCompatibleInterface.sol";

contract BlockLucky is VRFConsumerBaseV2Plus, AccessControl, Pausable, ReentrancyGuard, AutomationCompatibleInterface {
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    uint16 public constant MAX_FEE_BPS = 2000;
    uint16 public constant BPS_DENOMINATOR = 10000;

    enum RoundStatus {
        Open,
        Drawing,
        Completed,
        Cancelled
    }

    struct RoundConfig {
        uint256 ticketPrice;
        uint32 maxTickets;
        uint32 minTicketsToDraw;
        uint32 maxTicketsPerPlayer;
        uint64 duration;
        uint16 feeBps;
    }

    struct VrfConfig {
        bytes32 keyHash;
        uint256 subscriptionId;
        uint32 callbackGasLimit;
        uint16 requestConfirmations;
        bool nativePayment;
        uint64 drawTimeout;
    }

    struct Round {
        uint256 ticketPrice;
        uint256 totalCollected;
        uint256 prize;
        uint256 vrfRequestId;
        address winner;
        uint64 startTime;
        uint64 endTime;
        uint64 drawRequestedAt;
        uint32 ticketCount;
        uint32 maxTickets;
        uint32 minTicketsToDraw;
        uint32 maxTicketsPerPlayer;
        uint32 winningTicket;
        uint16 feeBps;
        RoundStatus status;
        bool prizeClaimed;
    }

    uint256 public currentRoundId;
    uint256 public accruedFees;
    address public treasury;
    RoundConfig public roundConfig;
    VrfConfig public vrfConfig;

    mapping(uint256 => Round) private rounds;
    mapping(uint256 => address[]) private ticketOwners;
    mapping(uint256 => mapping(address => uint32)) private ticketsByPlayer;
    mapping(uint256 => mapping(address => uint256)) private contributions;
    mapping(uint256 => uint256) public roundByRequestId;

    event RoundOpened(uint256 indexed roundId, uint256 ticketPrice, uint32 maxTickets, uint64 endTime);
    event TicketsPurchased(
        uint256 indexed roundId,
        address indexed player,
        address indexed payer,
        uint32 quantity,
        uint32 firstTicketIndex,
        uint32 totalTickets,
        uint256 amount
    );
    event DrawRequested(uint256 indexed roundId, uint256 indexed requestId, uint32 ticketCount);
    event WinnerPicked(
        uint256 indexed roundId,
        address indexed winner,
        uint32 winningTicket,
        uint256 prize,
        uint256 fee,
        uint256 indexed requestId
    );
    event PrizeClaimed(uint256 indexed roundId, address indexed winner, uint256 amount);
    event RoundCancelled(uint256 indexed roundId, uint32 ticketCount, uint256 totalCollected);
    event RefundClaimed(uint256 indexed roundId, address indexed player, uint256 amount);
    event FeesWithdrawn(address indexed treasury, uint256 amount);
    event TreasuryUpdated(address indexed previousTreasury, address indexed newTreasury);
    event RoundConfigUpdated(uint256 ticketPrice, uint32 maxTickets, uint64 duration, uint16 feeBps);
    event VrfConfigUpdated(bytes32 keyHash, uint256 subscriptionId, uint32 callbackGasLimit);

    error ZeroAddressNotAllowed();
    error InvalidConfiguration();
    error RoundNotOpen(uint256 roundId);
    error RoundExpired(uint256 roundId);
    error InvalidQuantity();
    error RoundSoldOut(uint256 roundId, uint32 remaining);
    error PlayerLimitReached(uint32 owned, uint32 limit);
    error IncorrectPayment(uint256 expected, uint256 received);
    error DrawNotReady(uint256 roundId);
    error DrawNotStale(uint256 roundId);
    error NotWinner(address caller);
    error PrizeAlreadyClaimed(uint256 roundId);
    error RoundNotCompleted(uint256 roundId);
    error RoundNotCancelled(uint256 roundId);
    error RoundNotCancellable(uint256 roundId);
    error NothingToRefund(uint256 roundId, address player);
    error NothingToWithdraw();
    error TransferFailed(address recipient, uint256 amount);

    constructor(
        address vrfCoordinator,
        address admin,
        address treasury_,
        RoundConfig memory initialRoundConfig,
        VrfConfig memory initialVrfConfig
    ) VRFConsumerBaseV2Plus(vrfCoordinator) {
        if (admin == address(0) || treasury_ == address(0)) revert ZeroAddressNotAllowed();
        _validateRoundConfig(initialRoundConfig);
        _validateVrfConfig(initialVrfConfig);

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);

        treasury = treasury_;
        roundConfig = initialRoundConfig;
        vrfConfig = initialVrfConfig;

        _openRound();
    }

    function buyTickets(uint32 quantity) external payable whenNotPaused nonReentrant {
        _buyTickets(msg.sender, quantity);
    }

    function buyTicketsFor(address player, uint32 quantity) external payable whenNotPaused nonReentrant {
        if (player == address(0)) revert ZeroAddressNotAllowed();
        _buyTickets(player, quantity);
    }

    function requestDraw() public whenNotPaused nonReentrant returns (uint256 requestId) {
        uint256 roundId = currentRoundId;
        if (!isDrawReady()) revert DrawNotReady(roundId);
        requestId = _requestRandomness(roundId);
    }

    function retryDraw() external onlyRole(OPERATOR_ROLE) nonReentrant returns (uint256 requestId) {
        uint256 roundId = currentRoundId;
        Round storage round = rounds[roundId];
        if (round.status != RoundStatus.Drawing) revert DrawNotReady(roundId);
        if (block.timestamp < round.drawRequestedAt + vrfConfig.drawTimeout) revert DrawNotStale(roundId);
        delete roundByRequestId[round.vrfRequestId];
        requestId = _requestRandomness(roundId);
    }

    function closeExpiredRound() public nonReentrant {
        uint256 roundId = currentRoundId;
        if (!isExpiredWithoutDraw()) revert RoundNotCancellable(roundId);
        _cancelRound(roundId);
    }

    function cancelRound() external onlyRole(OPERATOR_ROLE) nonReentrant {
        _cancelRound(currentRoundId);
    }

    function claimPrize(uint256 roundId) external nonReentrant {
        Round storage round = rounds[roundId];
        if (round.status != RoundStatus.Completed) revert RoundNotCompleted(roundId);
        if (msg.sender != round.winner) revert NotWinner(msg.sender);
        if (round.prizeClaimed) revert PrizeAlreadyClaimed(roundId);

        round.prizeClaimed = true;
        uint256 amount = round.prize;
        emit PrizeClaimed(roundId, msg.sender, amount);
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if (!success) revert TransferFailed(msg.sender, amount);
    }

    function claimRefund(uint256 roundId) external nonReentrant {
        if (rounds[roundId].status != RoundStatus.Cancelled) revert RoundNotCancelled(roundId);
        uint256 amount = contributions[roundId][msg.sender];
        if (amount == 0) revert NothingToRefund(roundId, msg.sender);

        contributions[roundId][msg.sender] = 0;
        emit RefundClaimed(roundId, msg.sender, amount);
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if (!success) revert TransferFailed(msg.sender, amount);
    }

    function withdrawFees() external onlyRole(OPERATOR_ROLE) nonReentrant {
        uint256 amount = accruedFees;
        if (amount == 0) revert NothingToWithdraw();
        accruedFees = 0;
        address recipient = treasury;
        emit FeesWithdrawn(recipient, amount);
        (bool success, ) = payable(recipient).call{value: amount}("");
        if (!success) revert TransferFailed(recipient, amount);
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function setTreasury(address newTreasury) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newTreasury == address(0)) revert ZeroAddressNotAllowed();
        emit TreasuryUpdated(treasury, newTreasury);
        treasury = newTreasury;
    }

    function setRoundConfig(RoundConfig calldata newConfig) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _validateRoundConfig(newConfig);
        roundConfig = newConfig;
        emit RoundConfigUpdated(newConfig.ticketPrice, newConfig.maxTickets, newConfig.duration, newConfig.feeBps);
    }

    function setVrfConfig(VrfConfig calldata newConfig) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _validateVrfConfig(newConfig);
        vrfConfig = newConfig;
        emit VrfConfigUpdated(newConfig.keyHash, newConfig.subscriptionId, newConfig.callbackGasLimit);
    }

    function checkUpkeep(bytes calldata) external view override returns (bool upkeepNeeded, bytes memory performData) {
        if (paused()) return (false, "");
        if (isDrawReady()) return (true, abi.encode(uint8(1)));
        if (isExpiredWithoutDraw()) return (true, abi.encode(uint8(2)));
        return (false, "");
    }

    function performUpkeep(bytes calldata) external override {
        if (!paused() && isDrawReady()) {
            requestDraw();
        } else if (isExpiredWithoutDraw()) {
            closeExpiredRound();
        } else {
            revert DrawNotReady(currentRoundId);
        }
    }

    function isDrawReady() public view returns (bool) {
        Round storage round = rounds[currentRoundId];
        if (round.status != RoundStatus.Open) return false;
        if (round.ticketCount < round.minTicketsToDraw) return false;
        return round.ticketCount == round.maxTickets || block.timestamp >= round.endTime;
    }

    function isExpiredWithoutDraw() public view returns (bool) {
        Round storage round = rounds[currentRoundId];
        return
            round.status == RoundStatus.Open &&
            block.timestamp >= round.endTime &&
            round.ticketCount < round.minTicketsToDraw;
    }

    function getRound(uint256 roundId) external view returns (Round memory) {
        return rounds[roundId];
    }

    function ticketOwner(uint256 roundId, uint256 ticketIndex) external view returns (address) {
        return ticketOwners[roundId][ticketIndex];
    }

    function ticketsOf(uint256 roundId, address player) external view returns (uint32) {
        return ticketsByPlayer[roundId][player];
    }

    function contributionOf(uint256 roundId, address player) external view returns (uint256) {
        return contributions[roundId][player];
    }

    function supportsInterface(bytes4 interfaceId) public view override(AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function fulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) internal override {
        uint256 roundId = roundByRequestId[requestId];
        Round storage round = rounds[roundId];
        if (roundId == 0 || round.status != RoundStatus.Drawing || round.vrfRequestId != requestId) return;

        delete roundByRequestId[requestId];

        uint32 winningTicket = uint32(randomWords[0] % round.ticketCount);
        address winner = ticketOwners[roundId][winningTicket];
        uint256 fee = (round.totalCollected * round.feeBps) / BPS_DENOMINATOR;
        uint256 prize = round.totalCollected - fee;

        round.winner = winner;
        round.winningTicket = winningTicket;
        round.prize = prize;
        round.status = RoundStatus.Completed;
        accruedFees += fee;

        emit WinnerPicked(roundId, winner, winningTicket, prize, fee, requestId);

        _openRound();
    }

    function _buyTickets(address player, uint32 quantity) private {
        uint256 roundId = currentRoundId;
        Round storage round = rounds[roundId];

        if (round.status != RoundStatus.Open) revert RoundNotOpen(roundId);
        if (block.timestamp >= round.endTime) revert RoundExpired(roundId);
        if (quantity == 0) revert InvalidQuantity();

        uint32 remaining = round.maxTickets - round.ticketCount;
        if (quantity > remaining) revert RoundSoldOut(roundId, remaining);

        uint32 owned = ticketsByPlayer[roundId][player];
        if (owned + quantity > round.maxTicketsPerPlayer) {
            revert PlayerLimitReached(owned, round.maxTicketsPerPlayer);
        }

        uint256 expected = round.ticketPrice * quantity;
        if (msg.value != expected) revert IncorrectPayment(expected, msg.value);

        uint32 firstTicketIndex = round.ticketCount;
        for (uint32 i = 0; i < quantity; ++i) {
            ticketOwners[roundId].push(player);
        }

        round.ticketCount = firstTicketIndex + quantity;
        round.totalCollected += msg.value;
        ticketsByPlayer[roundId][player] = owned + quantity;
        contributions[roundId][msg.sender] += msg.value;

        emit TicketsPurchased(roundId, player, msg.sender, quantity, firstTicketIndex, round.ticketCount, msg.value);
    }

    function _requestRandomness(uint256 roundId) private returns (uint256 requestId) {
        Round storage round = rounds[roundId];
        VrfConfig memory config = vrfConfig;
        round.status = RoundStatus.Drawing;
        round.drawRequestedAt = uint64(block.timestamp);

        requestId = s_vrfCoordinator.requestRandomWords(
            VRFV2PlusClient.RandomWordsRequest({
                keyHash: config.keyHash,
                subId: config.subscriptionId,
                requestConfirmations: config.requestConfirmations,
                callbackGasLimit: config.callbackGasLimit,
                numWords: 1,
                extraArgs: VRFV2PlusClient._argsToBytes(
                    VRFV2PlusClient.ExtraArgsV1({nativePayment: config.nativePayment})
                )
            })
        );

        round.vrfRequestId = requestId;
        roundByRequestId[requestId] = roundId;

        emit DrawRequested(roundId, requestId, round.ticketCount);
    }

    function _cancelRound(uint256 roundId) private {
        Round storage round = rounds[roundId];
        if (round.vrfRequestId != 0) delete roundByRequestId[round.vrfRequestId];
        round.status = RoundStatus.Cancelled;
        emit RoundCancelled(roundId, round.ticketCount, round.totalCollected);
        _openRound();
    }

    function _openRound() private {
        RoundConfig memory config = roundConfig;
        uint256 roundId = ++currentRoundId;
        uint64 endTime = uint64(block.timestamp) + config.duration;

        Round storage round = rounds[roundId];
        round.ticketPrice = config.ticketPrice;
        round.maxTickets = config.maxTickets;
        round.minTicketsToDraw = config.minTicketsToDraw;
        round.maxTicketsPerPlayer = config.maxTicketsPerPlayer;
        round.feeBps = config.feeBps;
        round.startTime = uint64(block.timestamp);
        round.endTime = endTime;
        round.status = RoundStatus.Open;

        emit RoundOpened(roundId, config.ticketPrice, config.maxTickets, endTime);
    }

    function _validateRoundConfig(RoundConfig memory config) private pure {
        if (
            config.ticketPrice == 0 ||
            config.maxTickets == 0 ||
            config.minTicketsToDraw == 0 ||
            config.minTicketsToDraw > config.maxTickets ||
            config.maxTicketsPerPlayer == 0 ||
            config.maxTicketsPerPlayer > config.maxTickets ||
            config.duration == 0 ||
            config.feeBps > MAX_FEE_BPS
        ) revert InvalidConfiguration();
    }

    function _validateVrfConfig(VrfConfig memory config) private pure {
        if (
            config.keyHash == bytes32(0) ||
            config.callbackGasLimit < 100_000 ||
            config.requestConfirmations == 0 ||
            config.drawTimeout == 0
        ) revert InvalidConfiguration();
    }
}
