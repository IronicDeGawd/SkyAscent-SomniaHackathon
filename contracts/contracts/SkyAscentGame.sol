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
    mapping(uint256 => bool) public weeklyRewardsClaimed; // Track if week's rewards were claimed

    // Events
    event GameCompleted(
        address indexed player,
        uint256 score,
        uint256 altitude,
        uint256 gameTime
    );
    event TokensEarned(address indexed player, uint256 amount);
    event WeeklyLeaderboardUpdated(uint256 week, address player, uint256 score);
    event WeeklyRewardsClaimed(uint256 week, address[] winners, uint256[] rewards);
    event LeaderboardReset(uint256 week);
    event PlayerHistoryReset(address player);
    event GlobalReset();

    // Constants - BALANCED TOKEN ECONOMICS
    uint256 public constant TOKENS_PER_1000_SCORE = 1 * 10 ** 18; // 1 SKYC per 1,000 score points (achievable)
    uint256 public constant TOKENS_PER_500_ALTITUDE = 1 * 10 ** 18; // 1 SKYC per 500 altitude (achievable)
    uint256 public constant REVIVE_COST = 50 * 10 ** 18; // 50 SKYC for revive
    uint256 public constant MAX_TOTAL_SUPPLY = 10000000 * 10 ** 18; // 10 million SKYC max supply
    uint256 public constant TREASURY_RESERVE = 9000000 * 10 ** 18; // 9 million for rewards treasury
    
    // Weekly leaderboard rewards - UPDATED AMOUNTS
    uint256 public constant FIRST_PLACE_REWARD = 350 * 10 ** 18;  // 350 SKYC for 1st place
    uint256 public constant SECOND_PLACE_REWARD = 200 * 10 ** 18; // 200 SKYC for 2nd place
    uint256 public constant THIRD_PLACE_REWARD = 100 * 10 ** 18;  // 100 SKYC for 3rd place
    uint256 public constant TOP_10_REWARD = 15 * 10 ** 18;        // 15 SKYC for places 4-10

    // Constructor
    constructor() ERC20("Sky Ascent Coin", "SKYC") Ownable(msg.sender) {
        // Mint maximum supply to contract for proper treasury management
        _mint(address(this), MAX_TOTAL_SUPPLY); // 10 million SKYC tokens to contract
        // Transfer 1 million to deployer for initial distribution/testing
        _transfer(address(this), msg.sender, 1000000 * 10 ** 18);
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

        // Calculate and award tokens from treasury (NO MORE MINTING!)
        uint256 tokensEarned = calculateTokenReward(_score, _altitude);
        if (tokensEarned > 0 && balanceOf(address(this)) >= tokensEarned) {
            _transfer(address(this), msg.sender, tokensEarned);
        } else {
            tokensEarned = 0; // No tokens if treasury is empty
        }

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
        // BALANCED: Achievable token rewards for good gameplay
        uint256 scoreTokens = (_score / 1000) * TOKENS_PER_1000_SCORE;
        uint256 altitudeTokens = (_altitude / 500) * TOKENS_PER_500_ALTITUDE;
        return scoreTokens + altitudeTokens;
    }

    function isScoreValid(
        uint256 _score,
        uint256 _altitude,
        uint256 _gameTime
    ) internal pure returns (bool) {
        // FIXED: Realistic validation rules based on actual game analysis
        if (_gameTime < 5) return false; // Minimum 5 seconds
        if (_score > _gameTime * 2000) return false; // Max 2000 points per second (realistic for game)
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

    // Weekly rewards distribution function
    function claimWeeklyRewards(uint256 _week) external onlyOwner nonReentrant {
        require(!weeklyRewardsClaimed[_week], "Weekly rewards already claimed");
        require(_week < getCurrentWeek(), "Cannot claim rewards for current week");
        
        LeaderboardEntry[] storage leaderboard = weeklyLeaderboards[_week];
        require(leaderboard.length > 0, "No entries for this week");
        
        uint256 totalRewards = 0;
        address[] memory winners = new address[](leaderboard.length > 10 ? 10 : leaderboard.length);
        uint256[] memory rewards = new uint256[](leaderboard.length > 10 ? 10 : leaderboard.length);
        
        // Distribute rewards to top players
        for (uint256 i = 0; i < winners.length; i++) {
            address player = leaderboard[i].player;
            uint256 reward;
            
            if (i == 0) {
                reward = FIRST_PLACE_REWARD;  // 350 SKYC
            } else if (i == 1) {
                reward = SECOND_PLACE_REWARD; // 200 SKYC
            } else if (i == 2) {
                reward = THIRD_PLACE_REWARD;  // 100 SKYC
            } else {
                reward = TOP_10_REWARD;       // 15 SKYC for places 4-10
            }
            
            winners[i] = player;
            rewards[i] = reward;
            totalRewards += reward;
        }
        
        // Check treasury has enough funds
        require(balanceOf(address(this)) >= totalRewards, "Insufficient treasury balance");
        
        // Distribute rewards
        for (uint256 i = 0; i < winners.length; i++) {
            if (rewards[i] > 0) {
                _transfer(address(this), winners[i], rewards[i]);
            }
        }
        
        // Mark as claimed
        weeklyRewardsClaimed[_week] = true;
        
        emit WeeklyRewardsClaimed(_week, winners, rewards);
    }
    
    // Check if weekly rewards have been claimed
    function areWeeklyRewardsClaimed(uint256 _week) external view returns (bool) {
        return weeklyRewardsClaimed[_week];
    }
    
    // Treasury management functions
    function getTreasuryBalance() external view returns (uint256) {
        return balanceOf(address(this));
    }
    
    function withdrawFromTreasury(address to, uint256 amount) external onlyOwner {
        require(balanceOf(address(this)) >= amount, "Insufficient treasury balance");
        _transfer(address(this), to, amount);
    }
    
    function depositToTreasury(uint256 amount) external {
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        _transfer(msg.sender, address(this), amount);
    }
    
    // Emergency functions (no more unlimited minting!)
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
