// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28; // Using Solidity 0.8.28 as configured in hardhat.config.ts

// Import necessary contracts from OpenZeppelin for security and standard compliance.
// ERC20: Implements the ERC20 token standard, providing basic token functionalities.
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
// Ownable: Provides a basic access control mechanism, allowing only the owner to call certain functions.
import "@openzeppelin/contracts/access/Ownable.sol";
// ReentrancyGuard: Protects against reentrancy attacks, especially important for functions handling ETH transfers.
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title CampusCreditToken
 * @dev An ERC20 token designed for the UBa Education ecosystem.
 * It features:
 * - Standard ERC20 functionalities (transfer, balanceOf, approve, allowance).
 * - Ability for users to buy tokens by sending ETH to the contract.
 * - Multi-signature control for minting new tokens (requires 2 out of 3 specified signers).
 * - Multi-signature control for withdrawing ETH from the contract (requires 2 out of 3 specified signers).
 * - Robust error handling and reentrancy protection.
 */
contract CampusCreditToken is ERC20, Ownable, ReentrancyGuard {

    // --- Custom Error Definitions: For gas-efficient and clear error handling ---
    // Thrown if an address attempting an action is not one of the designated multi-signature administrators.
    error UnauthorizedSigner();
    // Thrown if a multi-signature administrator attempts to approve the same request multiple times.
    error RequestAlreadyApproved();
    // Thrown if a multi-signature request does not exist or has already been executed.
    error InvalidOrCompletedRequest();
    // Thrown if a user attempts to buy tokens without sending any Ether.
    error ZeroEthProvided();
    // Thrown if the contract's ETH balance is insufficient for a requested withdrawal.
    error InsufficientContractBalance();
    // Thrown if the ETH transfer to the owner fails during a withdrawal execution.
    error WithdrawalTransferFailed();
    // Thrown if the withdrawal amount is zero or otherwise invalid for execution.
    error InvalidWithdrawalAmount();
    // Thrown if the minimum number of approvals is not met for execution (though covered by logic, good for explicit error).
    error NotEnoughApprovals();


    // --- State Variables ---
    // An array storing the addresses of the three designated multi-signature administrators.
    // These addresses are set during the contract's deployment.
    address[3] public multiSigAdmins;

    // The conversion rate: 1 ETH sent to the contract will mint ETH_TO_TOKEN_RATE tokens.
    // This is a constant to ensure a fixed price.
    uint256 public constant ETH_TO_TOKEN_RATE = 1000; // Example: 1 ETH buys 1000 tokens

    // The minimum number of approvals required from `multiSigAdmins` to execute
    // a multi-signature minting or withdrawal request.
    uint256 public constant MIN_APPROVALS_REQUIRED = 2; // As per project requirement: 2 out of 3 signers

    // Struct to define the common properties of a multi-signature request.
    // This structure is used for both minting and withdrawal operations.
    struct MultiSigOperation {
        address recipient;                  // The target address for the operation (e.g., who receives tokens or ETH).
        uint256 amount;                     // The quantity of tokens (for mint) or ETH (for withdraw).
        uint256 currentApprovalCount;       // Counter for how many `multiSigAdmins` have approved this specific request.
        mapping(address => bool) hasApproved; // Tracks which specific `multiSigAdmin` has already approved.
        bool isExecuted;                    // Flag indicating if the request has been successfully processed.
    }

    // Mapping to store all pending and completed minting requests.
    // Each request is uniquely identified by an incrementing `requestId`.
    mapping(uint256 => MultiSigOperation) public pendingMintApprovals;
    // Counter for the next available ID for a new minting request.
    uint256 public nextMintRequestId;

    // Mapping to store all pending and completed withdrawal requests.
    // Each request is uniquely identified by an incrementing `requestId`.
    mapping(uint256 => MultiSigOperation) public pendingWithdrawalApprovals;
    // Counter for the next available ID for a new withdrawal request.
    uint256 public nextWithdrawalRequestId;


    // --- Events: To provide transparent logging of all significant actions ---
    // Emitted when a new multi-signature token minting request is initiated.
    event TokenMintRequestSubmitted(uint256 requestId, address indexed initiator, address indexed recipient, uint256 amount);
    // Emitted when a new multi-signature ETH withdrawal request is initiated.
    event FundsWithdrawalRequestSubmitted(uint256 requestId, address indexed initiator, uint256 amount);
    // Emitted when a multi-signature request receives an approval from an admin.
    event OperationApproved(uint256 requestId, address indexed approver, string operationType);
    // Emitted when a multi-signature minting request is successfully executed.
    event TokensMinted(uint256 requestId, address indexed recipient, uint256 amount);
    // Emitted when a multi-signature ETH withdrawal request is successfully executed.
    event FundsWithdrawn(uint256 requestId, address indexed recipient, uint256 amount);
    // Emitted when a user successfully purchases tokens by sending ETH to the contract.
    event TokensPurchased(address indexed buyer, uint256 ethAmount, uint256 tokenAmount);


    // --- Modifiers ---
    /**
     * @dev Restricts function execution to only the designated multi-signature administrators.
     * Reverts with `UnauthorizedSigner` if the caller is not an admin.
     */
    modifier onlyMultiSigAdmin() {
        bool isAuthorized = false;
        for (uint i = 0; i < multiSigAdmins.length; i++) {
            if (msg.sender == multiSigAdmins[i]) {
                isAuthorized = true;
                break;
            }
        }
        if (!isAuthorized) revert UnauthorizedSigner();
        _;
    }

    // --- Constructor ---
    /**
     * @dev Initializes the ERC20 token with its name and symbol, sets the contract deployer
     * as the `Ownable` owner, and configures the three multi-signature administrators.
     * An initial supply of tokens is minted to the deployer's address.
     * @param _admin1 Address of the first multi-signature administrator.
     * @param _admin2 Address of the second multi-signature administrator.
     * @param _admin3 Address of the third multi-signature administrator.
     */
    constructor(address _admin1, address _admin2, address _admin3)
        ERC20("UBa Campus Credit", "CMCR") // Token Name and Symbol (unique to your group)
        Ownable(msg.sender) // Sets the contract deployer as the initial owner
    {
        // Store the provided addresses as the multi-signature administrators.
        multiSigAdmins[0] = _admin1;
        multiSigAdmins[1] = _admin2;
        multiSigAdmins[2] = _admin3;

        // Mint an initial supply of 1,000,000 tokens to the contract deployer.
        // The amount is scaled by 10^decimals() to account for the token's divisibility (usually 18 decimals).
        _mint(msg.sender, 1_000_000 * (10**decimals()));
    }

    // --- Token Purchase Functionality (via ETH transfers) ---
    /**
     * @dev Fallback function that is executed when Ether is sent directly to the contract
     * without specifying a function. It automatically calls `purchaseTokensWithEth`.
     */
    receive() external payable {
        purchaseTokensWithEth();
    }

    /**
     * @dev Allows any user to purchase tokens by sending Ether with their transaction.
     * The amount of tokens minted is calculated based on `msg.value` (ETH sent)
     * and the `ETH_TO_TOKEN_RATE`.
     * Reverts with `ZeroEthProvided` if no Ether is sent.
     */
    function purchaseTokensWithEth() public payable {
        if (msg.value == 0) revert ZeroEthProvided(); // Ensure that Ether was actually sent.
        uint256 tokensToMint = msg.value * ETH_TO_TOKEN_RATE;
        _mint(msg.sender, tokensToMint); // Mint tokens directly to the sender.
        emit TokensPurchased(msg.sender, msg.value, tokensToMint); // Log the purchase event.
    }

    // --- Multi-Signature Minting Control Functions ---
    /**
     * @dev Initiates a new multi-signature request to mint tokens.
     * Only a `multiSigAdmin` can call this function. The initiator's approval
     * is automatically counted as the first approval for this request.
     * @param _recipient The address to which the new tokens will be minted.
     * @param _amount The quantity of tokens to mint (in base units, considering decimals).
     */
    function submitMintRequest(address _recipient, uint256 _amount) public onlyMultiSigAdmin {
        nextMintRequestId++; // Increment the global counter for new requests.
        MultiSigOperation storage request = pendingMintApprovals[nextMintRequestId]; // Get storage slot for new request.
        request.recipient = _recipient;
        request.amount = _amount;
        request.currentApprovalCount = 1; // The initiator provides the first approval.
        request.hasApproved[msg.sender] = true; // Mark the initiator as having approved.
        emit TokenMintRequestSubmitted(nextMintRequestId, msg.sender, _recipient, _amount); // Log the request.
    }

    /**
     * @dev Approves a pending mint request. If this approval meets or exceeds
     * `MIN_APPROVALS_REQUIRED`, the tokens are minted to the specified recipient,
     * and the request is marked as executed.
     * Only a `multiSigAdmin` can call this function.
     * @param _requestId The unique ID of the mint request to approve.
     */
    function approveAndFinalizeMint(uint256 _requestId) public onlyMultiSigAdmin {
        MultiSigOperation storage request = pendingMintApprovals[_requestId];

        // Validate the request ID and ensure it hasn't been executed yet.
        if (_requestId == 0 || _requestId > nextMintRequestId || request.isExecuted) {
            revert InvalidOrCompletedRequest();
        }
        // Prevent a multi-signature admin from approving the same request twice.
        if (request.hasApproved[msg.sender]) {
            revert RequestAlreadyApproved();
        }

        request.currentApprovalCount++; // Increment the approval count for this request.
        request.hasApproved[msg.sender] = true; // Mark the current sender as having approved.
        emit OperationApproved(_requestId, msg.sender, "mint"); // Log the approval.

        // If enough approvals are gathered, execute the minting operation.
        if (request.currentApprovalCount >= MIN_APPROVALS_REQUIRED) {
            request.isExecuted = true; // Mark as executed BEFORE minting (Checks-Effects-Interactions pattern).
            _mint(request.recipient, request.amount); // Perform the actual token minting.
            emit TokensMinted(_requestId, request.recipient, request.amount); // Log the execution.
        }
    }

    // --- Multi-Signature Withdrawal Control Functions ---
    /**
     * @dev Initiates a new multi-signature request to withdraw Ether from the contract's balance.
     * Only a `multiSigAdmin` can call this function. The initiator's approval
     * is automatically counted as the first approval for this request.
     * @param _amount The amount of Ether (in wei) to withdraw from the contract.
     */
    function submitWithdrawalRequest(uint256 _amount) public onlyMultiSigAdmin {
        // Basic checks: ensure contract has enough ETH and amount is positive.
        if (address(this).balance < _amount) revert InsufficientContractBalance();
        if (_amount == 0) revert InvalidWithdrawalAmount();

        nextWithdrawalRequestId++; // Increment the global counter for new requests.
        MultiSigOperation storage request = pendingWithdrawalApprovals[nextWithdrawalRequestId]; // Get storage slot.
        request.recipient = owner(); // ETH withdrawal is always to the contract owner.
        request.amount = _amount;
        request.currentApprovalCount = 1; // Initiator provides the first approval.
        request.hasApproved[msg.sender] = true; // Mark initiator as having approved.

        emit FundsWithdrawalRequestSubmitted(nextWithdrawalRequestId, msg.sender, _amount); // Log the request.
    }

    /**
     * @dev Approves a pending withdrawal request. If this approval meets or exceeds
     * `MIN_APPROVALS_REQUIRED`, the specified amount of Ether is transferred to the
     * contract owner, and the request is marked as executed.
     * Only a `multiSigAdmin` can call this function.
     * Uses `nonReentrant` modifier to protect against reentrancy attacks during ETH transfer.
     * @param _requestId The unique ID of the withdrawal request to approve.
     */
    function approveAndFinalizeWithdrawal(uint256 _requestId) public onlyMultiSigAdmin nonReentrant {
        MultiSigOperation storage request = pendingWithdrawalApprovals[_requestId];

        // Validate the request ID and ensure it hasn't been executed yet.
        if (_requestId == 0 || _requestId > nextWithdrawalRequestId || request.isExecuted) {
            revert InvalidOrCompletedRequest();
        }
        // Prevent a multi-signature admin from approving the same request twice.
        if (request.hasApproved[msg.sender]) {
            revert RequestAlreadyApproved();
        }

        request.currentApprovalCount++; // Increment the approval count.
        request.hasApproved[msg.sender] = true; // Mark the current sender as having approved.
        emit OperationApproved(_requestId, msg.sender, "withdraw"); // Log the approval.

        // If enough approvals are gathered, execute the withdrawal operation.
        if (request.currentApprovalCount >= MIN_APPROVALS_REQUIRED) {
            request.isExecuted = true; // Mark as executed BEFORE transferring ETH (Checks-Effects-Interactions).

            uint256 amountToWithdraw = request.amount;
            // Final check for sufficient contract ETH balance before transfer.
            if (address(this).balance < amountToWithdraw) revert InsufficientContractBalance();

            // Perform the ETH transfer to the contract owner.
            (bool success, ) = payable(request.recipient).call{value: amountToWithdraw}("");
            if (!success) revert WithdrawalTransferFailed(); // Revert if ETH transfer fails.

            emit FundsWithdrawn(_requestId, request.recipient, amountToWithdraw); // Log the execution.
        }
    }
}
