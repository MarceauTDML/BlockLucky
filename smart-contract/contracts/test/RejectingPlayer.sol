// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {BlockLucky} from "../BlockLucky.sol";

contract RejectingPlayer {
    BlockLucky public immutable lottery;

    constructor(BlockLucky lottery_) {
        lottery = lottery_;
    }

    function buy(uint32 quantity) external payable {
        lottery.buyTickets{value: msg.value}(quantity);
    }

    function claimPrize(uint256 roundId) external {
        lottery.claimPrize(roundId);
    }

    function claimRefund(uint256 roundId) external {
        lottery.claimRefund(roundId);
    }
}
