const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SkyAscentGame", function () {
  let skyAscentGame;
  let owner, player1, player2;

  beforeEach(async function () {
    [owner, player1, player2] = await ethers.getSigners();
    
    const SkyAscentGame = await ethers.getContractFactory("SkyAscentGame");
    skyAscentGame = await SkyAscentGame.deploy();
    await skyAscentGame.waitForDeployment();
  });

  describe("Score Submission", function () {
    it("Should submit a valid score", async function () {
      const score = 1000;
      const altitude = 500;
      const gameTime = 60;

      await expect(skyAscentGame.connect(player1).submitScore(score, altitude, gameTime))
        .to.emit(skyAscentGame, "GameCompleted")
        .withArgs(player1.address, score, altitude, gameTime);
    });

    it("Should reject invalid scores", async function () {
      await expect(
        skyAscentGame.connect(player1).submitScore(0, 500, 60)
      ).to.be.revertedWith("Invalid score");

      await expect(
        skyAscentGame.connect(player1).submitScore(1000, 0, 60)
      ).to.be.revertedWith("Invalid altitude");

      await expect(
        skyAscentGame.connect(player1).submitScore(1000, 500, 0)
      ).to.be.revertedWith("Invalid game time");
    });

    it("Should detect suspicious scores", async function () {
      // Too high score for time
      await expect(
        skyAscentGame.connect(player1).submitScore(10000, 500, 60)
      ).to.be.revertedWith("Suspicious score");

      // Too high altitude for time
      await expect(
        skyAscentGame.connect(player1).submitScore(1000, 5000, 60)
      ).to.be.revertedWith("Suspicious score");

      // Too short game time
      await expect(
        skyAscentGame.connect(player1).submitScore(100, 50, 5)
      ).to.be.revertedWith("Suspicious score");
    });
  });

  describe("Token Rewards", function () {
    it("Should calculate and award tokens correctly", async function () {
      const score = 1000;
      const altitude = 1500;
      const gameTime = 60;

      await skyAscentGame.connect(player1).submitScore(score, altitude, gameTime);

      const playerTokens = await skyAscentGame.playerTokens(player1.address);
      // Expected: (1000/100 * 1) + (1500/500 * 1) = 10 + 3 = 13
      expect(playerTokens).to.equal(13);
    });

    it("Should accumulate tokens from multiple games", async function () {
      await skyAscentGame.connect(player1).submitScore(500, 1000, 30);
      await skyAscentGame.connect(player1).submitScore(800, 1500, 45);

      const playerTokens = await skyAscentGame.playerTokens(player1.address);
      // Game 1: (500/100 * 1) + (1000/500 * 1) = 5 + 2 = 7
      // Game 2: (800/100 * 1) + (1500/500 * 1) = 8 + 3 = 11
      // Total: 7 + 11 = 18
      expect(playerTokens).to.equal(18);
    });
  });

  describe("Leaderboards", function () {
    it("Should update weekly leaderboard", async function () {
      await skyAscentGame.connect(player1).submitScore(1000, 500, 60);
      await skyAscentGame.connect(player2).submitScore(1500, 750, 90);

      const currentWeek = await skyAscentGame.getCurrentWeek();
      const leaderboard = await skyAscentGame.getWeeklyTopScores(currentWeek, 10);

      expect(leaderboard.length).to.equal(2);
      expect(leaderboard[0].player).to.equal(player2.address);
      expect(leaderboard[0].score).to.equal(1500);
      expect(leaderboard[1].player).to.equal(player1.address);
      expect(leaderboard[1].score).to.equal(1000);
    });
  });

  describe("Player History", function () {
    it("Should track player game history", async function () {
      await skyAscentGame.connect(player1).submitScore(1000, 500, 60);
      await skyAscentGame.connect(player1).submitScore(1200, 600, 70);

      const history = await skyAscentGame.getPlayerGameHistory(player1.address, 10);

      expect(history.length).to.equal(2);
      expect(history[0].score).to.equal(1200); // Most recent first
      expect(history[1].score).to.equal(1000);
    });
  });

  describe("Player Stats", function () {
    it("Should return correct player statistics", async function () {
      await skyAscentGame.connect(player1).submitScore(800, 400, 50);
      await skyAscentGame.connect(player1).submitScore(1200, 600, 70);
      await skyAscentGame.connect(player1).submitScore(1000, 500, 60);

      const [totalGames, bestScore, totalTokens] = await skyAscentGame.getPlayerStats(player1.address);

      expect(totalGames).to.equal(3);
      expect(bestScore).to.equal(1200);
      expect(totalTokens).to.equal(32); // Sum of all token rewards
    });
  });

  describe("Revive System", function () {
    it("Should allow revive purchase with sufficient tokens", async function () {
      // Earn tokens first
      await skyAscentGame.connect(player1).submitScore(5000, 2500, 300);
      
      const tokensBefore = await skyAscentGame.playerTokens(player1.address);
      expect(tokensBefore).to.be.gte(50); // Should have at least 50 tokens

      await skyAscentGame.connect(player1).purchaseRevive();

      const tokensAfter = await skyAscentGame.playerTokens(player1.address);
      expect(tokensAfter).to.equal(tokensBefore - 50n);
    });

    it("Should reject revive purchase with insufficient tokens", async function () {
      await expect(
        skyAscentGame.connect(player1).purchaseRevive()
      ).to.be.revertedWith("Insufficient tokens");
    });
  });
});