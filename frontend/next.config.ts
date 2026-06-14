import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Ensure proper routing
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
