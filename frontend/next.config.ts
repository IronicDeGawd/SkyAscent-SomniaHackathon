import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  // Disable all development indicators and overlays
  devIndicators: {
    buildActivity: false,
    buildActivityPosition: 'bottom-right',
  },
  
  // Suppress hydration warnings in development
  onDemandEntries: {
    // period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },
  
  // Additional development overlay settings
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
