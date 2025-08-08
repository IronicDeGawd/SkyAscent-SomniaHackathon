"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useApp } from "../app/providers";
import { useEffect, useState } from "react";
import { FaucetButton } from "./FaucetButton";

export function WalletConnection() {
  const { isConnected, address } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { setWalletAddress, refreshPlayerStats } = useApp();
  const [isFarcaster, setIsFarcaster] = useState(false);
  
  // Detect if we're in Farcaster environment
  useEffect(() => {
    const checkFarcaster = () => {
      // Check if we're in Farcaster iframe or app
      const isInFarcaster = 
        window.location !== window.parent.location || // In iframe
        window.navigator.userAgent.includes('Farcaster') ||
        document.referrer.includes('farcaster') ||
        window.location.href.includes('frame') ||
        typeof window !== 'undefined' && (window as any).farcasterSDK;
      
      setIsFarcaster(isInFarcaster);
    };
    
    checkFarcaster();
  }, []);

  // Update app context when wallet connection changes
  useEffect(() => {
    if (isConnected && address) {
      setWalletAddress(address);
      // Call refreshPlayerStats separately to avoid dependency issues
      setTimeout(() => refreshPlayerStats(), 100);
    } else {
      setWalletAddress(null);
    }
  }, [isConnected, address, setWalletAddress]); // Removed refreshPlayerStats from deps

  if (isConnected) {
    return (
      <div className="space-y-4">
        {/* Connection Status */}
        <div className="text-center">
          <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-500/20 text-green-400 mb-3">
            <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
            Wallet Connected
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="grid grid-cols-1 gap-3">
          <button
            onClick={() => disconnect()}
            className="w-full pixel-button text-lg mobile-ui-large mobile-touch-friendly px-6 py-3 text-white transition-all hover:scale-105"
            style={{
              backgroundColor: "#ef4444",
              borderColor: "#f87171",
            }}
          >
            🔌 Disconnect Wallet
          </button>
          <FaucetButton />
        </div>
      </div>
    );
  }

  // Get the best connector for the environment
  const getPreferredConnector = () => {
    if (isFarcaster) {
      // In Farcaster, prefer Farcaster connector if available
      const farcasterConnector = connectors.find(c => 
        c.name.toLowerCase().includes('farcaster') ||
        c.id.toLowerCase().includes('farcaster')
      );
      if (farcasterConnector) return farcasterConnector;
    }
    
    // Otherwise, prefer MetaMask or first available connector
    const metamaskConnector = connectors.find(c => 
      c.name.toLowerCase().includes('metamask')
    );
    return metamaskConnector || connectors[0];
  };
  
  const preferredConnector = getPreferredConnector();
  
  if (!preferredConnector) {
    return (
      <div className="text-center p-4">
        <p className="text-red-400 mb-4">No wallet connectors available</p>
        <FaucetButton />
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Connection Instructions */}
      <div className="text-center text-sm opacity-90 mb-4">
        {isFarcaster ? (
          <p>🎭 Connect your Farcaster wallet to get started</p>
        ) : (
          <p>🔗 Connect your wallet to save progress and earn tokens</p>
        )}
      </div>
      
      {/* Main Connect Button */}
      <div className="grid grid-cols-1 gap-3">
        <button
          onClick={() => connect({ connector: preferredConnector })}
          disabled={isPending}
          className="w-full pixel-button text-lg mobile-ui-large mobile-touch-friendly px-6 py-4 text-white transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
          style={{
            backgroundColor: isPending ? "#6b7280" : "#22c55e",
            borderColor: isPending ? "#9ca3af" : "#4ade80",
          }}
        >
          {isPending ? (
            <>
              <span className="animate-spin inline-block mr-2">🔄</span>
              Connecting...
            </>
          ) : (
            <>
              {isFarcaster ? "🎭" : "🔗"} Connect {preferredConnector.name}
            </>
          )}
        </button>
        
        {/* Show alternative connectors if available */}
        {connectors.length > 1 && !isPending && (
          <details className="text-center">
            <summary className="cursor-pointer text-sm opacity-75 hover:opacity-100 transition-opacity py-2">
              Other wallet options
            </summary>
            <div className="mt-3 space-y-3">
              {connectors
                .filter(connector => connector.uid !== preferredConnector.uid)
                .map((connector) => (
                <button
                  key={connector.uid}
                  onClick={() => connect({ connector })}
                  className="w-full pixel-button text-lg mobile-ui-large mobile-touch-friendly px-6 py-4 text-white transition-all hover:scale-105"
                  style={{
                    backgroundColor: "#6366f1",
                    borderColor: "#8b5cf6",
                  }}
                >
                  🔗 Connect {connector.name}
                </button>
              ))}
            </div>
          </details>
        )}
        
        <FaucetButton />
      </div>
    </div>
  );
}
