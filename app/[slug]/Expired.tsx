import { Cormorant_Garamond, PT_Serif } from "next/font/google";
import { t } from "@/texts/uz-cyrl";

const display = Cormorant_Garamond({
  variable: "--font-expired-display",
  weight: ["600"],
  subsets: ["cyrillic", "cyrillic-ext"],
});
const body = PT_Serif({
  variable: "--font-expired-body",
  weight: ["400"],
  subsets: ["cyrillic", "cyrillic-ext"],
});

/** Заглушка после срока ссылки (последний тадбир + 30 дней) или для архивного заказа */
export default function Expired() {
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
          {t.invitationPage.expired.title}
        </h1>
        <p className="mx-auto mt-5 max-w-[320px] text-[18px] leading-relaxed text-[#6f5a46] text-pretty">
          {t.invitationPage.expired.body}
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
