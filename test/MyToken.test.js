const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MyToken Contract (Condensed Tests)", function () {
    let myToken;
    let owner, admin1, admin2, admin3, user1, nonSigner;

    before(async function () {
        [owner, admin1, admin2, admin3, user1, nonSigner] = await ethers.getSigners();
        const MyTokenFactory = await ethers.getContractFactory("MyToken");
        // Deploy with admin1, admin2, admin3 as signers
        myToken = await MyTokenFactory.deploy(admin1.address, admin2.address, admin3.address);
        await myToken.waitForDeployment();
    });

    describe("1. Core Functionality", function () {
        it("Should deploy with correct name, symbol, and initial supply to owner", async function () {
            expect(await myToken.name()).to.equal("Group 0 Token");
            expect(await myToken.symbol()).to.equal("G0TK");
            const initialSupply = ethers.parseUnits("1000000", 18);
            expect(await myToken.balanceOf(owner.address)).to.equal(initialSupply);
        });

        it("Should allow token transfers between accounts", async function () {
            const transferAmount = ethers.parseUnits("100", 18);
            const initialOwnerBalance = await myToken.balanceOf(owner.address);
            const initialUser1Balance = await myToken.balanceOf(user1.address);

            await myToken.connect(owner).transfer(user1.address, transferAmount);

            expect(await myToken.balanceOf(owner.address)).to.equal(initialOwnerBalance - transferAmount);
            expect(await myToken.balanceOf(user1.address)).to.equal(initialUser1Balance + transferAmount);
        });
    });

    describe("2. Multi-Signature Minting (Basic)", function () {
        const amountToMint = ethers.parseUnits("500", 18);
        let mintRequestId;

        it("Should allow an admin to request a mint and mark as approved", async function () {
            const tx = await myToken.connect(admin1).requestMint(user1.address, amountToMint);
            const receipt = await tx.wait();
            const event = receipt.logs.find(log => myToken.interface.parseLog(log)?.name === "MintRequestCreated");
            mintRequestId = event.args[0];

            const request = await myToken.mintRequests(mintRequestId);
            expect(request.to).to.equal(user1.address);
            expect(request.amount).to.equal(amountToMint);
            expect(request.approvalCount).to.equal(1);
            expect(request.executed).to.be.false;
        });

        it("Should allow a second admin to approve and execute the mint request", async function () {
            const initialUser1Balance = await myToken.balanceOf(user1.address);
            
            await myToken.connect(admin2).approveAndExecuteMint(mintRequestId);

            const request = await myToken.mintRequests(mintRequestId);
            expect(request.approvalCount).to.equal(2);
            expect(request.executed).to.be.true;
            expect(await myToken.balanceOf(user1.address)).to.equal(initialUser1Balance + amountToMint);
        });

        it("Should prevent a non-signer from requesting a mint", async function () {
            await expect(
                myToken.connect(nonSigner).requestMint(user1.address, amountToMint)
            ).to.be.revertedWithCustomError(myToken, "NotASigner");
        });
    });
});
