# ERC20 Project

A blockchain-based educational platform featuring a custom ERC20 token (MyToken.sol) with multi-signature controls and an academic credential verification system for the University of Bamenda.

## Setup Instructions

### Prerequisites
- Node.js (LTS version)
- npm
- MetaMask wallet with Sepolia testnet configured

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Romarick36925/erc20_assignment.git
   cd erc20_assignment
   ```

2. **Install dependencies:**
   ```bash
   npm install --save-dev hardhat
   npm install
   ```

3. **Initialize Hardhat project:**
   ```bash
   npx hardhat
   ```

4. **Configure environment variables:**
   Create a `.env` file in the project root:
   ```
   ALCHEMY_SEPOLIA_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
   PRIVATE_KEY=YOUR_METAMASK_PRIVATE_KEY
   ETHERSCAN_API_KEY=YOUR_ETHERSCAN_API_KEY
   ```

5. **Install VS Code extensions:**
   - Hardhat Multichain
   - Hardhat Test Snippets
   - Hardhat Developer Pack
   - Solidity

## Deployed Contract Addresses (Sepolia)

### MyToken (G0TK)
- **Contract Address:** `0x1Ed15A4b77520D6b7A6deaEe2193eDd8c0b80B26`
- **Etherscan:** https://sepolia.etherscan.io/address/0x1Ed15A4b77520D6b7A6deaEe2193eDd8c0b80B26#code

### UBaEducationCredentialsStore
- **Contract Address:** 0xA94cA9b030B2DA9A4CB95A6FF7DD29f7B2479a5A
- **Etherscan:** [[Verification link available]](https://sepolia.etherscan.io/address/0xA94cA9b030B2DA9A4CB95A6FF7DD29f7B2479a5A#code)

## Test Execution

### Run Unit Tests
```bash
npx hardhat test
```

### Start Local Network (for testing)
```bash
npx hardhat node
```

### Compile Contracts
```bash
npx hardhat compile
```

### Deploy to Sepolia
```bash
npx hardhat run scripts/deploy_token.js --network sepolia
```

### Verify on Etherscan
```bash
npx hardhat verify --network sepolia [CONTRACT_ADDRESS] [CONSTRUCTOR_ARGS]
```

## Features

- **Custom ERC20 Token:** CampusCreditToken with ETH-to-token conversion
- **Multi-signature System:** 2-of-3 admin approval for minting and withdrawals
- **Credential Verification:** On-chain academic credential storage and verification
- **Security:** Reentrancy protection and access control

## Demo Transaction

**Token Transfer Hash:** `0x39d56b7f791d080b7451b590df3ac801cc701252f4ba81269859168c6258fcd9`

## Links

- **GitHub Repository:** https://github.com/Romarick36925/erc20_assignment.git
- **Video Demo:** https://www.youtube.com/watch?v=QMdCyCblM9g

## Author

**Apongnwu Clintin Tipekwa**  
Matricule: UBA23EP019  
University of Bamenda - NAHPI
