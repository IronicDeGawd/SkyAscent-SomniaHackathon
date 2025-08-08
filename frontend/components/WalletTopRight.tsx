"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useApp } from "../app/providers";
import { useEffect } from "react";

export function WalletTopRight() {
  const { isConnected, address } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { setWalletAddress, refreshPlayerStats } = useApp();

  // Update app context when wallet connection changes
  useEffect(() => {
    if (isConnected && address) {
      setWalletAddress(address);
      refreshPlayerStats();
    } else {
      setWalletAddress(null);
    }
  }, [isConnected, address, setWalletAddress, refreshPlayerStats]);

  return (
    <div className="fixed top-4 right-4 z-50">
      {isConnected ? (
        <button
          onClick={() => disconnect()}
          className="pixel-button px-3 py-1 text-xs"
          style={{
            backgroundColor: "#ef4444",
            borderColor: "#f87171",
          }}
        >
          Disconnect Wallet
        </button>
      ) : (
        <>
          {connectors.map((connector) => (
            <button
              key={connector.uid}
              onClick={() => connect({ connector })}
              disabled={isPending}
              className="pixel-button px-3 py-1 text-xs"
              style={{
                backgroundColor: "#22c55e",
                borderColor: "#4ade80",
              }}
            >
              {isPending ? "Connecting..." : "Connect Wallet"}
            </button>
          ))}
        </>
      )}
    </div>
  );
}
