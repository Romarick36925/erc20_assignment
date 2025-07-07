UBa Education Blockchain Project: Campus Credit Token & Academic Registry
This repository contains the Solidity smart contracts and Hardhat development environment for the University of Bamenda (UBa) Education blockchain project. It features a custom ERC20 token (CampusCreditToken) with multi-signature controls and a decentralized academic credential verification system (UBaAcademicRegistry).

Project Overview
This project addresses the need for a secure and transparent system for managing academic credentials and facilitating payments within the UBa Education ecosystem.

Key Components:

CampusCreditToken.sol (CMCR Token): An ERC20 token with custom functionalities:

Users can acquire tokens by sending ETH to the contract.

Multi-signature approval (2 out of 3 designated administrators) is required for minting new tokens.

Multi-signature approval (2 out of 3 designated administrators) is required for withdrawing ETH from the contract.

Includes reentrancy protection for withdrawals.

UBaAcademicRegistry.sol: A contract for decentralized education credential verification:

Allows users to register academic credential hashes (proof of existence) on the blockchain, paying with CMCR tokens.

Provides a view function to verify if a credential hash exists.

Stores only cryptographic hashes of credentials for privacy and efficiency.

Owner-only functions for withdrawing collected CMCR tokens and updating registration fees.

ReentrancyExploiter.sol: A utility contract used purely for unit testing and demonstrating the reentrancy protection of the CampusCreditToken.

Setup Instructions
To set up the project locally, follow these steps:

Clone the Repository:

git clone https://github.com/Romarick36925/erc20_assignment.git
cd uba-lms-contracts

Install Node.js and npm:
Ensure you have Node.js (LTS version recommended) and npm installed.
Verify with:

node -v
npm -v

Install Project Dependencies:
Navigate to the project root and install all required Node.js packages:

npm install

Configure .env File:
Create a .env file in the project root (uba-lms-contracts/.env) and add your Alchemy/Infura Sepolia URL, your MetaMask private key (for deployment), and your Etherscan API key. Do not commit this file to Git.

ALCHEMY_SEPOLIA_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY
PRIVATE_KEY=YOUR_METAMASK_PRIVATE_KEY_FOR_DEPLOYER
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_API_KEY

Ensure .env is listed in your .gitignore file.

Update Deployment Admin Addresses:
In scripts/deploy_token.js, update the placeholder addresses for admin1, admin2, and admin3 with actual Sepolia testnet addresses you control. These will be the multi-signature administrators.

Deployed Contract Addresses on Sepolia
After deploying your contracts to the Sepolia testnet, their addresses will be printed to your terminal. Update this section with your actual deployed addresses.

CampusCreditToken Address: [YOUR_DEPLOYED_CAMPUS_CREDIT_TOKEN_ADDRESS]

UBaAcademicRegistry Address: [YOUR_DEPLOYED_UBA_ACADEMIC_REGISTRY_ADDRESS]

Etherscan Verification Links:

CampusCreditToken: [YOUR_CAMPUS_CREDIT_TOKEN_ETHERSCAN_LINK]

UBaAcademicRegistry: [YOUR_UBA_ACADEMIC_REGISTRY_ETHERSCAN_LINK]

Test Execution
To run the unit tests for the smart contracts:

Start the Hardhat Local Network:
Open a new terminal window in your project root and run:

npx hardhat node

Keep this terminal running throughout the testing process.

Run the Tests:
Open a second terminal window in your project root and execute the tests:

npx hardhat test

You should see output indicating all tests have passed, confirming the contracts' functionality and security.

Deployment Steps
To deploy your contracts to the Sepolia testnet:

Compile Contracts:

npx hardhat compile

Deploy CampusCreditToken:

npx hardhat run scripts/deploy_token.js --network sepolia

Note the deployed address and the Etherscan verification command printed in the terminal.

Verify CampusCreditToken on Etherscan:
Use the command provided by the deployment script (replace placeholders with actual values):

npx hardhat verify --network sepolia YOUR_CAMPUS_CREDIT_TOKEN_ADDRESS ADMIN1_ADDRESS ADMIN2_ADDRESS ADMIN3_ADDRESS

Deploy UBaAcademicRegistry:
(You will need to create scripts/deploy_registry.js similar to deploy_token.js, passing the deployed CampusCreditToken address as a constructor argument.)

npx hardhat run scripts/deploy_registry.js --network sepolia

Note the deployed address and the Etherscan verification command.

Verify UBaAcademicRegistry on Etherscan:
Use the command provided by the deployment script (replace placeholders with actual values):

npx hardhat verify --network sepolia YOUR_UBA_ACADEMIC_REGISTRY_ADDRESS YOUR_CAMPUS_CREDIT_TOKEN_ADDRESS INITIAL_REGISTRATION_FEE_IN_WEI

Video Demonstration
A video demonstrating the project's features will be provided. It will cover:

Contract deployment to Sepolia.

Token transfers.

Multi-signature minting process.

Etherscan verification.

Unit test execution.

Interactions with UBaAcademicRegistry (token approval, storing credential, credential verification).

