const hdh = require("hardhat");
require('dotenv').config(); // Ensure dotenv is loaded for environment variables

async function main() {
    // IMPORTANT: Replace this with the ACTUAL deployed address of your MyToken contract on Sepolia.
    // This address must come from the output of your deploy_token.js script.
    const contractAddress = "0x1Ed15A4b77520D6b7A6deaEe2193eDd8c0b80B26"; // <--- REPLACE THIS WITH YOUR MYTOKEN'S DEPLOYED ADDRESS

    // The recipient address as specified in your project requirements
    const recipientAddress = "0x0874207411f712D90edd8ded353fdc6f9a417903"; // This is the required recipient address

    // Amount to transfer: 10 tokens (with 18 decimals)
    const amount = hdh.ethers.parseUnits("10", 18);

    // Get the signer account (this will be the account associated with PRIVATE_KEY in your .env)
    const [signer] = await hdh.ethers.getSigners();
    console.log(`Using account: ${signer.address} for transfer.`);

    // Get the contract instance using the correct contract name "MyToken"
    const myToken = await hdh.ethers.getContractAt("MyToken", contractAddress, signer);
    
    console.log(`Transferring ${hdh.ethers.formatUnits(amount, 18)} G0TK to ${recipientAddress}...`);

    // Perform the transfer transaction
    const tx = await myToken.transfer(recipientAddress, amount);
    await tx.wait(); // Wait for the transaction to be mined

    // Log the recipient's balance after transfer
    // Note: The symbol in the log message should match your token's symbol (G0TK)
    console.log(`Recipient balance after transfer: ${hdh.ethers.formatUnits(await myToken.balanceOf(recipientAddress), 18)} G0TK`);
    console.log("Transfer successful!");
    console.log("Hash of transaction:", tx.hash);
    console.log(`Link Etherscan of the transaction: https://sepolia.etherscan.io/tx/${tx.hash}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
