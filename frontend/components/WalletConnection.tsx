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
        <div className="flex items-center justify-between">
          <div className="text-sm text-green-400">
            Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
          </div>
          <button
            onClick={() => disconnect()}
            className="pixel-button px-4 py-2 text-xs"
            style={{
              backgroundColor: '#ef4444',
              borderColor: '#f87171'
            }}
          >
            Disconnect
          </button>
        </div>
        <div className="flex items-center justify-center">
          <FaucetButton />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center space-y-3">
      <div className="flex items-center space-x-3">
        {connectors.map((connector) => (
          <button
            key={connector.uid}
            onClick={() => connect({ connector })}
            disabled={isPending}
            className="pixel-button px-4 py-2 text-sm"
            style={{
              backgroundColor: '#22c55e',
              borderColor: '#4ade80'
            }}
          >
            {isPending ? 'Connecting...' : 'Connect Wallet'}
          </button>
        ))}
      </div>
      <div className="text-xs opacity-75 text-center">
        Need test tokens?
      </div>
      <FaucetButton />
    </div>
  )
}