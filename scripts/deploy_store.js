const hdh = require("hardhat");
require('dotenv').config(); // Ensure dotenv is loaded for environment variables

async function main() {
    // IMPORTANT: Replace this with the ACTUAL deployed address of your MyToken contract on Sepolia.
    // This address must come from the output of your deploy_token.js script.
    // Based on your previous successful deployment, this was 0xD66dA0f44b323F47e586Bc1e9c7b6aDf20966eC1
    const myTokenAddress = "0xD66dA0f44b323F47e586Bc1e9c7b6aDf20966eC1"; 
    
    // Initial price for a check: 50 G0TK (assuming your token symbol is G0TK).
    const initialFee = hdh.ethers.parseUnits("50", 18);

    const [deployer] = await hdh.ethers.getSigners();
    console.log(`Deploying UBaEducationCredentialsStore with account: ${deployer.address}`);
    console.log("Deployment of UBaEducationCredentialsStore in progress...");
    
    const Store = await hdh.ethers.getContractFactory("UBaEducationCredentialsStore");
    const store = await Store.deploy(myTokenAddress, initialFee);

    await store.waitForDeployment();

    console.log(`\nUBaEducationCredentialsStore deployed at: ${store.target}`);
    console.log(`   Payable with token address: ${await store.paymentToken()}`);
    console.log(`   Initial verification fee: ${hdh.ethers.formatUnits(await store.verificationFee(), 18)} G0TK`); // Corrected symbol to G0TK

    console.log("\n--- For your Report & Verification ---");
    console.log("Contract Address (UBaEducationCredentialsStore):", store.target);
    console.log("Constructor Arguments for Verification:");
    console.log(`  _paymentTokenAddress: "${myTokenAddress}"`);
    console.log(`  _initialFee: "${initialFee.toString()}"`);
    console.log("\nEtherscan Verification Command (copy and run this after deployment):");
    console.log(`npx hardhat verify --network sepolia ${store.target} "${myTokenAddress}" "${initialFee.toString()}"`);
}

main().catch(console.error);
