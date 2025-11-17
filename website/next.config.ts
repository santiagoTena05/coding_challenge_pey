import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep default Next.js mode for better Amplify compatibility
  trailingSlash: true,
  images: {
    unoptimized: true
  }
};

export default nextConfig;
