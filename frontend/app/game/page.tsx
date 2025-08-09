"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useApp } from "../providers";
import { sdk } from "@farcaster/miniapp-sdk";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
} from "wagmi";
import {
  GAME_CONTRACT_ABI,
  getGameContractAddress,
} from "../../utils/blockchain";

// Dynamically import Phaser to avoid SSR issues
const PhaserGame = dynamic(() => import("../../components/PhaserGame"), {
  ssr: false,
});

// Function to generate witty comments based on game end reason
function getWittyComment(reason: string): string {
  if (reason.toLowerCase().includes("fuel")) {
    const fuelComments = [
      "You consumed more fuel than you can afford! Maybe try carpooling next time? 🚗",
      "Fuel efficiency: 0 stars. Your balloon has worse mileage than a monster truck! ⛽",
      "Running on empty? Should've packed a snack for your balloon! 🎈",
      "Next time, remember: balloons don't run on hopes and dreams! 💫",
    ];
    return fuelComments[Math.floor(Math.random() * fuelComments.length)];
  } else if (reason.toLowerCase().includes("bird")) {
    const birdComments = [
      "Mayday! Mayday! Watch your path for collision next time! 🐦",
      "That bird had right of way! Check your flight manual! 📖",
      "Bird strike! Your balloon insurance won't cover this one! 🛡️",
      "Angry Birds: 1, Your Balloon: 0. Game over! 🎯",
    ];
    return birdComments[Math.floor(Math.random() * birdComments.length)];
  } else if (reason.toLowerCase().includes("airplane")) {
    const airplaneComments = [
      "Mayday! Mayday! That airplane didn't see you coming! ✈️",
      "Air traffic control failed you! Better radar needed! 📡",
      "Wrong altitude! Passenger planes have priority! 🛩️",
      "Your balloon vs. Boeing? Physics wins every time! 💥",
    ];
    return airplaneComments[
      Math.floor(Math.random() * airplaneComments.length)
    ];
  } else if (reason.toLowerCase().includes("ufo")) {
    const ufoComments = [
      "Mayday! Aliens don't follow earth traffic rules! 🛸",
      "Close encounters of the balloon kind! You've been abducted... by failure! 👽",
      "UFO: 1, Earth Balloon: 0. They come in peace, but not for you! 🌌",
      "Interdimensional collision detected! Your insurance doesn't cover alien encounters! 🚀",
    ];
    return ufoComments[Math.floor(Math.random() * ufoComments.length)];
  } else {
    const genericComments = [
      "Something went wrong, but hey, at least you tried! 🤷",
      "Better luck next time, sky navigator! 🧭",
      "Every crash is a lesson in disguise! 📚",
      "The sky is vast, but your balloon skills need work! ☁️",
    ];
    return genericComments[Math.floor(Math.random() * genericComments.length)];
  }
}

