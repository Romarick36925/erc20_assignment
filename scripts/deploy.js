const hdh = require("hardhat");

async function main() {
//PUT YOUR OWN SIGNER
  const signer1 = "0x28cF9cf6C65Dd4702511E4B2eF1393591d4A72f1"; //Eze
  const signer2 = "0x7fA108aF9160F0dc6913436d4D8F8A1a6286f3d9"; //Cedric
  const signer3 = "0x66cc9da59059169Fc0A762AA28261C80f2EfAb4A"; //Stacy

  console.log("Deployment with signers:", signer1, signer2, signer3);

  console.log("Preparing for the deployment of the MyToken contract...");
  const MyToken = await hdh.ethers.getContractFactory("MyToken");
  console.log("Deployment in progress with provided signatories...");
  const myToken = await MyToken.deploy(signer1, signer2, signer3);
  await myToken.waitForDeployment();

  console.log(`MyToken deployed at: ${myToken.target}`);
  console.log(`Link Etherscan: https://sepolia.etherscan.io/address/${myToken.target}`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });