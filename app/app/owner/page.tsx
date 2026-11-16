import localFont from "next/font/local";
import Script from "next/script";
import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { env } from "@/lib/env";
import OwnerApp from "./OwnerApp";

const ui = localFont({
  src: [
    { path: "../../../assets/fonts/google/sourcesans3/SourceSans3[wght].woff2", weight: "300 800", style: "normal" },
  ],
  display: "swap",
  variable: "--font-app",
});

export const metadata: Metadata = { title: "InviteIZI · Панель", robots: { index: false, follow: false } };
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1, themeColor: "#f7efe3" };

/** Панель владельца (кнопка «🖥 Панель» в боте). Только чтение; доступ — ADMIN_IDS, проверка на сервере по initData */
export default function OwnerPage() {
  if (!env.miniAppEnabled()) notFound();
  return (
    <>
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" />
      <OwnerApp fontClass={ui.variable} />
    </>
  );
}
