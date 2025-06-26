const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MyToken Contract", function () {
    // Declare variables here to make them accessible in all tests within this describe block.
    let myToken;
    let owner, addr1, addr2, addr3, nonSigner;

    // This setup function will be called once before all tests in this block.
    before(async function () {
        // Get the test accounts provided by Hardhat.
        [owner, addr1, addr2, addr3, nonSigner] = await ethers.getSigners();

        // Debugging check (you can remove this later).
        if (!addr1 || !addr2 || !addr3) {
            throw new Error("Signer accounts were not loaded correctly!");
        }

        // Deploy the contract.
        const MyTokenFactory = await ethers.getContractFactory("MyToken");
        myToken = await MyTokenFactory.deploy(addr1.address, addr2.address, addr3.address);
        await myToken.waitForDeployment();
    });

    // Now, we rewrite the tests using the 'myToken' contract instance that has already been deployed.
    
    describe("1. Basic Functionality", function () {
        it("Should have deployed with the correct name and symbol", async function () {
            expect(await myToken.name()).to.equal("Group 11 Token");
            expect(await myToken.symbol()).to.equal("G11TK");
        });

        it("Should have assigned the initial supply to the owner", async function() {
            const ownerBalance = await myToken.balanceOf(owner.address);
            const expectedSupply = ethers.parseUnits("1000000", 18);
            expect(ownerBalance).to.equal(expectedSupply);
        });

        it("Should transfer tokens correctly", async function () {
            const amount = ethers.parseUnits("100", 18);
            
            // Take a snapshot of the state before the transfer.
            const initialOwnerBalance = await myToken.balanceOf(owner.address);
            const initialAddr1Balance = await myToken.balanceOf(addr1.address);
            
            // Act: Perform the transfer.
            await myToken.connect(owner).transfer(addr1.address, amount);

            // Assert: Check the new balances.
            const finalOwnerBalance = await myToken.balanceOf(owner.address);
            const finalAddr1Balance = await myToken.balanceOf(addr1.address);
            
            expect(finalAddr1Balance).to.equal(initialAddr1Balance + amount);
            expect(finalOwnerBalance).to.equal(initialOwnerBalance - amount);
        });
    });

    // You can add your other 'describe' blocks here in the same way.
    // For example:
    describe("2. Security", function() {
        it("Should prevent non-signers from requesting a mint", async function() {
            const amountToMint = ethers.parseUnits("1000", 18);
            await expect(
                myToken.connect(nonSigner).requestMint(nonSigner.address, amountToMint)
            ).to.be.revertedWithCustomError(myToken, "NotASigner");
        });
    });
});