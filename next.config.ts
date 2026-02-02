import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Allow external images (tighten by domain if needed)
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
};

export default nextConfig;
