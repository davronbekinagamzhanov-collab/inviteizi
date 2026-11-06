import localFont from "next/font/local";
import Script from "next/script";
import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { env } from "@/lib/env";
import PanelApp from "./PanelApp";

const ui = localFont({ src: [{ path: "../../../assets/fonts/google/sourcesans3/SourceSans3[wght].woff2", weight: "300 800", style: "normal" }], display: "swap", variable: "--font-app" });

export const metadata: Metadata = { title: "InviteIZI · Панель", robots: { index: false, follow: false } };
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1, themeColor: "#f7efe3" };

/** Панель менеджера и партнёра (кнопка «🖥 Панель» в их меню бота). Только чтение; роль проверяет сервер по initData */
export default function RolePanelPage() {
  if (!env.miniAppEnabled()) notFound();
  return (
    <>
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" />
      <PanelApp fontClass={ui.variable} />
    </>
  );
}
