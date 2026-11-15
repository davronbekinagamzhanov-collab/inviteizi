import localFont from "next/font/local";

import { t } from "@/texts/uz-cyrl";

const display = localFont({
  preload: false,
  src: [
    {
      path: "../../assets/fonts/web/google/cormorantgaramond/CormorantGaramond[wght].woff2",
      weight: "300.0 700.0",
      style: "normal",
    },
  ],
  display: "swap",
  variable: "--font-expired-display",
});
const body = localFont({
  preload: false,
  src: [{ path: "../../assets/fonts/google/ptserif/PT_Serif-Web-Regular.woff2", weight: "400", style: "normal" }],
  display: "swap",
  variable: "--font-expired-body",
});

/** Заглушка после срока ссылки (последний тадбир + 30 дней) или для архивного заказа; та же страница — для неверной ссылки */
export default function Expired({ texts = t.invitationPage.expired }: { texts?: { title: string; body: string } }) {
  return (
    <main
      className={`${display.variable} ${body.variable} flex min-h-svh items-center justify-center bg-[#f7efe3] px-4 text-[#3b2a1e]`}
      style={{
        fontFamily: "var(--font-expired-body)",
        backgroundImage: "radial-gradient(120% 80% at 50% 0%, #fffaf2 0%, #f7efe3 55%, #efe2cf 100%)",
      }}
    >
      <section className="w-full max-w-[430px] py-16 text-center">
        <Ornament />
        <h1
          className="mt-8 text-[34px] leading-tight font-semibold text-balance"
          style={{ fontFamily: "var(--font-expired-display)" }}
        >
          {texts.title}
        </h1>
        <p className="mx-auto mt-5 max-w-[320px] text-[18px] leading-relaxed text-[#6f5a46] text-pretty">
          {texts.body}
        </p>
        <Ornament flip />
        <p className="mt-10 text-[13px] tracking-[0.12em] text-[#a87a28]">{t.invitationPage.expired.brand}</p>
      </section>
    </main>
  );
}

function Ornament({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 240 24"
      className={`mx-auto h-6 w-[200px] ${flip ? "mt-8 rotate-180" : ""}`}
      fill="none"
      stroke="#b8892f"
      strokeWidth="1.2"
      aria-hidden
    >
      <path d="M8 12h86M146 12h86" strokeLinecap="round" />
      <path d="M120 3l9 9-9 9-9-9z" fill="#b8892f" fillOpacity="0.15" />
      <circle cx="100" cy="12" r="2" fill="#b8892f" />
      <circle cx="140" cy="12" r="2" fill="#b8892f" />
    </svg>
  );
}
