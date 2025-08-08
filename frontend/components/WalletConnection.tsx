'use client'

import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { useApp } from '../app/providers'
import { useEffect } from 'react'
import { FaucetButton } from './FaucetButton'

export function WalletConnection() {
  const { isConnected, address } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const { setWalletAddress, refreshPlayerStats } = useApp()

  // Update app context when wallet connection changes
  useEffect(() => {
    if (isConnected && address) {
      setWalletAddress(address)
      refreshPlayerStats()
    } else {
      setWalletAddress(null)
    }
  }, [isConnected, address, setWalletAddress, refreshPlayerStats])

  if (isConnected) {
    return (
      <div className="flex flex-col space-y-3">
        <div className="text-sm text-green-400 text-center mb-2">
          ✅ Wallet Connected
        </div>
        <button
          onClick={() => disconnect()}
          className="pixel-button px-6 py-3 text-sm w-full"
          style={{
            backgroundColor: '#ef4444',
            borderColor: '#f87171'
          }}
        >
          🔌 Disconnect Wallet
        </button>
        <FaucetButton />
      </div>
    )
  }

  return (
    <div className="flex flex-col space-y-3">
      {connectors.map((connector) => (
        <button
          key={connector.uid}
          onClick={() => connect({ connector })}
          disabled={isPending}
          className="pixel-button px-6 py-3 text-sm w-full"
          style={{
            backgroundColor: '#22c55e',
            borderColor: '#4ade80'
          }}
        >
          {isPending ? '🔄 Connecting...' : '🔗 Connect Wallet'}
        </button>
      ))}
      <div className="text-xs opacity-75 text-center mt-2 mb-1">
        Need test tokens?
      </div>
      <FaucetButton />
    </div>
  )
}