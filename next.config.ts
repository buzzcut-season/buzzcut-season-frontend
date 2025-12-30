import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Разрешаем внешние картинки (можно ужесточить под домены)
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
};

export default nextConfig;
