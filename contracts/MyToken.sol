// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract MyToken is ERC20, Ownable, ReentrancyGuard {

    // --- Customize errors : reduces gas costs---
    error NotASigner(); //Not part of one of the signer
    error AlreadyApproved(); //Prevent a signatory from voting twice for the same proposal
    error NotEnoughApprovals(); //Min 2 signers
    error InvalidRequestId(); // Protect against interactions with requests that do not exist or have already completed
    error NoEthSent(); // A user who wants to buy tokens sends Ether with their transaction.

    // --- VARIABLES ---
    address[3] public signers;
    uint256 public constant TOKEN_RATE = 1000;
    
    // Struct for demands of minting and withdraw.
    struct MultiSigRequest {
        address to;
        uint256 amount;
        uint256 approvalCount;
        mapping(address => bool) hasApproved;
        bool executed;
    }

    // Mapping of multisgRequest to mintRequest
    mapping(uint256 => MultiSigRequest) public mintRequests;
    uint256 public mintRequestCount;

    // Mapping for withdraw.
    mapping(uint256 => MultiSigRequest) public withdrawRequests;
    uint256 public withdrawRequestCount;

    // --- Events ---
    event MintRequestCreated(uint256 requestId, address indexed requester, address indexed to, uint256 amount);
    event WithdrawalRequestCreated(uint256 requestId, address indexed requester, uint256 amount); // Specifc event for withdrawal
    event RequestApproved(uint256 requestId, address indexed approver, string requestType);
    event MintExecuted(uint256 requestId, address indexed to, uint256 amount);
    event WithdrawalExecuted(uint256 requestId, address indexed to, uint256 amount);

    // --- MODIFIER ---
    modifier onlySigner() {
        bool isSigner = false;
        for (uint i = 0; i < signers.length; i++) {
            if (msg.sender == signers[i]) {
                isSigner = true;
                break;
            }
        }
        if (!isSigner) revert NotASigner();
        _;
    }

    // --- CONSTRUCTOR ---
    constructor(address _signer1, address _signer2, address _signer3) 
        ERC20("Group 0 Token", "G0TK") 
        Ownable(msg.sender) { 
        signers[0] = _signer1;
        signers[1] = _signer2;
        signers[2] = _signer3;

        //1 ETH = 1,000,000,000,000,000,000 wei & 10** = 10 power 18
        _mint(msg.sender, 1_000_000 * (10**decimals())); // Use of _ for readability
    }

    // --- Buy of tokens ---
    receive() external payable {
        buyTokens();
    }

    function buyTokens() public payable {
        if (msg.value == 0) revert NoEthSent();
        uint256 amountToMint = msg.value * TOKEN_RATE;
        _mint(msg.sender, amountToMint);
    }

    // --- FUNCTIONS OF MINTING MULTI-SIGNATURE ---
    function requestMint(address _to, uint256 _amount) public onlySigner {
        mintRequestCount++;
        MultiSigRequest storage request = mintRequests[mintRequestCount];
        request.to = _to;
        request.amount = _amount;
        request.approvalCount = 1;
        request.hasApproved[msg.sender] = true;
        emit MintRequestCreated(mintRequestCount, msg.sender, _to, _amount);
    }

    function approveAndExecuteMint(uint256 _requestId) public onlySigner {
        MultiSigRequest storage request = mintRequests[_requestId];
        if (_requestId == 0 || _requestId > mintRequestCount) revert InvalidRequestId();
        if (request.hasApproved[msg.sender]) revert AlreadyApproved();
        if (request.executed) revert InvalidRequestId();

        request.approvalCount++;
        request.hasApproved[msg.sender] = true;
        emit RequestApproved(_requestId, msg.sender, "mint");

        if (request.approvalCount >= 2) {
            request.executed = true;
            _mint(request.to, request.amount);
            emit MintExecuted(_requestId, request.to, request.amount);
        }
    }
    
    // --- FUNCTIONS OF WITHDRAWAL MULTI-SIGNATURE ---
    //to defind that the who init the withdraw has he variable 'hasApproved' to 'true'
    function requestWithdrawal(uint256 _amount) public onlySigner {
        require(address(this).balance >= _amount, "MyToken: insufficient contract balance");
        require(_amount > 0, "MyToken: withdrawal amount must be positive");

        withdrawRequestCount++;
        MultiSigRequest storage request = withdrawRequests[withdrawRequestCount];
        //is the owner tha do the withdraw, so no need to defind _to
        request.amount = _amount;
        request.approvalCount = 1;
        request.hasApproved[msg.sender] = true;

        emit WithdrawalRequestCreated(withdrawRequestCount, msg.sender, _amount);
    }

    function approveAndExecuteWithdrawal(uint256 _requestId) public onlySigner nonReentrant { //non reentrant to block reentrancy attack
        if (_requestId == 0 || _requestId > withdrawRequestCount) revert InvalidRequestId();
        MultiSigRequest storage request = withdrawRequests[_requestId];
        if (request.hasApproved[msg.sender]) revert AlreadyApproved();
        if (request.executed) revert InvalidRequestId();

        request.approvalCount++;
        request.hasApproved[msg.sender] = true;
        emit RequestApproved(_requestId, msg.sender, "withdraw");

        if (request.approvalCount >= 2) {
            request.executed = true; //To ensures "Checks-Effects-Interactions"

            uint256 amountToWithdraw = request.amount;
            require(address(this).balance >= amountToWithdraw, "MyToken: insufficient balance for execution");

            (bool success, ) = owner().call{value: amountToWithdraw}("");
            require(success, "MyToken: withdrawal failed");

            emit WithdrawalExecuted(_requestId, owner(), amountToWithdraw);
        }
    }
}