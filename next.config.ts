import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // без значка Next.js в углу: владелец смотрит пригласительные с телефона в режиме разработки
  devIndicators: false,
  partialPrefetching: true,
  // Чтобы демо открывалось с телефона в той же Wi‑Fi сети (только для npm run dev)
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
