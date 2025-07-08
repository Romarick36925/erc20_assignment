const { ethers } = require("hardhat");
require('dotenv').config(); // This is essential for loading your .env variables

async function main() {
  // Get the deployer account (this will be the account whose PRIVATE_KEY is in your .env)
  const [deployer] = await ethers.getSigners();
  console.log("Deploying MyToken with the account:", deployer.address);

  // Define the three multi-signature admin addresses for the constructor.
  // IMPORTANT: Replace these placeholder addresses with actual Sepolia addresses you control.
  // These should be different from your deployer's address.
  const admin1 = "0xA7E9da9E2c397F5B1Ca3b8c525A48F892FB43105"; // Your actual admin address 1
  const admin2 = "0xaAd4f7cd2B46344BbB520bB1026FEB428BDB5700"; // Your actual admin address 2
  const admin3 = "0xfF103347d39c9C834C64Aa0f7136DE1E14504721"; // Your actual admin address 3

  console.log("Multi-signature Admins for MyToken:");
  console.log(`  Admin 1: ${admin1}`);
  console.log(`  Admin 2: ${admin2}`);
  console.log(`  Admin 3: ${admin3}`);

  // FIX: Get the ContractFactory for "MyToken"
  const MyTokenFactory = await ethers.getContractFactory("MyToken");

  // Deploy the contract, passing the admin addresses to the constructor
  const myToken = await MyTokenFactory.deploy(admin1, admin2, admin3); // FIX: Variable name changed to myToken

  // Wait for the contract to be deployed and confirmed on the network
  await myToken.waitForDeployment(); // FIX: Variable name changed to myToken

  console.log("MyToken deployed to address:", myToken.target); // FIX: Variable name changed to myToken

  // --- Output for your Project Report and Etherscan Verification ---
  console.log("\n--- For your Report & Verification ---");
  console.log("Contract Address (MyToken):", myToken.target); // FIX: Variable name changed to myToken
  console.log("Constructor Arguments for Verification:");
  console.log(`  _admin1: "${admin1}"`);
  console.log(`  _admin2: "${admin2}"`);
  console.log(`  _admin3: "${admin3}"`);
  console.log("\nEtherscan Verification Command (copy and run this after deployment):");
  console.log(`npx hardhat verify --network sepolia ${myToken.target} "${admin1}" "${admin2}" "${admin3}"`); // FIX: Variable name changed to myToken
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
