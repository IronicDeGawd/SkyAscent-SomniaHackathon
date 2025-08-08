'use client'

import { createContext, useContext, ReactNode, useEffect, useState } from 'react'
import { sdk } from '@farcaster/miniapp-sdk'
import { blockchainManager, type PlayerStats } from '../utils/blockchain'

interface User {
  fid: number
  username: string
  displayName?: string
  pfpUrl?: string
  custody?: string
  verifications?: string[]
}

interface AppContextType {
  user: User | null
  isLoading: boolean
  gameContract: any | null
  isAuthenticated: boolean
  playerStats: PlayerStats | null
  walletAddress: string | null
  connectWallet: () => Promise<void>
  signIn: () => Promise<void>
  signOut: () => void
  refreshPlayerStats: () => Promise<void>
}

const AppContext = createContext<AppContextType>({
  user: null,
  isLoading: true,
  gameContract: null,
  isAuthenticated: false,
  playerStats: null,
  walletAddress: null,
  connectWallet: async () => {},
  signIn: async () => {},
  signOut: () => {},
  refreshPlayerStats: async () => {}
})

export function Providers({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [gameContract, setGameContract] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [isFarcasterAvailable, setIsFarcasterAvailable] = useState(true)

  const signIn = async () => {
    try {
      setIsLoading(true)
      
      // Check if we're in a Farcaster environment
      if (typeof window === 'undefined' || !window.parent || window.parent === window) {
        // Not in Farcaster iframe, enable fallback mode
        console.log('Not in Farcaster environment, using fallback authentication')
        setUser({
          fid: 12345,
          username: 'demo_user',
          displayName: 'Demo User',
          pfpUrl: '/balloon_default.png'
        })
        setIsAuthenticated(true)
        setIsFarcasterAvailable(false)
        return
      }

      // Correct Farcaster SDK authentication flow
      // First, get user context
      const context = await sdk.context
      if (context?.user) {
        setUser({
          fid: context.user.fid,
          username: context.user.username || `user${context.user.fid}`,
          displayName: context.user.displayName,
          pfpUrl: context.user.pfpUrl
        })
        setIsAuthenticated(true)
        
        // Auto-connect wallet after authentication
        try {
          await connectWallet()
        } catch (error) {
          console.log('Wallet connection optional:', error)
        }
      } else {
        // If no user context, trigger authentication
        // Note: In production, this should redirect to Farcaster auth
        throw new Error('Authentication required - must be accessed from Farcaster app')
      }
    } catch (error) {
      console.error('Sign in failed:', error)
      // Fallback to demo mode if Farcaster fails
      setUser({
        fid: 12345,
        username: 'demo_user',
        displayName: 'Demo User (Fallback)',
        pfpUrl: '/balloon_default.png'
      })
      setIsAuthenticated(true)
      setIsFarcasterAvailable(false)
    } finally {
      setIsLoading(false)
    }
  }

  const connectWallet = async () => {
    try {
      setIsLoading(true)
      const address = await blockchainManager.connectWallet()
      setWalletAddress(address)
      if (address) {
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

  useEffect(() => {
    const initApp = async () => {
      try {
        // Always call ready() first to signal app has loaded
        await sdk.actions.ready()
        
        // Check if we're in a Farcaster environment
        if (typeof window === 'undefined' || !window.parent || window.parent === window) {
          setIsLoading(false)
          setIsFarcasterAvailable(false)
          return
        }

        // Check if user is already authenticated via context
        try {
          const context = await sdk.context
          if (context?.user?.fid) {
            setUser({
              fid: context.user.fid,
              username: context.user.username || `user${context.user.fid}`,
              displayName: context.user.displayName,
              pfpUrl: context.user.pfpUrl
            })
            setIsAuthenticated(true)
          }
        } catch (error) {
          console.log('No existing authentication found')
        }

        setIsLoading(false)
      } catch (error) {
        console.error('Failed to initialize app:', error)
        setIsLoading(false)
        setIsFarcasterAvailable(false)
      }
    }

    initApp()
  }, [])

  const value = {
    user,
    isLoading,
    gameContract,
    isAuthenticated,
    playerStats,
    walletAddress,
    connectWallet,
    signIn,
    signOut,
    refreshPlayerStats
  }

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within Providers')
  }
  return context
}