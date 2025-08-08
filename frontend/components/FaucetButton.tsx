'use client'

import { useState } from 'react'

export function FaucetButton() {
  const [isLoading, setIsLoading] = useState(false)

  const handleFaucetRequest = () => {
    setIsLoading(true)
    // Open official Somnia testnet faucet in new tab
    window.open('https://testnet.somnia.network/', '_blank')
    
    // Reset loading state after a brief moment
    setTimeout(() => {
      setIsLoading(false)
    }, 2000)
  }

  return (
    <button
      onClick={handleFaucetRequest}
      disabled={isLoading}
      className="pixel-button px-6 py-3 text-sm w-full"
      style={{
        backgroundColor: '#06b6d4',
        borderColor: '#22d3ee'
      }}
      title="Get free STT tokens for testing"
    >
      {isLoading ? '🔄 Opening...' : '🚰 Get STT Tokens'}
    </button>
  )
}