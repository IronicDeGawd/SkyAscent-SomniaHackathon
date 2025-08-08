"use client";

import { useState, useEffect } from "react";
import { useApp } from "./providers";
import Link from "next/link";
import Image from "next/image";
import { blockchainManager } from "../utils/blockchain";
import { WalletConnection } from "../components/WalletConnection";

export default function HomePage() {
  const {
    user,
    isLoading,
    isAuthenticated,
    signIn,
    playerStats,
    walletAddress,
  } = useApp();
  const [gameStats, setGameStats] = useState({
    totalGames: 0,
    bestScore: 0,
    totalTokens: 0,
  });
  const [weeklyLeaderboard, setWeeklyLeaderboard] = useState<any[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);

  useEffect(() => {
    if (playerStats) {
      setGameStats({
        totalGames: playerStats.totalGames,
        bestScore: playerStats.bestScore,
        totalTokens: playerStats.totalTokens,
      });
    }
  }, [playerStats]);

  // Load weekly leaderboard
  useEffect(() => {
    const loadLeaderboard = async () => {
      setLeaderboardLoading(true);
      try {
        const leaderboard = await blockchainManager.getWeeklyLeaderboard(3);
        setWeeklyLeaderboard(leaderboard);
      } catch (error) {
        console.error("Failed to load leaderboard:", error);
        // Fallback to demo data
        setWeeklyLeaderboard([
          { player: "0x1234...5678", score: 15420, altitude: 8500 },
          { player: "0xabcd...efgh", score: 12890, altitude: 7200 },
          { player: "0x9876...4321", score: 11350, altitude: 6800 },
        ]);
      } finally {
        setLeaderboardLoading(false);
      }
    };

    loadLeaderboard();
  }, []);

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          backgroundImage: "url(/bg.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="text-white text-xl bg-black/30 rounded-lg p-6 backdrop-blur-sm">
          Loading Sky Ascent...
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen text-white relative overflow-hidden bg-sky-extend"
    >
      {/* Flowing cloud decorations distributed across full screen */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Top section clouds - horizontal movement */}
        <Image
          src="/cloud1.png"
          alt=""
          width={80}
          height={48}
          className="absolute opacity-30 pixel-perfect"
          style={{ 
            imageRendering: "pixelated",
            top: "4rem",
            left: "-120px",
            animation: "cloudFloat 25s linear infinite"
          }}
        />
        <Image
          src="/cloud2.png"
          alt=""
          width={60}
          height={40}
          className="absolute opacity-25 pixel-perfect"
          style={{ 
            imageRendering: "pixelated",
            top: "8rem",
            left: "-120px",
            animation: "cloudFloat 30s linear infinite",
            animationDelay: "3s"
          }}
        />
        
        {/* Upper-middle section clouds - floating in place */}
        <Image
          src="/cloud1.png"
          alt=""
          width={100}
          height={60}
          className="absolute opacity-35 pixel-perfect"
          style={{ 
            imageRendering: "pixelated",
            top: "12rem",
            left: "25%",
            animation: "cloudBob 8s ease-in-out infinite"
          }}
        />
        <Image
          src="/cloud2.png"
          alt=""
          width={70}
          height={45}
          className="absolute opacity-20 pixel-perfect"
          style={{ 
            imageRendering: "pixelated",
            top: "16rem",
            right: "2rem",
            animation: "cloudBob 10s ease-in-out infinite",
            animationDelay: "2s"
          }}
        />
        
        {/* Middle section clouds - gentle drift */}
        <Image
          src="/cloud1.png"
          alt=""
          width={90}
          height={55}
          className="absolute opacity-30 pixel-perfect"
          style={{ 
            imageRendering: "pixelated",
            top: "50%",
            left: "2rem",
            transform: "translateY(-50%)",
            animation: "cloudDrift 15s ease-in-out infinite"
          }}
        />
        <Image
          src="/cloud2.png"
          alt=""
          width={85}
          height={50}
          className="absolute opacity-25 pixel-perfect"
          style={{ 
            imageRendering: "pixelated",
            top: "45%",
            right: "25%",
            transform: "translateY(-50%)",
            animation: "cloudDrift 12s ease-in-out infinite",
            animationDelay: "4s"
          }}
        />
        
        {/* Lower-middle section clouds */}
        <Image
          src="/cloud1.png"
          alt=""
          width={75}
          height={45}
          className="absolute opacity-35 pixel-perfect"
          style={{ 
            imageRendering: "pixelated",
            bottom: "20rem",
            left: "4rem",
            animation: "cloudBob 9s ease-in-out infinite",
            animationDelay: "1s"
          }}
        />
        <Image
          src="/cloud2.png"
          alt=""
          width={95}
          height={55}
          className="absolute opacity-20 pixel-perfect"
          style={{ 
            imageRendering: "pixelated",
            bottom: "24rem",
            right: "1rem",
            animation: "cloudDrift 14s ease-in-out infinite",
            animationDelay: "3s"
          }}
        />
        
        {/* Bottom section clouds */}
        <Image
          src="/cloud1.png"
          alt=""
          width={65}
          height={40}
          className="absolute opacity-35 pixel-perfect"
          style={{ 
            imageRendering: "pixelated",
            bottom: "10rem",
            left: "33%",
            animation: "cloudBob 7s ease-in-out infinite",
            animationDelay: "1.5s"
          }}
        />
        <Image
          src="/cloud2.png"
          alt=""
          width={75}
          height={48}
          className="absolute opacity-20 pixel-perfect"
          style={{ 
            imageRendering: "pixelated",
            bottom: "5rem",
            right: "2rem",
            animation: "cloudBob 11s ease-in-out infinite",
            animationDelay: "2.5s"
          }}
        />
        <Image
          src="/cloud1.png"
          alt=""
          width={70}
          height={42}
          className="absolute opacity-30 pixel-perfect"
          style={{ 
            imageRendering: "pixelated",
            bottom: "15rem",
            left: "1rem",
            animation: "cloudDrift 13s ease-in-out infinite",
            animationDelay: "4s"
          }}
        />
      </div>

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mb-4 flex justify-center">
            <Image
              src="/balloon_default.png"
              alt="Sky Ascent Balloon"
              width={88.86}
              height={128}
              className="pixel-perfect animate-bounce"
              style={{
                imageRendering: "pixelated",
                width: "88.86px",
                height: "128px",
                // minWidth: "311px",
                // minHeight: "448px",
                // maxWidth: "311px",
                // maxHeight: "448px",
              }}
            />
          </div>
          <h1 className="text-4xl font-bold mb-2 retro-glow">Sky Ascent</h1>
          <p className="text-xl opacity-90">Navigate through the clouds!</p>
        </div>

        {/* Authentication Section */}
        {!isAuthenticated ? (
          <div className="bg-white-10 rounded-lg p-6 mb-6 backdrop-blur-sm text-center">
            <h2 className="text-xl font-semibold mb-4">
              Welcome to Sky Ascent!
            </h2>
            <p className="text-sm opacity-90 mb-4">
              Sign in with Farcaster to save your progress, earn SKYC tokens,
              and compete on leaderboards!
            </p>
            <button
              onClick={signIn}
              disabled={isLoading}
              className="pixel-button mobile-touch-friendly px-6 py-3 text-white"
              style={{
                backgroundColor: "#5b21b6",
                borderColor: "#7c3aed",
              }}
            >
              {isLoading ? "Connecting..." : "🔗 Sign in with Farcaster"}
            </button>
          </div>
        ) : (
          <div className="bg-white-10 rounded-lg p-4 mb-6 backdrop-blur-sm">
            <h2 className="text-xl font-semibold mb-2">Player Profile</h2>
            <div className="flex items-center space-x-3 mb-2">
              {user?.pfpUrl && (
                <img
                  src={user.pfpUrl}
                  alt="Profile"
                  className="w-8 h-8 rounded-full"
                />
              )}
              <div>
                <p className="text-sm font-medium">
                  {user?.displayName || user?.username}
                </p>
                <p className="text-xs opacity-75">FID: {user?.fid}</p>
              </div>
            </div>
            <div className="flex justify-between mt-3 text-sm">
              <span>🎮 Games: {gameStats.totalGames}</span>
              <span>🏆 Best: {gameStats.bestScore}</span>
            </div>
            <div className="flex justify-between mt-2 text-sm">
              <span className="text-yellow-300">
                🪙 SKYC: {gameStats.totalTokens}
              </span>
              {walletAddress && (
                <span className="text-green-300 text-xs">✅ Wallet</span>
              )}
            </div>
            {isAuthenticated && (
              <div className="mt-3">
                <WalletConnection />
              </div>
            )}
          </div>
        )}

        {/* Main Actions */}
        <div className="space-y-4 mb-8">
          <Link href="/game" className="block">
            <button
              className="w-full pixel-button text-xl mobile-ui-large mobile-touch-friendly px-6 py-4 text-black"
              style={{
                backgroundColor: "#eab308",
                borderColor: "#facc15",
              }}
            >
              🎮 Start Game
            </button>
          </Link>

          <Link href="/scores" className="block">
            <button
              className="w-full pixel-button mobile-touch-friendly px-6 py-3 text-white"
              style={{
                backgroundColor: "#3b82f6",
                borderColor: "#60a5fa",
              }}
            >
              🏆 View Scores
            </button>
          </Link>

          <Link href="/settings" className="block">
            <button
              className="w-full pixel-button mobile-touch-friendly px-6 py-3 text-white"
              style={{
                backgroundColor: "#6b7280",
                borderColor: "#9ca3af",
              }}
            >
              ⚙️ Settings
            </button>
          </Link>
        </div>

        {/* Weekly Leaderboard Preview */}
        <div className="bg-white-10 rounded-lg p-4 backdrop-blur-sm">
          <h2 className="text-xl font-semibold mb-4">🏅 This Week's Leaders</h2>
          <div className="space-y-2">
            {leaderboardLoading ? (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-sm">1. Loading...</span>
                  <span className="text-sm opacity-75">--- pts</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">2. Loading...</span>
                  <span className="text-sm opacity-75">--- pts</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">3. Loading...</span>
                  <span className="text-sm opacity-75">--- pts</span>
                </div>
              </>
            ) : weeklyLeaderboard.length > 0 ? (
              weeklyLeaderboard.map((entry, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-sm">
                    {index + 1}. {entry.player.slice(0, 6)}...
                    {entry.player.slice(-4)}
                  </span>
                  <span className="text-sm opacity-75">
                    {entry.score.toLocaleString()} pts
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center text-sm opacity-75">
                <p>🎈 Be the first to play!</p>
                <p>Start a game to appear on the leaderboard</p>
              </div>
            )}
          </div>
          <Link href="/scores" className="block mt-4">
            <button
              className="w-full pixel-button mobile-touch-friendly text-sm px-4 py-2 text-white transition-colors"
              style={{
                backgroundColor: "#7c3aed",
                borderColor: "#a855f7",
              }}
            >
              🏆 View Full Leaderboard →
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
