"use client";

import { useState, useEffect } from "react";
import { useApp } from "../providers";
import Link from "next/link";

export default function SettingsPage() {
  const { user } = useApp();
  const [settings, setSettings] = useState({
    soundEnabled: true,
    musicEnabled: true,
    hapticFeedback: true,
    controlSensitivity: 5,
    showTutorial: true,
  });

  const [gameStats, setGameStats] = useState({
    totalGames: 0,
    bestScore: 0,
    totalTokens: 0,
    totalPlayTime: 0,
  });

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem("skyAscentSettings");
    if (savedSettings) {
      setSettings({ ...settings, ...JSON.parse(savedSettings) });
    }

    // TODO: Load game stats from blockchain
    setGameStats({
      totalGames: 15,
      bestScore: 12500,
      totalTokens: 250,
      totalPlayTime: 1800, // seconds
    });
  }, []);

  const updateSetting = (key: string, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem("skyAscentSettings", JSON.stringify(newSettings));
  };

  const formatPlayTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const resetProgress = () => {
    if (
      confirm(
        "Are you sure you want to reset all game progress? This cannot be undone."
      )
    ) {
      // TODO: Implement progress reset
      console.log("Progress reset requested");
    }
  };

  return (
    <div className="min-h-screen bg-sky-extend text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">⚙️ Settings</h1>
          <p className="text-xl opacity-90">Game Configuration</p>
        </div>

        <div className="space-y-6">
          {/* Player Info */}
          {user && (
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Player Info</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Display Name:</span>
                  <span className="text-yellow-300">{user.displayName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Wallet Address:</span>
                  <span className="text-yellow-300 text-sm font-mono">
                    {user.address}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Game Stats */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Game Statistics</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-300">
                  {gameStats.totalGames}
                </div>
                <div className="text-sm opacity-75">Games Played</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-300">
                  {gameStats.bestScore.toLocaleString()}
                </div>
                <div className="text-sm opacity-75">Best Score</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-300">
                  {gameStats.totalTokens}
                </div>
                <div className="text-sm opacity-75">Total Tokens</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-300">
                  {formatPlayTime(gameStats.totalPlayTime)}
                </div>
                <div className="text-sm opacity-75">Play Time</div>
              </div>
            </div>
          </div>

          {/* Audio Settings */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Audio Settings</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Sound Effects</span>
                <button
                  onClick={() =>
                    updateSetting("soundEnabled", !settings.soundEnabled)
                  }
                  className={`w-12 h-6 rounded-full transition-colors ${
                    settings.soundEnabled ? "bg-yellow-500" : "bg-gray-500"
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full transition-transform ${
                      settings.soundEnabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span>Background Music</span>
                <button
                  onClick={() =>
                    updateSetting("musicEnabled", !settings.musicEnabled)
                  }
                  className={`w-12 h-6 rounded-full transition-colors ${
                    settings.musicEnabled ? "bg-yellow-500" : "bg-gray-500"
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full transition-transform ${
                      settings.musicEnabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Control Settings */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Control Settings</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Haptic Feedback</span>
                <button
                  onClick={() =>
                    updateSetting("hapticFeedback", !settings.hapticFeedback)
                  }
                  className={`w-12 h-6 rounded-full transition-colors ${
                    settings.hapticFeedback ? "bg-yellow-500" : "bg-gray-500"
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full transition-transform ${
                      settings.hapticFeedback
                        ? "translate-x-6"
                        : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span>Control Sensitivity</span>
                  <span className="text-yellow-300">
                    {settings.controlSensitivity}/10
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={settings.controlSensitivity}
                  onChange={(e) =>
                    updateSetting(
                      "controlSensitivity",
                      parseInt(e.target.value)
                    )
                  }
                  className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Game Settings */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Game Settings</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Show Tutorial</span>
                <button
                  onClick={() =>
                    updateSetting("showTutorial", !settings.showTutorial)
                  }
                  className={`w-12 h-6 rounded-full transition-colors ${
                    settings.showTutorial ? "bg-yellow-500" : "bg-gray-500"
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full transition-transform ${
                      settings.showTutorial ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <button
                onClick={resetProgress}
                className="w-full pixel-button mobile-touch-friendly px-4 py-2 text-white"
                style={{
                  backgroundColor: "#ef4444",
                  borderColor: "#f87171",
                }}
              >
                🗑️ Reset All Progress
              </button>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-8 space-y-3">
          <Link href="/game" className="block">
            <button
              className="w-full pixel-button mobile-touch-friendly px-6 py-3 text-white"
              style={{
                backgroundColor: "#10b981",
                borderColor: "#34d399",
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
  );
}
