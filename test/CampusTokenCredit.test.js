const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CampusCreditToken Contract Functionality", function () {
    // Declare variables to be accessible in all tests within this describe block.
    let campusCreditToken; // The deployed CampusCreditToken contract instance
    let deployer; // The account that deploys the contract (also the initial token holder)
    let admin1, admin2, admin3; // The three multi-signature admin accounts
    let user1, user2; // Regular user accounts for token interactions
    let nonSigner; // An account that is not one of the multi-signature admins
    let reentrancyExploiterContract; // The ReentrancyExploiter contract instance

    // Constants for testing
    const INITIAL_SUPPLY_TOKENS = ethers.parseUnits("1000000", 18); // 1,000,000 tokens
    const TOKEN_RATE = 1000; // 1 ETH = 1000 tokens
    const MIN_APPROVALS = 2; // 2 out of 3 signers required

    // This setup function will be called once before all tests in this block.
    before(async function () {
        // Get the test accounts provided by Hardhat.
        [deployer, admin1, admin2, admin3, user1, user2, nonSigner] = await ethers.getSigners();

        // Deploy the CampusCreditToken contract.
        // The constructor takes the addresses of the three multi-signature admins.
        const CampusCreditTokenFactory = await ethers.getContractFactory("CampusCreditToken");
        campusCreditToken = await CampusCreditTokenFactory.deploy(admin1.address, admin2.address, admin3.address);
        await campusCreditToken.waitForDeployment();

        // Deploy the ReentrancyExploiter contract
        const ReentrancyExploiterFactory = await ethers.getContractFactory("ReentrancyExploiter");
        reentrancyExploiterContract = await ReentrancyExploiterFactory.deploy(campusCreditToken.target);
        await reentrancyExploiterContract.waitForDeployment();
    });

    // --- Test Suite: Basic ERC20 Functionality ---
    describe("1. Basic ERC20 Functionality", function () {
        it("Should have deployed with the correct name and symbol", async function () {
            expect(await campusCreditToken.name()).to.equal("UBa Campus Credit");
            expect(await campusCreditToken.symbol()).to.equal("CMCR");
        });

        it("Should have assigned the initial supply to the deployer (owner)", async function() {
            const deployerBalance = await campusCreditToken.balanceOf(deployer.address);
            expect(deployerBalance).to.equal(INITIAL_SUPPLY_TOKENS);
        });

        it("Should allow token transfers between accounts", async function () {
            const amountToTransfer = ethers.parseUnits("100", 18); // 100 tokens

            // Record initial balances
            const initialDeployerBalance = await campusCreditToken.balanceOf(deployer.address);
            const initialUser1Balance = await campusCreditToken.balanceOf(user1.address);

            // Perform the transfer from deployer to user1
            await campusCreditToken.connect(deployer).transfer(user1.address, amountToTransfer);

            // Assert new balances
            expect(await campusCreditToken.balanceOf(deployer.address)).to.equal(initialDeployerBalance - amountToTransfer);
            expect(await campusCreditToken.balanceOf(user1.address)).to.equal(initialUser1Balance + amountToTransfer);
        });

        it("Should fail transfer if sender has insufficient balance", async function () {
            const largeAmount = ethers.parseUnits("1", 24); // A very large amount to ensure insufficient balance
            // FIX: Changed to expect OpenZeppelin's specific custom error for insufficient balance
            await expect(
                campusCreditToken.connect(user2).transfer(deployer.address, largeAmount)
            ).to.be.revertedWithCustomError(campusCreditToken, "ERC20InsufficientBalance");
        });
    });

    // --- Test Suite: ETH-to-Token Conversion ---
    describe("2. ETH-to-Token Conversion (buyTokens)", function() {
        it("Should allow users to buy tokens by sending ETH to the contract (receive function)", async function() {
            const ethSent = ethers.parseEther("1"); // Send 1 ETH
            const expectedTokens = ethSent * BigInt(TOKEN_RATE); // Calculate expected tokens

            const initialContractEthBalance = await ethers.provider.getBalance(campusCreditToken.target);
            const initialUser1TokenBalance = await campusCreditToken.balanceOf(user1.address);

            // Send ETH directly to the contract (triggers receive() and purchaseTokensWithEth())
            await expect(user1.sendTransaction({ to: campusCreditToken.target, value: ethSent }))
                .to.emit(campusCreditToken, "TokensPurchased")
                .withArgs(user1.address, ethSent, expectedTokens);

            // Verify ETH balance of the contract increased
            expect(await ethers.provider.getBalance(campusCreditToken.target)).to.equal(initialContractEthBalance + ethSent);
            // Verify tokens were minted to user1
            expect(await campusCreditToken.balanceOf(user1.address)).to.equal(initialUser1TokenBalance + expectedTokens);
        });

        it("Should allow users to buy tokens by calling purchaseTokensWithEth method", async function() {
            const ethSent = ethers.parseEther("0.5"); // Send 0.5 ETH
            const expectedTokens = ethSent * BigInt(TOKEN_RATE);

            const initialContractEthBalance = await ethers.provider.getBalance(campusCreditToken.target);
            const initialUser2TokenBalance = await campusCreditToken.balanceOf(user2.address);

            // Call the purchaseTokensWithEth function directly
            await expect(campusCreditToken.connect(user2).purchaseTokensWithEth({ value: ethSent }))
                .to.emit(campusCreditToken, "TokensPurchased")
                .withArgs(user2.address, ethSent, expectedTokens);

            // Verify balances
            expect(await ethers.provider.getBalance(campusCreditToken.target)).to.equal(initialContractEthBalance + ethSent);
            expect(await campusCreditToken.balanceOf(user2.address)).to.equal(initialUser2TokenBalance + expectedTokens);
        });

        it("Should revert if no ETH is sent when buying tokens", async function() {
            await expect(
                campusCreditToken.connect(user1).purchaseTokensWithEth({ value: 0 })
            ).to.be.revertedWithCustomError(campusCreditToken, "ZeroEthProvided");
        });
    });

    // --- Test Suite: Multi-Signature Minting Control ---
    describe("3. Multi-Signature Minting Control", function() {
        const amountToMint = ethers.parseUnits("5000", 18); // 5000 tokens to mint
        let latestMintRequestId; // To store the ID of the most recent request

        // This beforeEach ensures a fresh request is submitted for relevant tests
        beforeEach(async function() {
            // Submit a request to ensure `latestMintRequestId` is set for the current test context
            const txSubmit = await campusCreditToken.connect(admin1).submitMintRequest(user1.address, amountToMint);
            const receiptSubmit = await txSubmit.wait();
            const event = receiptSubmit.logs.find(log => campusCreditToken.interface.parseLog(log)?.name === "TokenMintRequestSubmitted");
            latestMintRequestId = event.args[0];
        });

        it("Should allow a multi-sig admin to submit a mint request", async function() {
            // The request was already submitted in beforeEach
            const request = await campusCreditToken.pendingMintApprovals(latestMintRequestId);
            expect(request.recipient).to.equal(user1.address);
            expect(request.amount).to.equal(amountToMint);
            expect(request.currentApprovalCount).to.equal(1);
            expect(request.isExecuted).to.be.false;
            // FIX: Use the new public view function to check hasApproved
            expect(await campusCreditToken.hasMintApproved(latestMintRequestId, admin1.address)).to.be.true;
        });

        it("Should revert if a non-admin tries to submit a mint request", async function() {
            // This test does not need the beforeEach setup to run first
            await expect(
                campusCreditToken.connect(nonSigner).submitMintRequest(user1.address, amountToMint)
            ).to.be.revertedWithCustomError(campusCreditToken, "UnauthorizedSigner");
        });

        it("Should allow a second multi-sig admin to approve and execute the mint request", async function() {
            // The request was submitted in beforeEach, so admin1 has approved.
            // admin2 approves and executes
            const initialUser2Balance = await campusCreditToken.balanceOf(user2.address);
            await expect(campusCreditToken.connect(admin2).approveAndFinalizeMint(latestMintRequestId))
                .to.emit(campusCreditToken, "OperationApproved")
                .withArgs(latestMintRequestId, admin2.address, "mint")
                .and.to.emit(campusCreditToken, "TokensMinted")
                .withArgs(latestMintRequestId, user2.address, amountToMint); // Note: user2 is recipient here

            const request = await campusCreditToken.pendingMintApprovals(latestMintRequestId);
            expect(request.currentApprovalCount).to.equal(MIN_APPROVALS); // Should be 2 approvals
            expect(request.isExecuted).to.be.true;
            expect(await campusCreditToken.balanceOf(user2.address)).to.equal(initialUser2Balance + amountToMint);
        });

        it("Should revert if an admin tries to approve an already approved request (before execution)", async function() {
            // This test needs a fresh request where only admin1 has approved initially.
            // The beforeEach already submits a request by admin1.
            // FIX: This test specifically targets the 'RequestAlreadyApproved' error.
            // admin1 already approved when submitting the request in beforeEach.
            // Now, admin1 tries to approve again *before* it reaches MIN_APPROVALS.
            await expect(
                campusCreditToken.connect(admin1).approveAndFinalizeMint(latestMintRequestId)
            ).to.be.revertedWithCustomError(campusCreditToken, "RequestAlreadyApproved");
        });


        it("Should revert if an admin tries to approve an already executed request", async function() {
            // The request was submitted by admin1 in beforeEach.
            // Now, admin2 approves and executes it.
            await campusCreditToken.connect(admin2).approveAndFinalizeMint(latestMintRequestId);

            // admin3 tries to approve the already executed request
            await expect(
                campusCreditToken.connect(admin3).approveAndFinalizeMint(latestMintRequestId)
            ).to.be.revertedWithCustomError(campusCreditToken, "InvalidOrCompletedRequest");
        });

        it("Should revert if a non-admin tries to approve a mint request", async function() {
            // The request was submitted by admin1 in beforeEach.
            await expect(
                campusCreditToken.connect(nonSigner).approveAndFinalizeMint(latestMintRequestId)
            ).to.be.revertedWithCustomError(campusCreditToken, "UnauthorizedSigner");
        });

        it("Should revert if an invalid request ID is provided for approval", async function() {
            await expect(
                campusCreditToken.connect(admin1).approveAndFinalizeMint(9999) // Non-existent ID
            ).to.be.revertedWithCustomError(campusCreditToken, "InvalidOrCompletedRequest");
        });
    });

    // --- Test Suite: Multi-Signature Withdrawal Control ---
    describe("4. Multi-Signature Withdrawal Control", function() {
        const ethToWithdraw = ethers.parseEther("0.1"); // 0.1 ETH to withdraw
        let latestWithdrawalRequestId;

        // Ensure contract has ETH for withdrawal tests
        beforeEach(async function() {
            const contractEthBalance = await ethers.provider.getBalance(campusCreditToken.target);
            if (contractEthBalance < ethToWithdraw) {
                // Send ETH to the contract if its balance is too low
                await deployer.sendTransaction({ to: campusCreditToken.target, value: ethers.parseEther("0.2") });
            }
            // Submit a request to ensure `latestWithdrawalRequestId` is set for the current test context
            const txSubmit = await campusCreditToken.connect(admin1).submitWithdrawalRequest(ethToWithdraw);
            const receiptSubmit = await txSubmit.wait();
            const event = receiptSubmit.logs.find(log => campusCreditToken.interface.parseLog(log)?.name === "FundsWithdrawalRequestSubmitted");
            latestWithdrawalRequestId = event.args[0];
        });

        it("Should allow a multi-sig admin to submit a withdrawal request", async function() {
            // The request was already submitted in beforeEach
            const request = await campusCreditToken.pendingWithdrawalApprovals(latestWithdrawalRequestId);
            expect(request.recipient).to.equal(deployer.address); // Owner is recipient
            expect(request.amount).to.equal(ethToWithdraw);
            expect(request.currentApprovalCount).to.equal(1);
            expect(request.isExecuted).to.be.false;
            // FIX: Use the new public view function to check hasApproved
            expect(await campusCreditToken.hasWithdrawalApproved(latestWithdrawalRequestId, admin1.address)).to.be.true;
        });

        it("Should revert if a non-admin tries to submit a withdrawal request", async function() {
            // This test does not need the beforeEach setup to run first
            await expect(
                campusCreditToken.connect(nonSigner).submitWithdrawalRequest(ethToWithdraw)
            ).to.be.revertedWithCustomError(campusCreditToken, "UnauthorizedSigner");
        });

        it("Should revert if contract has insufficient ETH for withdrawal request", async function() {
            const largeAmount = ethers.parseEther("1000000"); // More than contract could ever hold
            await expect(
                campusCreditToken.connect(admin1).submitWithdrawalRequest(largeAmount)
            ).to.be.revertedWithCustomError(campusCreditToken, "InsufficientContractBalance");
        });

        it("Should revert if withdrawal amount is zero", async function() {
            await expect(
                campusCreditToken.connect(admin1).submitWithdrawalRequest(0)
            ).to.be.revertedWithCustomError(campusCreditToken, "InvalidWithdrawalAmount");
        });

        it("Should allow a second multi-sig admin to approve and execute the withdrawal request", async function() {
            // The request was submitted by admin1 in beforeEach.
            const initialDeployerEthBalance = await ethers.provider.getBalance(deployer.address);
            const initialContractEthBalance = await ethers.provider.getBalance(campusCreditToken.target);

            // admin2 approves and executes
            const tx = await campusCreditToken.connect(admin2).approveAndFinalizeWithdrawal(latestWithdrawalRequestId);
            const receipt = await tx.wait(); // Wait for transaction to be mined
            const gasUsed = receipt.gasUsed * receipt.gasPrice; // Calculate gas cost

            await expect(tx)
                .to.emit(campusCreditToken, "OperationApproved")
                .withArgs(latestWithdrawalRequestId, admin2.address, "withdraw")
                .and.to.emit(campusCreditToken, "FundsWithdrawn")
                .withArgs(latestWithdrawalRequestId, deployer.address, ethToWithdraw);

            const request = await campusCreditToken.pendingWithdrawalApprovals(latestWithdrawalRequestId);
            expect(request.currentApprovalCount).to.equal(MIN_APPROVALS); // Should be 2 approvals
            expect(request.isExecuted).to.be.true;

            // Verify ETH balances after withdrawal
            // Deployer's balance should increase by amountToWithdraw minus gas cost for the transaction
            expect(await ethers.provider.getBalance(deployer.address)).to.closeTo(initialDeployerEthBalance + ethToWithdraw - gasUsed, ethers.parseEther("0.0001")); // Use closeTo for gas variations
            expect(await ethers.provider.getBalance(campusCreditToken.target)).to.equal(initialContractEthBalance - ethToWithdraw);
        });

        it("Should revert if an admin tries to approve an already approved withdrawal request (before execution)", async function() {
            // The request was submitted by admin1 in beforeEach.
            // If MIN_APPROVALS is 2, this won't execute yet.
            if (MIN_APPROVALS > 1) {
                await campusCreditToken.connect(admin2).approveAndFinalizeWithdrawal(latestWithdrawalRequestId);
            }

            // admin1 tries to approve again (who already approved on submission)
            // FIX: This test specifically targets the 'RequestAlreadyApproved' error.
            // The request should NOT be executed yet, so it doesn't fall into InvalidOrCompletedRequest.
            await expect(
                campusCreditToken.connect(admin1).approveAndFinalizeWithdrawal(latestWithdrawalRequestId)
            ).to.be.revertedWithCustomError(campusCreditToken, "RequestAlreadyApproved");
        });

        it("Should revert if an admin tries to approve an already executed withdrawal request", async function() {
            // The request was submitted by admin1 in beforeEach.
            // admin2 approves and executes (assuming MIN_APPROVALS is 2)
            await campusCreditToken.connect(admin2).approveAndFinalizeWithdrawal(latestWithdrawalRequestId);

            // admin3 tries to approve the already executed request
            await expect(
                campusCreditToken.connect(admin3).approveAndFinalizeWithdrawal(latestWithdrawalRequestId)
            ).to.be.revertedWithCustomError(campusCreditToken, "InvalidOrCompletedRequest");
        });

        it("Should revert if a non-admin tries to approve a withdrawal request", async function() {
            // The request was submitted by admin1 in beforeEach.
            await expect(
                campusCreditToken.connect(nonSigner).approveAndFinalizeWithdrawal(latestWithdrawalRequestId)
            ).to.be.revertedWithCustomError(campusCreditToken, "UnauthorizedSigner");
        });

        it("Should revert if an invalid request ID is provided for withdrawal approval", async function() {
            await expect(
                campusCreditToken.connect(admin1).approveAndFinalizeWithdrawal(9999) // Non-existent ID
            ).to.be.revertedWithCustomError(campusCreditToken, "InvalidOrCompletedRequest");
        });

        it("Should be protected against reentrancy attacks", async function () {
            // Ensure CampusCreditToken has ETH for the withdrawal
            const contractEthBalance = await ethers.provider.getBalance(campusCreditToken.target);
            const ethForReentrancyTest = ethers.parseEther("0.2");
            if (contractEthBalance < ethForReentrancyTest) {
                await deployer.sendTransaction({ to: campusCreditToken.target, value: ethForReentrancyTest });
            }

            // 1. Fund the exploiter contract with some ETH (so it can receive funds and pay for gas if needed)
            const fundAmount = ethers.parseEther("0.1");
            await deployer.sendTransaction({ to: reentrancyExploiterContract.target, value: fundAmount });

            // 2. Temporarily transfer ownership of CampusCreditToken to the exploiter contract.
            // This is necessary because `owner()` is the recipient of the withdrawal.
            await campusCreditToken.connect(deployer).transferOwnership(reentrancyExploiterContract.target);

            // 3. Submit a withdrawal request from an admin. The recipient will now be the exploiter contract.
            // This request needs two approvals. admin1 will give the first.
            const withdrawalAmount = ethers.parseEther("0.05");
            const txSubmit = await campusCreditToken.connect(admin1).submitWithdrawalRequest(withdrawalAmount);
            const receiptSubmit = await txSubmit.wait();
            const reentrancyTestRequestId = receiptSubmit.logs.find(log => campusCreditToken.interface.parseLog(log)?.name === "FundsWithdrawalRequestSubmitted").args[0];

            // 4. Have admin2 approve the request (second approval).
            // This will trigger the withdrawal to the exploiter contract.
            // The exploiter's `receive()` function will then attempt to re-enter `approveAndFinalizeWithdrawal`.
            // Due to `nonReentrant` modifier, this re-entry attempt should revert.
            const initialExploiterEthBalance = await ethers.provider.getBalance(reentrancyExploiterContract.target);
            const initialCampusCreditTokenEthBalance = await ethers.provider.getBalance(campusCreditToken.target);

            // The transaction from admin2 should complete, but the internal re-entry from the exploiter's receive()
            // should be blocked by the ReentrancyGuard.
            await expect(campusCreditToken.connect(admin2).approveAndFinalizeWithdrawal(reentrancyTestRequestId))
                .to.not.be.reverted; // The main transaction should not revert itself.

            // After the transaction, verify the state:
            // - The withdrawal should have occurred once.
            // - The exploiter's reentrancyCallCount should be 1 (the initial call from receive())
            //   or 2 (if it increments before the revert), but NOT its max limit (5).
            const finalExploiterCallCount = await reentrancyExploiterContract.reentrancyCallCount();
            expect(finalExploiterCallCount).to.be.lessThan(5); // Confirms reentrancy was stopped

            // Verify balances. The withdrawal should have completed for the first call.
            expect(await ethers.provider.getBalance(reentrancyExploiterContract.target)).to.equal(initialExploiterEthBalance + withdrawalAmount);
            expect(await ethers.provider.getBalance(campusCreditToken.target)).to.equal(initialCampusCreditTokenEthBalance - withdrawalAmount);


            // 5. Transfer ownership back to the deployer for subsequent tests
            // First, ensure the exploiter contract has enough ETH to transfer ownership back
            const exploiterEthBalance = await ethers.provider.getBalance(reentrancyExploiterContract.target);
            if (exploiterEthBalance < ethers.parseEther("0.001")) { // Check for a small amount for gas
                 await deployer.sendTransaction({ to: reentrancyExploiterContract.target, value: ethers.parseEther("0.002") });
            }
            // Recover any remaining ETH from exploiter to deployer (optional, but good practice)
            await reentrancyExploiterContract.connect(reentrancyExploiterContract.attackerAddress()).recoverStolenEther();
            // Transfer ownership back
            await campusCreditToken.connect(reentrancyExploiterContract.target).transferOwnership(deployer.address);
        });
    });
});
