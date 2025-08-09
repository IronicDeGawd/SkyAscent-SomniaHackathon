'use client'

import { useState, useEffect } from 'react'
import { useApp } from '../providers'
import Link from 'next/link'
import { GAME_CONTRACT_ABI, getGameContractAddress, type LeaderboardEntry, type GameSession } from '../../utils/blockchain'
import { useReadContract, useAccount } from 'wagmi'

export default function ScoresPage() {
  const { user } = useApp()
  const { address: userWalletAddress } = useAccount()
  const [activeTab, setActiveTab] = useState<'weekly' | 'history'>('weekly')
  const [weeklyLeaderboard, setWeeklyLeaderboard] = useState<LeaderboardEntry[]>([])
  const [playerHistory, setPlayerHistory] = useState<GameSession[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const contractAddress = getGameContractAddress()

  // Get current week for leaderboard query  
  const { data: currentWeek } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: GAME_CONTRACT_ABI,
    functionName: 'getCurrentWeek',
    query: { enabled: !!contractAddress }
  })

  // Get weekly leaderboard
  const { data: weeklyLeaderboardData, isLoading: leaderboardLoading } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: GAME_CONTRACT_ABI,
    functionName: 'getWeeklyTopScores',
    args: currentWeek ? [currentWeek, BigInt(50)] : undefined,
    query: { 
      enabled: !!contractAddress && currentWeek !== undefined,
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  })

  // Get player history if wallet is connected
  const { data: playerHistoryData, isLoading: historyLoading } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: GAME_CONTRACT_ABI,
    functionName: 'getPlayerGameHistory',
    args: userWalletAddress ? [userWalletAddress, BigInt(20)] : undefined,
    query: { 
      enabled: !!contractAddress && !!userWalletAddress,
      refetchInterval: 10000, // Refetch every 10 seconds
    }
  })

  // Update leaderboard data
  useEffect(() => {
    setIsLoading(leaderboardLoading || (activeTab === 'history' && historyLoading))
    
    if (weeklyLeaderboardData) {
      console.log("🏆 Scores page - Leaderboard data from blockchain:", {
        contractAddress,
        currentWeek: Number(currentWeek),
        entriesCount: (weeklyLeaderboardData as unknown[]).length,
        rawData: weeklyLeaderboardData
      })
      
      const formattedLeaderboard = (weeklyLeaderboardData as unknown[]).map((entry: unknown) => {
        const typedEntry = entry as { player: string; score: bigint; altitude: bigint; timestamp: bigint };
        return {
          player: typedEntry.player,
          score: Number(typedEntry.score),
          altitude: Number(typedEntry.altitude),
          timestamp: Number(typedEntry.timestamp) * 1000, // Convert to milliseconds
        };
      })
      
      setWeeklyLeaderboard(formattedLeaderboard)
    } else if (!leaderboardLoading) {
      console.log("📋 Scores page - No leaderboard data available", {
        contractAddress,
        currentWeek: Number(currentWeek),
        hasContract: !!contractAddress,
        hasCurrentWeek: currentWeek !== undefined
      })
      setWeeklyLeaderboard([])
    }
  }, [weeklyLeaderboardData, leaderboardLoading, currentWeek, contractAddress, historyLoading, activeTab])

  // Update player history data
  useEffect(() => {
    if (playerHistoryData && userWalletAddress) {
      console.log("🕐 Scores page - Player history from blockchain:", {
        contractAddress,
        userWalletAddress,
        sessionsCount: (playerHistoryData as unknown[]).length,
        rawData: playerHistoryData
      })
      
      const formattedHistory = (playerHistoryData as unknown[]).map((session: unknown) => {
        const typedSession = session as { score: bigint; altitude: bigint; gameTime: bigint; timestamp: bigint; player: string };
        return {
          score: Number(typedSession.score),
          altitude: Number(typedSession.altitude),
          gameTime: Number(typedSession.gameTime),
          timestamp: Number(typedSession.timestamp) * 1000, // Convert to milliseconds
          player: typedSession.player,
        };
      })
      
      setPlayerHistory(formattedHistory)
    } else if (!historyLoading && userWalletAddress) {
      console.log("📋 Scores page - No player history available", {
        contractAddress,
        userWalletAddress,
        hasContract: !!contractAddress,
        hasWallet: !!userWalletAddress
      })
      setPlayerHistory([])
    }
  }, [playerHistoryData, historyLoading, userWalletAddress, contractAddress])

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
                <h2 className="text-2xl font-semibold mb-4">This Week&apos;s Top Players</h2>
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