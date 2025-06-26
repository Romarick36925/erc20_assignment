const hdh = require("hardhat");

async function main() {
    // Adresse of your contract Token
    const myTokenAddress = "0xa554b4718CCB92Ef7D46D1Ebc0537d1bbAbF6Ba6"; 
    
    // Initial price for a check 50 G11TK.
    const initialFee = hdh.ethers.parseUnits("50", 18);

    console.log("Deployment of UBaEducationCredentialsStore...");
    
    const Store = await hdh.ethers.getContractFactory("UBaEducationCredentialsStore");
    const store = await Store.deploy(myTokenAddress, initialFee);

    await store.waitForDeployment();

    console.log(`\n UBaEducationCredentialsStore deployed at: ${store.target}`);
    console.log(`   Payable with token to address: ${await store.paymentToken()}`);
    console.log(`   Initial verification fee: ${hdh.ethers.formatUnits(await store.verificationFee(), 18)} G11TK`);
}

main().catch(console.error);