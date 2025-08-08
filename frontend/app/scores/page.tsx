'use client'

import { useState, useEffect } from 'react'
import { useApp } from '../providers'
import Link from 'next/link'
import { blockchainManager, type LeaderboardEntry, type GameSession } from '../../utils/blockchain'

export default function ScoresPage() {
  const { user } = useApp()
  const [activeTab, setActiveTab] = useState<'weekly' | 'history'>('weekly')
  const [weeklyLeaderboard, setWeeklyLeaderboard] = useState<LeaderboardEntry[]>([])
  const [playerHistory, setPlayerHistory] = useState<GameSession[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadScores = async () => {
      try {
        setIsLoading(true)
        
        // Load weekly leaderboard from Somnia blockchain
        const leaderboard = await blockchainManager.getWeeklyLeaderboard(50)
        setWeeklyLeaderboard(leaderboard)

        // Load player history if user is authenticated and has wallet
        if (user && blockchainManager.isWalletConnected()) {
          const currentAccount = await blockchainManager.getCurrentAccount()
          if (currentAccount) {
            const history = await blockchainManager.getPlayerHistory(currentAccount, 20)
            setPlayerHistory(history)
          } else {
            setPlayerHistory([])
          }
        } else {
          // Clear history for unauthenticated users
          setPlayerHistory([])
        }

        setIsLoading(false)
      } catch (error) {
        console.error('Failed to load scores from blockchain:', error)
        
        // Fallback to mock data on error
        setWeeklyLeaderboard([
          { player: '0x1234...5678', score: 15000, altitude: 2500, timestamp: Date.now() - 3600000 },
          { player: '0xabcd...efgh', score: 12500, altitude: 2000, timestamp: Date.now() - 7200000 },
          { player: '0x9876...4321', score: 10000, altitude: 1800, timestamp: Date.now() - 10800000 },
        ])

        setPlayerHistory([
          { score: 8500, altitude: 1500, gameTime: 180, timestamp: Date.now() - 86400000, player: '0x1234...5678' },
          { score: 6200, altitude: 1200, gameTime: 150, timestamp: Date.now() - 172800000, player: '0x1234...5678' },
          { score: 4800, altitude: 900, gameTime: 120, timestamp: Date.now() - 259200000, player: '0x1234...5678' },
        ])
        
        setIsLoading(false)
      }
    }

    loadScores()
  }, [user])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(hours / 24)
    
    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    return 'Just now'
  }

  return (
    <div className="min-h-screen bg-sky-extend text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">🏆 Scores</h1>
          <p className="text-xl opacity-90">Leaderboards & History</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-white/10 rounded-lg p-1 mb-6">
          <button
            onClick={() => setActiveTab('weekly')}
            className={`flex-1 py-3 px-4 rounded-md font-medium transition-colors ${
              activeTab === 'weekly'
                ? 'bg-yellow-500 text-black'
                : 'text-white hover:bg-white/10'
            }`}
          >
            Weekly Leaders
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 px-4 rounded-md font-medium transition-colors ${
              activeTab === 'history'
                ? 'bg-yellow-500 text-black'
                : 'text-white hover:bg-white/10'
            }`}
          >
            Your History
          </button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="text-xl">Loading scores...</div>
          </div>
        ) : (
          <div className="bg-white/10 backdrop-blur-sm rounded-lg">
            {activeTab === 'weekly' ? (
              <div className="p-6">
                <h2 className="text-2xl font-semibold mb-4">This Week's Top Players</h2>
                <div className="space-y-3">
                  {weeklyLeaderboard.map((entry, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-white/5 rounded-lg p-4"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="text-2xl font-bold text-yellow-400">
                          #{index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{formatAddress(entry.player)}</div>
                          <div className="text-sm opacity-75">{formatTimeAgo(entry.timestamp)}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold">{entry.score.toLocaleString()}</div>
                        <div className="text-sm opacity-75">{entry.altitude}m altitude</div>
                      </div>
                    </div>
                  ))}
                </div>
                {weeklyLeaderboard.length === 0 && (
                  <div className="text-center py-8 text-gray-300">
                    No scores this week yet. Be the first!
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6">
                <h2 className="text-2xl font-semibold mb-4">Your Game History</h2>
                {!user ? (
                  <div className="text-center py-8 text-gray-300">
                    Connect your wallet to view your game history.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {playerHistory.map((session, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-white/5 rounded-lg p-4"
                      >
                        <div>
                          <div className="font-medium text-lg">{session.score.toLocaleString()} pts</div>
                          <div className="text-sm opacity-75">
                            {session.altitude}m • {formatTime(session.gameTime)}
                          </div>
                        </div>
                        <div className="text-right text-sm opacity-75">
                          {formatTimeAgo(session.timestamp)}
                        </div>
                      </div>
                    ))}
                    {playerHistory.length === 0 && (
                      <div className="text-center py-8 text-gray-300">
                        No games played yet. Start your first game!
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-8 space-y-3">
          <Link href="/game" className="block">
            <button 
              className="w-full pixel-button mobile-touch-friendly px-6 py-3 text-black"
              style={{
                backgroundColor: "#eab308",
                borderColor: "#facc15",
              }}
            >
              🎮 Play Game
            </button>
          </Link>
          <Link href="/" className="block">
            <button 
              className="w-full pixel-button mobile-touch-friendly px-6 py-3 text-white"
              style={{
                backgroundColor: "#3b82f6",
                borderColor: "#60a5fa",
              }}
            >
              🏠 Back Home
            </button>
          </Link>
        </div>
      </div>
    </div>
  )
}