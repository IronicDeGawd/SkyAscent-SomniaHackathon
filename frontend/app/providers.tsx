'use client'

import { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react'
import { blockchainManager, type PlayerStats } from '../utils/blockchain'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { wagmiConfig } from '../utils/wagmi'
import { sdk } from '@farcaster/miniapp-sdk'

interface User {
  address: string
  displayName: string
  fid?: number
  username?: string
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
  const [isLoading, setIsLoading] = useState(true)
  const [gameContract, setGameContract] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [farcasterUser, setFarcasterUser] = useState<{ fid: number, username?: string } | null>(null)

  useEffect(() => {
    const initFarcaster = async () => {
      try {
        // Initialize Farcaster SDK and get context
        await sdk.actions.ready()
        const context = await sdk.context
        
        if (context?.user) {
          setFarcasterUser({ 
            fid: context.user.fid, 
            username: context.user.username || context.user.displayName
          })
        }
      } catch (error) {
        console.log('Farcaster context not available:', error)
        // This is fine - we'll fall back to wallet-only mode
      }
      
      // Don't auto-connect wallet here to prevent conflicts with wagmi
      setIsLoading(false)
    }

    initFarcaster()
  }, [])
  
  const refreshPlayerStats = useCallback(async () => {
    if (!walletAddress) return
    
    try {
      const stats = await blockchainManager.getPlayerStats(walletAddress)
      setPlayerStats(stats)
    } catch (error) {
      console.error('Failed to refresh player stats:', error)
    }
  }, [walletAddress])

  // Separate effect to refresh player stats when wallet address changes
  useEffect(() => {
    if (walletAddress) {
      refreshPlayerStats()
    }
  }, [walletAddress, refreshPlayerStats])

  const connectWallet = useCallback(async () => {
    try {
      if (!isLoading) setIsLoading(true)
      const address = await blockchainManager.connectWallet()
      setWalletAddress(address)
      if (address) {
        // Combine Farcaster and wallet info
        const displayName = farcasterUser?.username || `${address.slice(0, 6)}...${address.slice(-4)}`
        setUser({
          address: address,
          displayName,
          fid: farcasterUser?.fid,
          username: farcasterUser?.username
        })
        setIsAuthenticated(true)
        // Don't call refreshPlayerStats here to prevent loops
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error)
    } finally {
      if (isLoading) setIsLoading(false)
    }
  }, [farcasterUser, isLoading])

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