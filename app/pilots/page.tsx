import Image from "next/image";
import Link from "next/link";
import { Cormorant_Garamond, PT_Serif } from "next/font/google";
import { t } from "@/texts/uz-cyrl";
import { designs, PRICES } from "@/templates/registry";

const display = Cormorant_Garamond({
  variable: "--font-pilots-display",
  weight: ["500", "600"],
  subsets: ["cyrillic", "cyrillic-ext"],
});
const body = PT_Serif({
  variable: "--font-pilots-body",
  weight: ["400", "700"],
  subsets: ["cyrillic", "cyrillic-ext"],
});

/** Витрина пяти пилотных дизайнов: крупные превью, ссылки на демо и «НАМУНА» */
export default function PilotsPage() {
  return (
    <main
      className={`${display.variable} ${body.variable} mx-auto min-h-svh max-w-[480px] px-4 pt-12 pb-16 text-[#3b2a1e]`}
      style={{ fontFamily: "var(--font-pilots-body)" }}
    >
      <header className="text-center">
        <p
          className="text-[40px] leading-none font-semibold"
          style={{ fontFamily: "var(--font-pilots-display)" }}
        >
          Invite<span className="gold-text">IZI</span>
        </p>
        <h1
          className="mt-4 text-[28px] font-semibold"
          style={{ fontFamily: "var(--font-pilots-display)" }}
        >
          {t.pilots.title}
        </h1>
        <p className="mt-2 text-[16px] leading-relaxed text-[#7d6a58]">{t.pilots.lead}</p>
      </header>

      <ul className="mt-10 space-y-10">
        {designs.map((d, i) => (
          <li key={d.id}>
            <Link
              href={`/demo/${d.id}`}
              className="group block overflow-hidden rounded-[28px] bg-white shadow-[0_20px_50px_-24px_rgba(59,42,30,0.45)] ring-1 ring-[#b8892f]/25"
            >
              <div className="relative aspect-[375/560] w-full overflow-hidden">
                <Image
                  src={d.preview}
                  alt={t.designs[d.id]}
                  fill
                  sizes="(max-width: 480px) 100vw, 480px"
                  className="object-cover object-top transition duration-500 group-active:scale-[1.02]"
                  loading={i === 0 ? "eager" : "lazy"}
                />
              </div>
              <div className="flex items-end justify-between gap-3 px-5 pt-4 pb-5">
                <div>
                  <p className="text-[13px] tracking-[0.18em] text-[#a87a28] uppercase">
                    {t.pilots.number(d.number)} · {t.occasionTitles[d.sample.occasion]}
                  </p>
                  <p
                    className="mt-1 text-[30px] leading-tight font-semibold"
                    style={{ fontFamily: "var(--font-pilots-display)" }}
                  >
                    {t.designs[d.id]}
                  </p>
                </div>
                <p className="shrink-0 pb-1 text-right text-[14px] leading-snug text-[#7d6a58]">
                  {t.formats[d.format]}
                  <br />
                  <span className="font-bold text-[#3b2a1e]">{t.price(PRICES[d.format])}</span>
                </p>
              </div>
            </Link>
            <div className="mt-3 flex gap-3">
              <Link
                href={`/demo/${d.id}`}
                className="gold-fill flex-1 rounded-full py-3.5 text-center text-[16px] font-bold text-[#3b2a1e] shadow-md"
              >
                {t.pilots.open}
              </Link>
              <Link
                href={`/demo/${d.id}/namuna`}
                className="flex-1 rounded-full py-3.5 text-center text-[16px] text-[#3b2a1e] ring-1 ring-[#b8892f]/60"
              >
                {t.pilots.watermark}
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
