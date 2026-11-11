// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {BlockLucky} from "../BlockLucky.sol";

contract ReentrantPlayer {
    enum Attack {
        None,
        ClaimPrize,
        ClaimRefund
    }

    BlockLucky public immutable lottery;
    Attack public attack;
    uint256 public targetRound;
    uint256 public reentryAttempts;
    bool public reentrySucceeded;

    constructor(BlockLucky lottery_) {
        lottery = lottery_;
    }

    function buy(uint32 quantity) external payable {
        lottery.buyTickets{value: msg.value}(quantity);
    }

    function arm(Attack attack_, uint256 roundId) external {
        attack = attack_;
        targetRound = roundId;
    }

    function claimPrize(uint256 roundId) external {
        lottery.claimPrize(roundId);
    }

    function claimRefund(uint256 roundId) external {
        lottery.claimRefund(roundId);
    }

    receive() external payable {
        if (attack == Attack.None || reentryAttempts > 0) return;
        reentryAttempts += 1;
        if (attack == Attack.ClaimPrize) {
            try lottery.claimPrize(targetRound) {
                reentrySucceeded = true;
            } catch {}
        } else {
            try lottery.claimRefund(targetRound) {
                reentrySucceeded = true;
            } catch {}
        }
    }
}
