"use client";

import { useState } from "react";
import { useAccount } from "wagmi";

export function FaucetButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [showCopiedMessage, setShowCopiedMessage] = useState(false);
  const { address } = useAccount();

  const handleFaucetRequest = async () => {
    setIsLoading(true);

    // Copy wallet address to clipboard if available
    if (address) {
      try {
        await navigator.clipboard.writeText(address);
        setShowCopiedMessage(true);
        setTimeout(() => setShowCopiedMessage(false), 2000);
      } catch (error) {
        console.error("Failed to copy wallet address:", error);
      }
    }

    // Open official Google Cloud Somnia testnet faucet in new tab
    window.open(
      "https://cloud.google.com/application/web3/faucet/somnia/shannon",
      "_blank"
    );

    // Reset loading state after a brief moment
    setTimeout(() => {
      setIsLoading(false);
    }, 2000);
  };

  return (
    <div className="relative">
      <button
        onClick={handleFaucetRequest}
        disabled={isLoading}
        className="pixel-button px-6 py-3 text-xs w-full"
        style={{
          backgroundColor: "#06b6d4",
          borderColor: "#22d3ee",
        }}
        title={
          address
            ? `Get STT tokens - Will copy wallet address (${address}) to clipboard`
            : "Get free STT tokens for testing"
        }
      >
        {isLoading ? "🔄 Opening..." : "🚰 Get STT Tokens"}
      </button>

      {showCopiedMessage && (
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs text-green-400 text-center animate-pulse whitespace-nowrap">
          📋 Address copied!
        </div>
      )}
    </div>
  );
}
