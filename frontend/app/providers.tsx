"use client";

import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
  useCallback,
} from "react";
import { blockchainManager, type PlayerStats } from "../utils/blockchain";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { wagmiConfig } from "../utils/wagmi";
import { sdk } from "@farcaster/miniapp-sdk";

interface User {
  address: string;
  displayName: string;
  fid?: number;
  username?: string;
}

interface AppContextType {
  user: User | null;
  isLoading: boolean;
  gameContract: unknown | null;
  isAuthenticated: boolean;
  playerStats: PlayerStats | null;
  walletAddress: string | null;
  connectWallet: () => Promise<void>;
  signOut: () => void;
  refreshPlayerStats: () => Promise<void>;
  setWalletAddress: (address: string | null) => void;
}

const AppContext = createContext<AppContextType>({
  user: null,
  isLoading: true,
  gameContract: null,
  isAuthenticated: false,
  playerStats: null,
  walletAddress: null,
  connectWallet: async () => {},
  signOut: () => {},
  refreshPlayerStats: async () => {},
  setWalletAddress: () => {},
});

// Create a client for react-query
const queryClient = new QueryClient();

function InnerProviders({ children }: { children: ReactNode }) {
  const { address: wagmiAddress, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [gameContract] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [farcasterUser, setFarcasterUser] = useState<{
    fid: number;
    username?: string;
  } | null>(null);

  useEffect(() => {
    const initFarcaster = async () => {
      try {
        // Initialize Farcaster SDK and get context
        await sdk.actions.ready();
        const context = await sdk.context;

        if (context?.user) {
          setFarcasterUser({
            fid: context.user.fid,
            username: context.user.username || context.user.displayName,
          });
        }
      } catch (error) {
        console.log("Farcaster context not available:", error);
        // This is fine - we'll fall back to wallet-only mode
      }

      setIsLoading(false);
    };

    initFarcaster();
  }, []);

  // Sync wagmi wallet state with local state
  useEffect(() => {
    if (isConnected && wagmiAddress && wagmiAddress !== walletAddress) {
      setWalletAddress(wagmiAddress);
      console.log("Wallet connected via wagmi:", wagmiAddress);
    } else if (!isConnected && walletAddress) {
      setWalletAddress(null);
      console.log("Wallet disconnected");
    }
  }, [isConnected, wagmiAddress, walletAddress]);

  const refreshPlayerStats = useCallback(async () => {
    if (!walletAddress) return;

    try {
      const stats = await blockchainManager.getPlayerStats(walletAddress);
      setPlayerStats(stats);
    } catch (error) {
      console.error("Failed to refresh player stats:", error);
    }
  }, [walletAddress]);

  // Sync authentication state with wallet address
  useEffect(() => {
    if (walletAddress) {
      refreshPlayerStats();

      // Set authentication state when wallet is connected via wagmi
      if (!isAuthenticated) {
        const displayName =
          farcasterUser?.username ||
          `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
        setUser({
          address: walletAddress,
          displayName,
          fid: farcasterUser?.fid,
          username: farcasterUser?.username,
        });
        setIsAuthenticated(true);
      }
    } else {
      // Clear authentication when wallet is disconnected
      if (isAuthenticated) {
        setUser(null);
        setIsAuthenticated(false);
        setPlayerStats(null);
      }
    }
  }, [walletAddress, refreshPlayerStats, isAuthenticated, farcasterUser]);

  const connectWallet = useCallback(async () => {
    try {
      if (!isLoading) setIsLoading(true);

      // Try to connect using wagmi first
      const farcasterConnector = connectors.find(
        (c) => c.name === "Farcaster Miniapp"
      );
      const injectedConnector = connectors.find((c) => c.name === "Injected");

      if (farcasterConnector) {
        console.log("Connecting with Farcaster connector");
        connect({ connector: farcasterConnector });
      } else if (injectedConnector) {
        console.log("Connecting with injected connector");
        connect({ connector: injectedConnector });
      } else {
        // Fallback to blockchain manager
        console.log("Using blockchain manager fallback");
        const address = await blockchainManager.connectWallet();
        setWalletAddress(address);
      }
    } catch (error) {
      console.error("Failed to connect wallet:", error);
    } finally {
      if (isLoading) setIsLoading(false);
    }
  }, [connect, connectors, farcasterUser, isLoading]);

  const signOut = () => {
    disconnect();
    setUser(null);
    setIsAuthenticated(false);
    setPlayerStats(null);
    setWalletAddress(null);
  };

  const value = {
    user,
    isLoading,
    gameContract,
    isAuthenticated,
    playerStats,
    walletAddress,
    connectWallet,
    signOut,
    refreshPlayerStats,
    setWalletAddress,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <InnerProviders>{children}</InnerProviders>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within Providers");
  }
  return context;
};
