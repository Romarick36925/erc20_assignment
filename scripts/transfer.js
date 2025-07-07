const hdh = require("hardhat");
async function main() {
    const contractAddress = "0x6A7024E4e99E41732C00Df5193C2AD8B158911d6";
    const recipientAddress = "0xaAd4f7cd2B46344BbB520bB1026FEB428BDB5700";
    const amount = hdh.ethers.parseUnits("10", 18); // 10 tokens (with 18 décimales)

    const [signer] = await hdh.ethers.getSigners();
    console.log(`Using account: ${signer.address} for transfer.`);

    const myToken = await hdh.ethers.getContractAt("MyToken", contractAddress, signer);
    
    console.log(`Transferring 10 G0TK to ${recipientAddress}...`);
    const tx = await myToken.transfer(recipientAddress, amount);
    await tx.wait();

    console.log(`Recipient balance after transfer: ${hre.ethers.formatUnits(await myToken.balanceOf(recipientAddress), 18)} G0TK`);
    console.log("Transfer successful! !");
    console.log("Hash of transaction:", tx.hash);
    console.log(`Link Etherscan of the transaction: https://sepolia.etherscan.io/tx/${tx.hash}`);
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});