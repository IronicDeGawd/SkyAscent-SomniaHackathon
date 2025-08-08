import { ethers } from 'ethers'

// Somnia Network Configuration
export const SOMNIA_CONFIG = {
  chainId: 50312,
  name: 'Somnia Shannon Testnet',
  currency: 'STT',
  rpcUrl: 'https://dream-rpc.somnia.network',
  blockExplorer: 'https://shannon-explorer.somnia.network'
}

// Contract addresses (to be updated after deployment)
export const CONTRACT_ADDRESSES = {
  GAME_CONTRACT: process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS || '',
  TOKEN_CONTRACT: process.env.NEXT_PUBLIC_TOKEN_CONTRACT_ADDRESS || ''
}

// Smart contract ABI (simplified for the game contract)
export const GAME_CONTRACT_ABI = [
  "function submitScore(uint256 _score, uint256 _altitude, uint256 _gameTime) external",
  "function getWeeklyTopScores(uint256 _week, uint256 _limit) external view returns (tuple(address player, uint256 score, uint256 altitude, uint256 timestamp)[])",
  "function getPlayerGameHistory(address _player, uint256 _limit) external view returns (tuple(uint256 score, uint256 altitude, uint256 gameTime, uint256 timestamp, address player)[])",
  "function getPlayerStats(address _player) external view returns (uint256 totalGames, uint256 bestScore, uint256 totalTokens)",
  "function purchaseRevive() external",
  "function playerTokens(address) external view returns (uint256)",
  "function getCurrentWeek() external view returns (uint256)",
  "event GameCompleted(address indexed player, uint256 score, uint256 altitude, uint256 gameTime)",
  "event TokensEarned(address indexed player, uint256 amount)"
]

export interface LeaderboardEntry {
  player: string
  score: number
  altitude: number
  timestamp: number
}

export interface GameSession {
  score: number
  altitude: number
  gameTime: number
  timestamp: number
  player: string
}

export interface PlayerStats {
  totalGames: number
  bestScore: number
  totalTokens: number
}

export class BlockchainManager {
  private provider: ethers.BrowserProvider | null = null
  private gameContract: ethers.Contract | null = null
  private signer: ethers.Signer | null = null

  async connectWallet(): Promise<string | null> {
    try {
      if (!window.ethereum) {
        throw new Error('No wallet found')
      }

      this.provider = new ethers.BrowserProvider(window.ethereum)
      
      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' })
      
      // Switch to Somnia network if needed
      await this.switchToSomnia()
      
      this.signer = await this.provider.getSigner()
      const address = await this.signer.getAddress()
      
      // Initialize contract
      if (CONTRACT_ADDRESSES.GAME_CONTRACT) {
        this.gameContract = new ethers.Contract(
          CONTRACT_ADDRESSES.GAME_CONTRACT,
          GAME_CONTRACT_ABI,
          this.signer
        )
      }
      
      return address
    } catch (error) {
      console.error('Failed to connect wallet:', error)
      throw error
    }
  }

  async switchToSomnia(): Promise<void> {
    if (!window.ethereum) return

    try {
      // Try to switch to Somnia network
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${SOMNIA_CONFIG.chainId.toString(16)}` }]
      })
    } catch (switchError: any) {
      // If network doesn't exist, add it
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: `0x${SOMNIA_CONFIG.chainId.toString(16)}`,
            chainName: SOMNIA_CONFIG.name,
            nativeCurrency: {
              name: SOMNIA_CONFIG.currency,
              symbol: SOMNIA_CONFIG.currency,
              decimals: 18
            },
            rpcUrls: [SOMNIA_CONFIG.rpcUrl],
            blockExplorerUrls: [SOMNIA_CONFIG.blockExplorer]
          }]
        })
      } else {
        throw switchError
      }
    }
  }

  async submitScore(score: number, altitude: number, gameTime: number): Promise<string> {
    if (!this.gameContract) {
      throw new Error('Game contract not initialized')
    }

    try {
      const tx = await this.gameContract.submitScore(score, altitude, gameTime)
      const receipt = await tx.wait()
      return receipt.hash
    } catch (error) {
      console.error('Failed to submit score:', error)
      throw error
    }
  }

  async getWeeklyLeaderboard(limit: number = 50): Promise<LeaderboardEntry[]> {
    if (!this.gameContract) return []

    try {
      const currentWeek = await this.gameContract.getCurrentWeek()
      const entries = await this.gameContract.getWeeklyTopScores(currentWeek, limit)
      
      return entries.map((entry: any) => ({
        player: entry.player,
        score: Number(entry.score),
        altitude: Number(entry.altitude),
        timestamp: Number(entry.timestamp) * 1000 // Convert to milliseconds
      }))
    } catch (error) {
      console.error('Failed to get leaderboard:', error)
      return []
    }
  }

  async getPlayerHistory(playerAddress: string, limit: number = 20): Promise<GameSession[]> {
    if (!this.gameContract) return []

    try {
      const sessions = await this.gameContract.getPlayerGameHistory(playerAddress, limit)
      
      return sessions.map((session: any) => ({
        score: Number(session.score),
        altitude: Number(session.altitude),
        gameTime: Number(session.gameTime),
        timestamp: Number(session.timestamp) * 1000, // Convert to milliseconds
        player: session.player
      }))
    } catch (error) {
      console.error('Failed to get player history:', error)
      return []
    }
  }

  async getPlayerStats(playerAddress: string): Promise<PlayerStats> {
    if (!this.gameContract) {
      return { totalGames: 0, bestScore: 0, totalTokens: 0 }
    }

    try {
      const stats = await this.gameContract.getPlayerStats(playerAddress)
      
      return {
        totalGames: Number(stats.totalGames),
        bestScore: Number(stats.bestScore),
        totalTokens: Number(stats.totalTokens)
      }
    } catch (error) {
      console.error('Failed to get player stats:', error)
      return { totalGames: 0, bestScore: 0, totalTokens: 0 }
    }
  }

  async getPlayerTokenBalance(playerAddress: string): Promise<number> {
    if (!this.gameContract) return 0

    try {
      const balance = await this.gameContract.playerTokens(playerAddress)
      return Number(balance)
    } catch (error) {
      console.error('Failed to get token balance:', error)
      return 0
    }
  }

  async purchaseRevive(): Promise<string> {
    if (!this.gameContract) {
      throw new Error('Game contract not initialized')
    }

    try {
      const tx = await this.gameContract.purchaseRevive()
      const receipt = await tx.wait()
      return receipt.hash
    } catch (error) {
      console.error('Failed to purchase revive:', error)
      throw error
    }
  }

  // Get current connected account address
  async getCurrentAccount(): Promise<string | null> {
    if (!this.signer) return null
    
    try {
      const address = await this.signer.getAddress()
      return address
    } catch (error) {
      console.error('Failed to get current account:', error)
      return null
    }
  }

  // Check if wallet is connected
  isWalletConnected(): boolean {
    return this.signer !== null
  }

  // Utility function to format addresses
  static formatAddress(address: string): string {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  // Utility function to format large numbers
  static formatNumber(num: number): string {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`
    }
    return num.toString()
  }
}

// Create a singleton instance
export const blockchainManager = new BlockchainManager()

// Types for window.ethereum
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>
      on: (event: string, callback: (...args: any[]) => void) => void
      removeListener: (event: string, callback: (...args: any[]) => void) => void
    }
  }
}