import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  experimental: { optimizePackageImports: ["lucide-react"] },
};

export default nextConfig;
