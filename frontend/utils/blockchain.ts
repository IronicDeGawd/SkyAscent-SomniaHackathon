// Removed unused imports - now using wagmi hooks directly in components

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
  GAME_CONTRACT: process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS,
  TOKEN_CONTRACT: process.env.NEXT_PUBLIC_TOKEN_CONTRACT_ADDRESS || ''
}

// Validate contract addresses
export function validateContractAddress(address: string): boolean {
  if (!address) return false
  // Check if it's a valid Ethereum address format
  const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/
  return ethAddressRegex.test(address)
}

// Get validated contract address with fallback
export function getGameContractAddress(): string | null {
  const address = CONTRACT_ADDRESSES.GAME_CONTRACT
  if (validateContractAddress(address)) {
    return address as `0x${string}`
  }
  console.warn('Invalid or missing game contract address:', address)
  return null
}

// Smart contract ABI (JSON format for wagmi compatibility)
export const GAME_CONTRACT_ABI = [
  {
    "type": "function",
    "name": "submitScore",
    "stateMutability": "nonpayable",
    "inputs": [
      {"name": "_score", "type": "uint256"},
      {"name": "_altitude", "type": "uint256"},
      {"name": "_gameTime", "type": "uint256"}
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "getWeeklyTopScores",
    "stateMutability": "view",
    "inputs": [
      {"name": "_week", "type": "uint256"},
      {"name": "_limit", "type": "uint256"}
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple[]",
        "components": [
          {"name": "player", "type": "address"},
          {"name": "score", "type": "uint256"},
          {"name": "altitude", "type": "uint256"},
          {"name": "timestamp", "type": "uint256"}
        ]
      }
    ]
  },
  {
    "type": "function",
    "name": "getPlayerGameHistory",
    "stateMutability": "view",
    "inputs": [
      {"name": "_player", "type": "address"},
      {"name": "_limit", "type": "uint256"}
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple[]",
        "components": [
          {"name": "score", "type": "uint256"},
          {"name": "altitude", "type": "uint256"},
          {"name": "gameTime", "type": "uint256"},
          {"name": "timestamp", "type": "uint256"},
          {"name": "player", "type": "address"}
        ]
      }
    ]
  },
  {
    "type": "function",
    "name": "getPlayerStats",
    "stateMutability": "view",
    "inputs": [
      {"name": "_player", "type": "address"}
    ],
    "outputs": [
      {"name": "totalGames", "type": "uint256"},
      {"name": "bestScore", "type": "uint256"},
      {"name": "totalTokens", "type": "uint256"}
    ]
  },
  {
    "type": "function",
    "name": "purchaseRevive",
    "stateMutability": "nonpayable",
    "inputs": [],
    "outputs": []
  },
  {
    "type": "function",
    "name": "getCurrentWeek",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      {"name": "", "type": "uint256"}
    ]
  },
  {
    "type": "function",
    "name": "balanceOf",
    "stateMutability": "view",
    "inputs": [
      {"name": "account", "type": "address"}
    ],
    "outputs": [
      {"name": "", "type": "uint256"}
    ]
  }
] as const

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

// Utility functions for address and number formatting
export function formatAddress(address: string): string {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`
  }
  return num.toString()
}

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
