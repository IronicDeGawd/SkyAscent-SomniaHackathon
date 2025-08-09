// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract SkyAscentGame is ERC20, Ownable, ReentrancyGuard {
    struct GameSession {
        uint256 score;
        uint256 altitude;
        uint256 gameTime;
        uint256 timestamp;
        address player;
    }

    struct LeaderboardEntry {
        address player;
        uint256 score;
        uint256 altitude;
        uint256 timestamp;
    }

    // Storage
    mapping(address => GameSession[]) public playerHistory;
    mapping(uint256 => LeaderboardEntry[]) public weeklyLeaderboards;

    // Events
    event GameCompleted(
        address indexed player,
        uint256 score,
        uint256 altitude,
        uint256 gameTime
    );
    event TokensEarned(address indexed player, uint256 amount);
    event WeeklyLeaderboardUpdated(uint256 week, address player, uint256 score);
    event LeaderboardReset(uint256 week);
    event PlayerHistoryReset(address player);
    event GlobalReset();

    // Constants
    uint256 public constant TOKENS_PER_100_SCORE = 1 * 10 ** 18; // 1 SKYC per 100 score points
    uint256 public constant TOKENS_PER_500_ALTITUDE = 1 * 10 ** 18; // 1 SKYC per 500 altitude
    uint256 public constant REVIVE_COST = 50 * 10 ** 18; // 50 SKYC for revive

    // Constructor
    constructor() ERC20("Sky Ascent Coin", "SKYC") Ownable(msg.sender) {
        // Mint initial supply to deployer for rewards distribution
        _mint(msg.sender, 1000000 * 10 ** 18); // 1 million SKYC tokens
    }

    function submitScore(
        uint256 _score,
        uint256 _altitude,
        uint256 _gameTime
    ) external nonReentrant whenNotPaused {
        require(_score > 0, "Invalid score");
        require(_altitude > 0, "Invalid altitude");
        require(_gameTime > 0, "Invalid game time");

        // Validate score (basic anti-cheat)
        require(isScoreValid(_score, _altitude, _gameTime), "Suspicious score");

        // Create game session
        GameSession memory session = GameSession({
            score: _score,
            altitude: _altitude,
            gameTime: _gameTime,
            timestamp: block.timestamp,
            player: msg.sender
        });

        // Store in player history
        playerHistory[msg.sender].push(session);

        // Update weekly leaderboard
        uint256 currentWeek = getCurrentWeek();
        updateWeeklyLeaderboard(currentWeek, msg.sender, _score, _altitude);

        // Calculate and award tokens
        uint256 tokensEarned = calculateTokenReward(_score, _altitude);
        _mint(msg.sender, tokensEarned);

        emit GameCompleted(msg.sender, _score, _altitude, _gameTime);
        emit TokensEarned(msg.sender, tokensEarned);
    }

    function getCurrentWeek() public view returns (uint256) {
        return block.timestamp / (7 days);
    }

    function calculateTokenReward(
        uint256 _score,
        uint256 _altitude
    ) internal pure returns (uint256) {
        uint256 scoreTokens = (_score / 100) * TOKENS_PER_100_SCORE;
        uint256 altitudeTokens = (_altitude / 500) * TOKENS_PER_500_ALTITUDE;
        return scoreTokens + altitudeTokens;
    }

    function isScoreValid(
        uint256 _score,
        uint256 _altitude,
        uint256 _gameTime
    ) internal pure returns (bool) {
        // Basic validation rules
        if (_gameTime < 5) return false; // Minimum 5 seconds
        if (_score > _gameTime * 5000) return false; // Max 100 points per second
        if (_altitude > _gameTime * 50) return false; // Max 50 altitude per second
        return true;
    }

    function updateWeeklyLeaderboard(
        uint256 _week,
        address _player,
        uint256 _score,
        uint256 _altitude
    ) internal {
        LeaderboardEntry[] storage leaderboard = weeklyLeaderboards[_week];

        // Add new entry
        leaderboard.push(
            LeaderboardEntry({
                player: _player,
                score: _score,
                altitude: _altitude,
                timestamp: block.timestamp
            })
        );

        // Optimized leaderboard insertion - only sort if this score qualifies for top 50
        if (leaderboard.length < 50) {
            // Add to leaderboard and find insertion point
            _insertSorted(leaderboard, leaderboard.length - 1);
        } else if (_score > leaderboard[49].score) {
            // Replace lowest score and sort
            leaderboard[49] = LeaderboardEntry({
                player: _player,
                score: _score,
                altitude: _altitude,
                timestamp: block.timestamp
            });
            _insertSorted(leaderboard, 49);
        } else {
            // Score doesn't qualify, remove the entry we just added
            leaderboard.pop();
        }

        emit WeeklyLeaderboardUpdated(_week, _player, _score);
    }

    function getWeeklyTopScores(
        uint256 _week,
        uint256 _limit
    ) external view returns (LeaderboardEntry[] memory) {
        LeaderboardEntry[] storage leaderboard = weeklyLeaderboards[_week];
        uint256 length = _limit > leaderboard.length
            ? leaderboard.length
            : _limit;

        LeaderboardEntry[] memory result = new LeaderboardEntry[](length);
        for (uint256 i = 0; i < length; i++) {
            result[i] = leaderboard[i];
        }
        return result;
    }

    function getPlayerGameHistory(
        address _player,
        uint256 _limit
    ) external view returns (GameSession[] memory) {
        GameSession[] storage history = playerHistory[_player];
        uint256 length = _limit > history.length ? history.length : _limit;

        GameSession[] memory result = new GameSession[](length);
        for (uint256 i = 0; i < length; i++) {
            result[i] = history[history.length - 1 - i]; // Return most recent first
        }
        return result;
    }

    function purchaseRevive() external {
        require(balanceOf(msg.sender) >= REVIVE_COST, "Insufficient tokens");
        _burn(msg.sender, REVIVE_COST);
        // Revive logic handled client-side
    }

    function getPlayerStats(
        address _player
    )
        external
        view
        returns (uint256 totalGames, uint256 bestScore, uint256 totalTokens)
    {
        totalGames = playerHistory[_player].length;
        totalTokens = balanceOf(_player);

        // Find best score with gas optimization
        bestScore = 0;
        GameSession[] storage sessions = playerHistory[_player];
        for (uint256 i = 0; i < totalGames; i++) {
            if (sessions[i].score > bestScore) {
                bestScore = sessions[i].score;
            }
        }
    }

    // Owner functions for token management
    function mintTokens(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function burnTokens(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
    }

    // Admin functions for testing and management
    function resetWeeklyLeaderboard(uint256 _week) external onlyOwner {
        delete weeklyLeaderboards[_week];
        emit LeaderboardReset(_week);
    }

    function resetPlayerHistory(address _player) external onlyOwner {
        delete playerHistory[_player];
        emit PlayerHistoryReset(_player);
    }

    function resetAllData() external onlyOwner {
        // Note: This is expensive and should only be used in testing
        // In production, consider selective resets instead
        emit GlobalReset();
    }

    function updateValidationRules(
        uint256 _minGameTime,
        uint256 _maxScorePerSecond,
        uint256 _maxAltitudePerSecond
    ) external onlyOwner {
        // Future: Store validation rules as state variables instead of constants
        // This would allow dynamic updates without redeployment
    }

    // Gas-optimized insertion sort for leaderboards
    function _insertSorted(
        LeaderboardEntry[] storage leaderboard,
        uint256 index
    ) internal {
        if (index == 0) return;

        LeaderboardEntry memory entry = leaderboard[index];
        uint256 i = index;

        // Move entry to correct position
        while (i > 0 && leaderboard[i - 1].score < entry.score) {
            leaderboard[i] = leaderboard[i - 1];
            i--;
        }

        if (i != index) {
            leaderboard[i] = entry;
        }
    }

    // Emergency pause functionality
    bool public paused = false;

    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }

    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }
}
