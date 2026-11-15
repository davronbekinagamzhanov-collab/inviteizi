import localFont from "next/font/local";
import Script from "next/script";
import { appUz } from "@/texts/app-uz";
import { appRu } from "@/texts/app-ru";
import type { Metadata, Viewport } from "next";
import { env } from "@/lib/env";
import MiniApp from "./MiniApp";

const ui = localFont({
  src: [{ path: "../../assets/fonts/google/sourcesans3/SourceSans3[wght].woff2", weight: "300 800", style: "normal" }],
  display: "swap",
  variable: "--font-app",
});
const brand = localFont({
  src: [
    {
      path: "../../assets/fonts/web/google/cormorantgaramond/CormorantGaramond[wght].woff2",
      weight: "300 700",
      style: "normal",
    },
  ],
  display: "swap",
  variable: "--font-brand",
});

export const metadata: Metadata = { title: "InviteIZI", robots: { index: false, follow: false } };
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1, themeColor: "#f7efe3" };

/**
 * Mini App: открывается кнопкой «✨ Очиш» в Telegram. MINI_APP_ENABLED=false — заказ идёт по чату:
 * у кого кнопка ещё осталась (до следующего /start), видит понятную подсказку, а не пустую 404.
 */
export default function AppPage() {
  if (!env.miniAppEnabled()) {
    return (
      <main
        className={`${ui.variable} flex min-h-svh items-center justify-center bg-[#f7efe3] px-6 text-center`}
        style={{ fontFamily: "var(--font-app), sans-serif" }}
      >
        <div className="max-w-[340px] space-y-4 text-[17px] leading-relaxed text-[#3b2a1e]">
          <p>{appUz.chatOnly}</p>
          <p className="text-[15px] text-[#7a6450]">{appRu.chatOnly}</p>
        </div>
      </main>
    );
  }
  return (
    <>
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" />
      <MiniApp fontClass={`${ui.variable} ${brand.variable}`} />
    </>
  );
}
