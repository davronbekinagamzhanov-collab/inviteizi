import localFont from "next/font/local";
import Script from "next/script";
import { notFound } from "next/navigation";
import type { Metadata, Viewport } from "next";
import { env } from "@/lib/env";
import MiniApp from "./MiniApp";

const ui = localFont({ src: [{ path: "../../assets/fonts/google/sourcesans3/SourceSans3[wght].woff2", weight: "300 800", style: "normal" }], display: "swap", variable: "--font-app" });
const brand = localFont({ src: [{ path: "../../assets/fonts/google/cormorantgaramond/CormorantGaramond[wght].woff2", weight: "300 700", style: "normal" }], display: "swap", variable: "--font-brand" });

export const metadata: Metadata = { title: "InviteIZI", robots: { index: false, follow: false } };
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1, themeColor: "#f7efe3" };

/** Mini App: открывается кнопкой «✨ Очиш» в Telegram. MINI_APP_ENABLED=false — страницы нет, заказ идёт по чату */
export default function AppPage() {
  if (!env.miniAppEnabled()) notFound();
  return (
    <>
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" />
      <MiniApp fontClass={`${ui.variable} ${brand.variable}`} />
    </>
  );
}
