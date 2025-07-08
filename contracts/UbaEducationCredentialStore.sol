
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;


// We import the interface (IERC20) because the contract only needs the token functions (transferFrom) and not its internal code and it is more efficient in terms of gas.
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title UBaEducationCredentialsStore
 * @dev This contract allows you to store and verify the existence of diplomas
 *       by recording their hash on the blockchain. This service is chargeable
 *       using a specific ERC20 token (MyToken)
*/
contract UBaEducationCredentialsStore is Ownable {

    // --- VARIABLES ---
    IERC20 public immutable paymentToken; // The contract address of our token (G11TK)
    uint256 public verificationFee; // The price in tokens for verification

    // Mapping to store the hash of diplomas; KeyType: bytes32
    mapping(bytes32 => bool) public credentialHashes;


    // --- EVENTS ---
    event CredentialAdded(bytes32 indexed credentialHash, address indexed addedBy);
    event FeeChanged(uint256 newFee);

    // --- CONSTRUCTOR ---
    constructor(address _paymentTokenAddress, uint256 _initialFee) Ownable(msg.sender) {
        paymentToken = IERC20(_paymentTokenAddress);
        verificationFee = _initialFee;
    }

    // --- FUNCTIONS ---

    //user to submit diploma data to record its hash on the blockchain.
    function addCredential(
        string calldata _matriculation,
        string calldata _cryptology, //he cryptology grade.
        string calldata _blockchain, // The blockchain grade.
        string calldata _secureSoftwareDev //The secure development grade.
    ) external {
        // Collect the fees:
        bool success = paymentToken.transferFrom(msg.sender, address(this), verificationFee);
        require(success, "Token transfer failed. Did you approve first?");

        // Calculate the hash and hash it with keccak256.
        bytes32 credentialHash = keccak256(
            abi.encodePacked(
                _matriculation,
                _cryptology,
                _blockchain,
                _secureSoftwareDev
            )
        );
        
        require(!credentialHashes[credentialHash], "Credential already exists.");
        credentialHashes[credentialHash] = true;
        
        emit CredentialAdded(credentialHash, msg.sender);
    }

    //Verify if a diploma is tored by his hash
    function verifyCredential(bytes32 _credentialHash) external view returns (bool) {
        return credentialHashes[_credentialHash];
    }

    // --- FUNCTIONS FOR THE OWNER (ADMINISTRATION) ---


    function withdrawTokens(uint256 _amount) external onlyOwner {
        uint256 balance = paymentToken.balanceOf(address(this));
        require(_amount <= balance, "Insufficient token balance in contract.");
        
        paymentToken.transfer(owner(), _amount);
    }

    
    function setFee(uint256 _newFee) external onlyOwner {
        verificationFee = _newFee;
        emit FeeChanged(_newFee);
    }
}
