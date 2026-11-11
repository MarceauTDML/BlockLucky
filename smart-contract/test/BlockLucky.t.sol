// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {BlockLucky} from "../contracts/BlockLucky.sol";
import {VRFCoordinatorV2_5Mock} from "@chainlink/contracts/src/v0.8/vrf/mocks/VRFCoordinatorV2_5Mock.sol";

contract BlockLuckyFuzzTest is Test {
    uint256 internal constant PRICE = 0.01 ether;
    uint32 internal constant MAX_TICKETS = 200;
    uint32 internal constant PER_PLAYER = 50;

    BlockLucky internal lottery;
    VRFCoordinatorV2_5Mock internal coordinator;
    address internal admin = makeAddr("mairie");
    address internal treasury = makeAddr("tresorerie");

    function setUp() public {
        coordinator = new VRFCoordinatorV2_5Mock(0.1 ether, 1 gwei, 4e15);
        uint256 subscriptionId = coordinator.createSubscription();
        coordinator.fundSubscription(subscriptionId, 1000 ether);

        lottery = new BlockLucky(
            address(coordinator),
            admin,
            treasury,
            BlockLucky.RoundConfig({
                ticketPrice: PRICE,
                maxTickets: MAX_TICKETS,
                minTicketsToDraw: 1,
                maxTicketsPerPlayer: PER_PLAYER,
                duration: 2 days,
                feeBps: 1000
            }),
            BlockLucky.VrfConfig({
                keyHash: keccak256("blocklucky"),
                subscriptionId: subscriptionId,
                callbackGasLimit: 500000,
                requestConfirmations: 3,
                nativePayment: false,
                drawTimeout: 1 days
            })
        );
        coordinator.addConsumer(subscriptionId, address(lottery));
    }

    function _buy(uint256 seed, uint8 players) internal returns (uint256 collected, uint32 sold) {
        uint256 count = bound(players, 1, 8);
        for (uint256 i = 0; i < count; ++i) {
            address player = address(uint160(uint256(keccak256(abi.encode(seed, i))) | 1));
            uint32 quantity = uint32(bound(uint256(keccak256(abi.encode(seed, i, "q"))), 1, 20));
            vm.deal(player, PRICE * quantity);
            vm.prank(player);
            lottery.buyTickets{value: PRICE * quantity}(quantity);
            collected += PRICE * quantity;
            sold += quantity;
        }
    }

    function testFuzz_PrizeAndFeeMatchCollectedFunds(uint256 seed, uint8 players, uint256 randomWord) public {
        (uint256 collected, uint32 sold) = _buy(seed, players);
        vm.warp(block.timestamp + 2 days);

        uint256 requestId = lottery.requestDraw();
        uint256[] memory words = new uint256[](1);
        words[0] = randomWord;
        coordinator.fulfillRandomWordsWithOverride(requestId, address(lottery), words);

        BlockLucky.Round memory round = lottery.getRound(1);
        assertEq(uint8(round.status), uint8(BlockLucky.RoundStatus.Completed));
        assertEq(round.ticketCount, sold);
        assertEq(round.totalCollected, collected);
        assertEq(round.prize + lottery.accruedFees(), collected);
        assertEq(lottery.accruedFees(), (collected * 1000) / 10000);
        assertLt(round.winningTicket, sold);
        assertEq(round.winner, lottery.ticketOwner(1, round.winningTicket));
        assertEq(address(lottery).balance, collected);
    }

    function testFuzz_ClaimsEmptyTheContractExactly(uint256 seed, uint8 players, uint256 randomWord) public {
        (uint256 collected, ) = _buy(seed, players);
        vm.warp(block.timestamp + 2 days);

        uint256 requestId = lottery.requestDraw();
        uint256[] memory words = new uint256[](1);
        words[0] = randomWord;
        coordinator.fulfillRandomWordsWithOverride(requestId, address(lottery), words);

        BlockLucky.Round memory round = lottery.getRound(1);
        uint256 winnerBefore = round.winner.balance;
        vm.prank(round.winner);
        lottery.claimPrize(1);
        assertEq(round.winner.balance - winnerBefore, round.prize);

        vm.prank(admin);
        lottery.withdrawFees();
        assertEq(treasury.balance, collected - round.prize);
        assertEq(address(lottery).balance, 0);
    }

    function testFuzz_RefundsReturnEveryContribution(uint256 seed, uint8 players) public {
        (uint256 collected, ) = _buy(seed, players);
        vm.prank(admin);
        lottery.cancelRound();

        uint256 count = bound(players, 1, 8);
        uint256 refunded;
        for (uint256 i = 0; i < count; ++i) {
            address player = address(uint160(uint256(keccak256(abi.encode(seed, i))) | 1));
            uint256 contribution = lottery.contributionOf(1, player);
            if (contribution == 0) continue;
            vm.prank(player);
            lottery.claimRefund(1);
            refunded += contribution;
        }
        assertEq(refunded, collected);
        assertEq(address(lottery).balance, 0);
    }

    function testFuzz_RejectsAnyIncorrectPayment(uint32 quantity, uint256 sent) public {
        quantity = uint32(bound(quantity, 1, PER_PLAYER));
        vm.assume(sent != PRICE * quantity);
        sent = bound(sent, 0, 100 ether);
        vm.assume(sent != PRICE * quantity);
        address player = makeAddr("joueur");
        vm.deal(player, sent);
        vm.prank(player);
        vm.expectRevert(abi.encodeWithSelector(BlockLucky.IncorrectPayment.selector, PRICE * quantity, sent));
        lottery.buyTickets{value: sent}(quantity);
    }
}
