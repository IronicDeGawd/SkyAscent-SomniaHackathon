"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useApp } from "../app/providers";
import { useEffect, useState } from "react";

export function WalletNavbar() {
  const { isConnected, address } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { setWalletAddress, refreshPlayerStats } = useApp();
  const [isLoading, setIsLoading] = useState(false);
  const [showCopiedMessage, setShowCopiedMessage] = useState(false);

  // Update app context when wallet connection changes
  useEffect(() => {
    if (isConnected && address) {
      setWalletAddress(address);
      refreshPlayerStats();
    } else {
      setWalletAddress(null);
    }
  }, [isConnected, address, setWalletAddress, refreshPlayerStats]);

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

    // Open official Somnia testnet faucet in new tab
    window.open("https://testnet.somnia.network/", "_blank");

    // Reset loading state after a brief moment
    setTimeout(() => {
      setIsLoading(false);
    }, 2000);
  };

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="flex flex-col space-y-2 bg-black/20 backdrop-blur-sm rounded-lg p-3 min-w-[200px]">
        {isConnected ? (
          <>
            <div className="text-xs text-green-400 text-center mb-1">
              ✅ Wallet Connected
            </div>
            <button
              onClick={() => disconnect()}
              className="pixel-button px-4 py-2 text-xs w-full"
              style={{
                backgroundColor: "#ef4444",
                borderColor: "#f87171",
              }}
            >
              🔌 Disconnect Wallet
            </button>
          </>
        ) : (
          <>
            {connectors.map((connector) => (
              <button
                key={connector.uid}
                onClick={() => connect({ connector })}
                disabled={isPending}
                className="pixel-button px-4 py-2 text-xs w-full"
                style={{
                  backgroundColor: "#22c55e",
                  borderColor: "#4ade80",
                }}
              >
                {isPending ? "🔄 Connecting..." : "🔗 Connect Wallet"}
              </button>
            ))}
            <div className="text-xs opacity-75 text-center">
              Need test tokens?
            </div>
          </>
        )}

        <button
          onClick={handleFaucetRequest}
          disabled={isLoading}
          className="pixel-button px-4 py-2 text-xs w-full relative"
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
          <div className="text-xs text-green-400 text-center animate-pulse">
            📋 Address copied!
          </div>
        )}
      </div>
    </div>
  );
}