export default function GamePage() {
  const router = useRouter();
  const { user, isAuthenticated } = useApp();
  const { address: walletAddress, isConnected: isWalletConnected } =
    useAccount();
  const [gameState, setGameState] = useState<
    "loading" | "playing" | "paused" | "ended"
  >("loading");
  const [currentScore, setCurrentScore] = useState(0);
  const [currentAltitude, setCurrentAltitude] = useState(0);
  const [fuel, setFuel] = useState(100);
  const [gameTime, setGameTime] = useState(0);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [tokensEarned, setTokensEarned] = useState(0);
  const [gameEndReason, setGameEndReason] = useState<string>("");

  // Wagmi hooks for contract interaction
  const { writeContract, data: hash, error, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
      timeout: 60_000, // 60 seconds timeout for transaction confirmation
    });

  // Handle transaction status changes
  useEffect(() => {
    if (error) {
      console.error("Transaction error details:", {
        error,
        message: error.message,
        cause: error.cause,
        stack: error.stack,
      });
      let errorMessage =
        "Failed to submit score to blockchain. Playing in offline mode.";

      // Provide more specific error messages based on error type
      if (error.message?.includes("User rejected")) {
        errorMessage =
          "Transaction was cancelled by user. Playing in offline mode.";
      } else if (error.message?.includes("insufficient funds")) {
        errorMessage =
          "Insufficient funds for transaction. Playing in offline mode.";
      } else if (error.message?.includes("network")) {
        errorMessage = "Network error occurred. Playing in offline mode.";
      } else if (error.message?.includes("execution reverted")) {
        if (error.message?.includes("Suspicious score")) {
          errorMessage =
            "Score validation failed. Score might be too high for game time (max 100 points/sec, max 50 altitude/sec). Playing in offline mode.";
        } else {
          errorMessage =
            "Contract execution failed. Score may not meet validation rules. Playing in offline mode.";
        }
      } else if (error.message?.includes("timeout")) {
        errorMessage =
          "Transaction timed out. Network may be congested. Playing in offline mode.";
      }

      setSubmissionError(errorMessage);
    }
  }, [error]);

  // Monitor transaction states
  useEffect(() => {
    console.log("Transaction states:", {
      isPending,
      isConfirming,
      isConfirmed,
      hash,
      error: !!error,
    });
  }, [isPending, isConfirming, isConfirmed, hash, error]);

  useEffect(() => {
    if (isConfirmed) {
      console.log("Score submitted successfully to blockchain:", hash);
      // Clear any previous error
      setSubmissionError(null);
    }
  }, [isConfirmed, hash]);

  // Debug information (can be removed in production)
  useEffect(() => {
    const contractAddress = getGameContractAddress();
    console.log("Debug Info:", {
      isAuthenticated,
      user: user?.address,
      isWalletConnected,
      walletAddress,
      contractAddress,
      gameState,
      canSubmitScore:
        isAuthenticated &&
        user &&
        isWalletConnected &&
        walletAddress &&
        contractAddress,
    });
  }, [isAuthenticated, user, isWalletConnected, walletAddress, gameState]);

  const handleGameEnd = async (
    finalScore: number,
    finalAltitude: number,
    finalTime: number,
    reason?: string
  ) => {
    setGameState("ended");
    setGameEndReason(reason || "Game Over");

    // Get contract address first
    const contractAddress = getGameContractAddress();

    console.log("Score submission attempt:", {
      finalScore,
      finalAltitude,
      finalTime,
      isAuthenticated,
      hasUser: !!user,
      userAddress: user?.address,
      isWalletConnected,
      walletAddress,
      contractAddress,
    });

    // Submit score to blockchain if user is authenticated and wallet is connected
    if (
      isAuthenticated &&
      user &&
      isWalletConnected &&
      walletAddress &&
      contractAddress
    ) {
      setSubmissionError(null);

      // Check if game time meets minimum requirement before attempting blockchain submission
      if (finalTime < 5) {
        const funMessages = [
          "🎈 Maybe play a little more to push scores to the blockchain! ⏱️",
          "🚀 Fly a bit longer to earn your spot on the leaderboard! ⭐",  
          "🎯 Need at least 5 seconds of flight time for blockchain glory! ⏰",
          "☁️ Your balloon needs more sky time before landing on the blockchain! 🌟",
          "⛽ Take your time and enjoy the flight - scores need 5+ seconds! 🎈"
        ];
        const randomMessage = funMessages[Math.floor(Math.random() * funMessages.length)];
        
        setSubmissionError(randomMessage);
        console.log("Game time too short for blockchain submission:", {
          finalTime,
          minimumRequired: 5,
          message: randomMessage
        });
        return; // Exit early, don't attempt blockchain submission
      }

      try {
        // Calculate expected tokens - BALANCED ECONOMICS
        const expectedTokens =
          Math.floor(finalScore / 1000) + Math.floor(finalAltitude / 500);
        setTokensEarned(expectedTokens);

        console.log("Submitting score to blockchain:", {
          contractAddress,
          walletAddress,
          score: finalScore,
          altitude: Math.floor(finalAltitude),
          time: Math.floor(finalTime),
          isWalletConnected,
          // Add validation debug info
          validationCheck: {
            minTime: finalTime >= 5,
            maxScorePerSecond: finalScore <= finalTime * 100,
            maxAltitudePerSecond: finalAltitude <= finalTime * 50,
            scoreRate: finalScore / finalTime,
            altitudeRate: finalAltitude / finalTime,
          },
        });

        // Submit score using wagmi
        console.log("About to call writeContract with:", {
          address: contractAddress as `0x${string}`,
          functionName: "submitScore",
          args: [
            BigInt(Math.floor(finalScore)),
            BigInt(Math.floor(finalAltitude)),
            BigInt(Math.floor(finalTime)),
          ],
        });

        const txResult = writeContract({
          address: contractAddress as `0x${string}`,
          abi: GAME_CONTRACT_ABI,
          functionName: "submitScore",
          args: [
            BigInt(Math.floor(finalScore)),
            BigInt(Math.floor(finalAltitude)),
            BigInt(Math.floor(finalTime)),
          ],
        });

        console.log("writeContract result:", txResult);
      } catch (error) {
        console.error("Failed to submit score:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        setSubmissionError(
          `Failed to submit score: ${errorMessage}. Playing in offline mode.`
        );
      }
    } else {
      let reason = "Cannot submit score: ";
      const reasons = [];

      if (!contractAddress) reasons.push("Contract not configured");
      if (!isAuthenticated) reasons.push("User not authenticated");
      if (!user) reasons.push("User data not available");
      if (!isWalletConnected) reasons.push("Wallet not connected");
      if (!walletAddress) reasons.push("Wallet address not available");

      reason += reasons.join(", ");

      console.log(reason, {
        contractAddress: !!contractAddress,
        isAuthenticated,
        hasUser: !!user,
        isWalletConnected,
        hasWalletAddress: !!walletAddress,
      });

      setSubmissionError(`Playing in offline mode: ${reasons.join(", ")}`);
    }

    console.log("Game ended:", { finalScore, finalAltitude, finalTime });
  };

  const handleShareScore = async () => {
    try {
      const shareText = `🎈 Just scored ${currentScore} points in Sky Ascent! Reached ${currentAltitude}m altitude in ${Math.floor(
        gameTime / 60
      )}:${(gameTime % 60)
        .toString()
        .padStart(2, "0")}. Can you beat my score?`;

      await sdk.actions.openUrl({
        url: `https://warpcast.com/~/compose?text=${encodeURIComponent(
          shareText
        )}&embeds[]=${encodeURIComponent("https://skyascent.vercel.app")}`,
      });
    } catch (error) {
      console.error("Failed to share score:", error);
    }
  };

  const handleRestart = () => {
    setCurrentScore(0);
    setCurrentAltitude(0);
    setFuel(100);
    setGameTime(0);
    setSubmissionError(null);
    setTokensEarned(0);
    setGameEndReason("");
    setGameState("playing");
  };

  const handleBackHome = () => {
    router.push("/");
  };

  useEffect(() => {
    // Auto-start the game when component loads
    const timer = setTimeout(() => {
      setGameState("playing");
    }, 1000); // Give time for Phaser to initialize

    return () => clearTimeout(timer);
  }, []);

  if (gameState === "loading") {
    return (
      <div className="min-h-screen bg-sky-extend flex items-center justify-center text-white">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🎈</div>
          <div className="text-xl">Loading game...</div>
          <div className="text-sm mt-2 opacity-75">
            Initializing Phaser engine...
          </div>
        </div>
      </div>
    );
  }

  if (gameState === "ended") {
    return (
      <div className="min-h-screen bg-sky-extend flex items-center justify-center text-white">
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-8 text-center max-w-md w-full mx-4">
          <h1 className="text-3xl font-bold mb-4">Game Over!</h1>

          {/* Witty game end reason */}
          <div className="bg-red-500/20 rounded-lg p-4 mb-4">
            <p className="text-red-300 font-semibold text-lg mb-1">
              {gameEndReason}
            </p>
            <p className="text-red-200 text-sm italic">
              {getWittyComment(gameEndReason)}
            </p>
          </div>

          <div className="space-y-2 mb-6">
            <p className="text-xl">Final Score: {currentScore}</p>
            <p className="text-lg">Max Altitude: {currentAltitude}m</p>
            <p className="text-lg">
              Time: {Math.floor(gameTime / 60)}:
              {(gameTime % 60).toString().padStart(2, "0")}
            </p>

            {isAuthenticated && tokensEarned > 0 && (
              <p className="text-yellow-300 text-lg font-bold">
                🪙 +{tokensEarned} SKYC Tokens!
              </p>
            )}
          </div>

          {(isPending || isConfirming) && (
            <div className="bg-blue-500/20 rounded-lg p-4 mb-4">
              <p className="text-blue-300 text-sm">
                {isPending
                  ? "📤 Submitting score to blockchain..."
                  : "⏳ Confirming transaction..."}
              </p>
            </div>
          )}

          {isConfirmed && !submissionError && (
            <div className="bg-green-500/20 rounded-lg p-4 mb-4">
              <p className="text-green-300 text-sm">
                ✅ Score submitted successfully!
              </p>
            </div>
          )}

          {submissionError && (
            <div className="bg-red-500/20 rounded-lg p-4 mb-4">
              <p className="text-red-300 text-sm">⚠️ {submissionError}</p>
              {!isWalletConnected && (
                <p className="text-red-200 text-xs mt-1">
                  💡 Tip: Try connecting your wallet again from the home page
                </p>
              )}
            </div>
          )}

          {!isAuthenticated && (
            <div className="bg-yellow-500/20 rounded-lg p-4 mb-4">
              <p className="text-yellow-300 text-sm">
                💡 Sign in to save your score and earn tokens!
              </p>
            </div>
          )}
          <div className="space-y-3">
            {isAuthenticated && (
              <button
                onClick={handleShareScore}
                className="w-full pixel-button mobile-touch-friendly px-6 py-3 text-white"
                style={{
                  backgroundColor: "#a855f7",
                  borderColor: "#c084fc",
                }}
              >
                📢 Share Score
              </button>
            )}
            <button
              onClick={handleRestart}
              className="w-full pixel-button mobile-touch-friendly px-6 py-3 text-black"
              style={{
                backgroundColor: "#eab308",
                borderColor: "#facc15",
              }}
            >
              🎮 Play Again
            </button>
            <button
              onClick={handleBackHome}
              className="w-full pixel-button mobile-touch-friendly px-6 py-3 text-white"
              style={{
                backgroundColor: "#3b82f6",
                borderColor: "#60a5fa",
              }}
            >
              🏠 Back Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative">
      {/* Game HUD */}
      <div
        className="absolute inset-0 z-10 bg-black-60 backdrop-blur-sm text-white p-4"
        style={{ top: 0, left: 0, right: 0, bottom: "auto" }}
      >
        <div className="flex justify-between items-center">
          <div className="flex space-x-4 text-sm text-base">
            <span
              className="game-stat"
              style={{
                backgroundColor: "rgba(59, 130, 246, 0.3)",
                borderColor: "#60a5fa",
              }}
            >
              🎯 {currentScore}
            </span>
            <span
              className="game-stat"
              style={{
                backgroundColor: "rgba(34, 197, 94, 0.3)",
                borderColor: "#4ade80",
              }}
            >
              📏 {currentAltitude}m
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm">Fuel:</span>
            <div
              className="w-16 w-20 h-3 rounded"
              style={{
                backgroundColor: "#4b5563",
                border: "1px solid #6b7280",
              }}
            >
              <div
                className={`h-full rounded transition-all`}
                style={{
                  width: `${fuel}%`,
                  backgroundColor:
                    fuel > 50 ? "#22c55e" : fuel > 25 ? "#eab308" : "#ef4444",
                  animation: fuel <= 25 ? "pulse 2s infinite" : "none",
                }}
              />
            </div>
            <span className="text-xs" style={{ fontFamily: "monospace" }}>
              {fuel}%
            </span>
          </div>
        </div>
      </div>

      {/* Phaser Game Container - Portrait Mode Optimized */}
      <div className="w-full h-screen flex items-center justify-center bg-black">
        <div className="portrait-game-container">
          <PhaserGame
            onScoreUpdate={setCurrentScore}
            onAltitudeUpdate={setCurrentAltitude}
            onFuelUpdate={setFuel}
            onTimeUpdate={setGameTime}
            onGameEnd={handleGameEnd}
            onGameStateChange={setGameState}
          />
        </div>
      </div>

      {/* Pause Menu */}
      {gameState === "paused" && (
        <div className="absolute inset-0 bg-black-80 flex items-center justify-center z-20">
          <div className="bg-white-10 backdrop-blur-sm rounded-lg p-8 text-center text-white">
            <h2 className="text-2xl font-bold mb-6">Game Paused</h2>
            <div className="space-y-3">
              <button
                onClick={() => setGameState("playing")}
                className="w-full pixel-button mobile-touch-friendly px-6 py-3 text-black"
                style={{
                  backgroundColor: "#eab308",
                  borderColor: "#facc15",
                }}
              >
                Resume
              </button>
              <button
                onClick={handleBackHome}
                className="w-full pixel-button mobile-touch-friendly px-6 py-3 text-white"
                style={{
                  backgroundColor: "#ef4444",
                  borderColor: "#f87171",
                }}
              >
                Quit Game
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
