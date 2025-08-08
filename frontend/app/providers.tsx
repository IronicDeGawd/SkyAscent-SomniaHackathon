'use client'

import { createContext, useContext, ReactNode, useState } from 'react'
import { blockchainManager, type PlayerStats } from '../utils/blockchain'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { wagmiConfig } from '../utils/wagmi'

interface User {
  address: string
  displayName: string
}

interface AppContextType {
  user: User | null
  isLoading: boolean
  gameContract: any | null
  isAuthenticated: boolean
  playerStats: PlayerStats | null
  walletAddress: string | null
  connectWallet: () => Promise<void>
  signOut: () => void
  refreshPlayerStats: () => Promise<void>
  setWalletAddress: (address: string | null) => void
}

const AppContext = createContext<AppContextType>({
  user: null,
  isLoading: true,
  gameContract: null,
  isAuthenticated: false,
  playerStats: null,
  walletAddress: null,
  connectWallet: async () => {},
  signOut: () => {},
  refreshPlayerStats: async () => {},
  setWalletAddress: () => {}
})

// Create a client for react-query
const queryClient = new QueryClient()

export function Providers({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [gameContract, setGameContract] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)


  const connectWallet = async () => {
    try {
      setIsLoading(true)
      const address = await blockchainManager.connectWallet()
      setWalletAddress(address)
      if (address) {
        // Set user based on wallet address
        setUser({
          address: address,
          displayName: `${address.slice(0, 6)}...${address.slice(-4)}`
        })
        setIsAuthenticated(true)
        await refreshPlayerStats()
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const refreshPlayerStats = async () => {
    if (!walletAddress) return
    
    try {
      const stats = await blockchainManager.getPlayerStats(walletAddress)
      setPlayerStats(stats)
    } catch (error) {
      console.error('Failed to refresh player stats:', error)
    }
  }

  const signOut = () => {
    setUser(null)
    setIsAuthenticated(false)
    setPlayerStats(null)
    setWalletAddress(null)
  }


  const value = {
    user,
    isLoading,
    gameContract,
    isAuthenticated,
    playerStats,
    walletAddress,
    connectWallet,
    signOut,
    refreshPlayerStats,
    setWalletAddress
  }

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <AppContext.Provider value={value}>
          {children}
        </AppContext.Provider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export const useApp = () => {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within Providers')
  }
  return context
}