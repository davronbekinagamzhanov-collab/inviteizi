import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/bot": ["./assets/fonts/**/*.ttf","./public/art/**/*.webp","./public/art/**/*.png","./public/floral/*.webp","./public/vip/**/*.webp","./public/pilots/*.png"],
    "/api/cron": ["./assets/fonts/**/*.ttf","./public/art/**/*.webp","./public/art/**/*.png","./public/floral/*.webp","./public/vip/**/*.webp","./public/pilots/*.png"],
    "/api/marketing/status-preview": ["./assets/fonts/**/*.ttf","./public/art/**/*.webp","./public/art/**/*.png","./public/floral/*.webp","./public/vip/**/*.webp","./public/pilots/*.png"],
    "/*/opengraph-image": ["./assets/fonts/**/*.ttf", "./public/og/**/*"],
  },
  cacheComponents: true,
  // Vercel Hobby: без оптимизации картинок на лету — все картинки уже готовые сжатые WebP
  // (обложки каталога — public/covers/thumb, 480 px). Лимит Image Optimization больше не расходуется.
  images: { unoptimized: true },
  // Статика из public — в кэш браузера и CDN на год: повторные заходы не тратят трафик
  async headers() {
    const year = [{ key: "Cache-Control", value: "public, max-age=31536000, stale-while-revalidate=86400" }];
    return ["/covers/:path*", "/art/:path*", "/floral/:path*", "/music/:path*", "/audio/:path*", "/og/:path*", "/pilots/:path*", "/materials/:path*"].map((source) => ({ source, headers: year }));
  },
  // без значка Next.js в углу: владелец смотрит пригласительные с телефона в режиме разработки
  devIndicators: false,
  partialPrefetching: true,
  // Чтобы демо открывалось с телефона в той же Wi‑Fi сети (только для npm run dev)
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*"],
};

export default nextConfig;
