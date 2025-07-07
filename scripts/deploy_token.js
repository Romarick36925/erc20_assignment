const { ethers } = require("hardhat");

async function main() {
  // Load environment variables from .env file
  require('dotenv').config();

  // Get the deployer account (this will be the account associated with PRIVATE_KEY in your .env)
  const [deployer] = await ethers.getSigners();
  console.log("Deploying CampusCreditToken with the account:", deployer.address);

  // --- Define the three multi-signature admin addresses for the constructor. ---
  // IMPORTANT: Replace these placeholder addresses with actual Sepolia addresses you control.
  // These should be different from your deployer's address (deployer.address).
  // You can generate new addresses in MetaMask, fund them with Sepolia ETH,
  // and export their private keys (though you only need the addresses here).
  const admin1 = "0xA7E9da9E2c397F5B1Ca3b8c525A48F892FB43105"; // Example: A second MetaMask account address
  const admin2 = "0xaAd4f7cd2B46344BbB520bB1026FEB428BDB5700"; // Example: A third MetaMask account address
  const admin3 = "0xfF103347d39c9C834C64Aa0f7136DE1E14504721"; // Example: A fourth MetaMask account address

  // If you only have one private key in your .env, and want to use other Hardhat-generated
  // local test accounts for the multi-sig admins *during local testing only*,
  // you would need to run `npx hardhat node` and use `signers[1].address`, etc.
  // But for Sepolia, you need real addresses.

  console.log("Multi-signature Admins for CampusCreditToken:");
  console.log(`  Admin 1: ${admin1}`);
  console.log(`  Admin 2: ${admin2}`);
  console.log(`  Admin 3: ${admin3}`);

  // Get the ContractFactory for CampusCreditToken
  const CampusCreditTokenFactory = await ethers.getContractFactory("CampusCreditToken");

  // Deploy the contract, passing the admin addresses to the constructor
  const campusCreditToken = await CampusCreditTokenFactory.deploy(admin1, admin2, admin3);

  // Wait for the contract to be deployed and confirmed on the network
  await campusCreditToken.waitForDeployment();

  console.log("CampusCreditToken deployed to address:", campusCreditToken.target);

  // --- Output for your Project Report and Etherscan Verification ---
  console.log("\n--- For your Report & Verification ---");
  console.log("Contract Address (CampusCreditToken):", campusCreditToken.target);
  console.log("Constructor Arguments for Verification:");
  console.log(`  _admin1: "${admin1}"`);
  console.log(`  _admin2: "${admin2}"`);
  console.log(`  _admin3: "${admin3}"`);
  console.log("\nEtherscan Verification Command (copy and run this after deployment):");
  console.log(`npx hardhat verify --network sepolia ${campusCreditToken.target} "${admin1}" "${admin2}" "${admin3}"`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
