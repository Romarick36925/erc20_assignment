const hdh = require("hardhat");
async function main() {
    const contractAddress = "0xfc092DEeb29afA104f3f86Ec9853700A591bA7ef";
    const recipientAddress = "0x0874207411f712D90edd8ded353fdc6f9a417903";
    const amount = hdh.ethers.parseUnits("10", 18); // 10 tokens (with 18 décimales)

    const [signer] = await hdh.ethers.getSigners();
    console.log(`Using account: ${signer.address} for transfer.`);

    const myToken = await hdh.ethers.getContractAt("MyToken", contractAddress, signer);
    
    console.log(`Transferring 10 G11TK to ${recipientAddress}...`);
    const tx = await myToken.transfer(recipientAddress, amount);
    await tx.wait();

    console.log(`Recipient balance after transfer: ${hre.ethers.formatUnits(await myToken.balanceOf(recipientAddress), 18)} G11TK`);
    console.log("ransfer successful! !");
    console.log("Hash of transaction:", tx.hash);
    console.log(`Link Etherscan of the transaction: https://sepolia.etherscan.io/tx/${tx.hash}`);
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});