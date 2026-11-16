import { DealBadge, DealPrice, DealsBanner, DealsProvider } from "./Deals";
import localFont from "next/font/local";
import { existsSync } from "node:fs";
import path from "node:path";
import Image from "next/image";
import Link from "next/link";

import { t } from "@/texts/uz-cyrl";
import type { Occasion } from "@/lib/types";
import { activeDesigns, PRICES, thumbOf } from "@/templates/registry";

const display = localFont({
  src: [
    {
      path: "../../assets/fonts/web/google/cormorantgaramond/CormorantGaramond[wght].woff2",
      weight: "300.0 700.0",
      style: "normal",
    },
  ],
  display: "swap",
  variable: "--font-catalog-display",
});
const body = localFont({
  src: [
    { path: "../../assets/fonts/google/ptserif/PT_Serif-Web-Regular.woff2", weight: "400", style: "normal" },
    { path: "../../assets/fonts/google/ptserif/PT_Serif-Web-Bold.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  variable: "--font-catalog-body",
});

export const metadata = { title: t.catalog.title };

const ORDER: Occasion[] = ["nikoh", "nahorgi", "sunnat", "yubiley"];

/** Обложка есть только после `node scripts/make-covers.mjs` */
const hasCover = (src: string) => existsSync(path.join(process.cwd(), "public", src));

/** Простой каталог: все дизайны по тадбирам, ссылки на живое демо и «НАМУНА» */
export default function CatalogPage() {
  return (
    <DealsProvider>
      <main
        className={`${display.variable} ${body.variable} mx-auto min-h-svh max-w-[430px] px-4 pt-12 pb-16 text-[#3b2a1e]`}
        style={{ fontFamily: "var(--font-catalog-body)" }}
      >
        <header className="text-center">
          <p className="text-[40px] leading-none font-semibold" style={{ fontFamily: "var(--font-catalog-display)" }}>
            Invite<span className="gold-text">IZI</span>
          </p>
          <h1 className="mt-4 text-[28px] font-semibold" style={{ fontFamily: "var(--font-catalog-display)" }}>
            {t.catalog.title}
          </h1>
          <p className="mt-2 text-[16px] leading-relaxed text-[#7d6a58]">{t.catalog.lead}</p>
        </header>
        <DealsBanner />

        {ORDER.map((occasion) => {
          const list = activeDesigns().filter((d) => d.occasion === occasion);
          if (!list.length) return null;
          return (
            <section key={occasion} className="mt-12">
              <h2
                className="border-b border-[#b8892f]/30 pb-2 text-[30px] font-semibold"
                style={{ fontFamily: "var(--font-catalog-display)" }}
              >
                {t.occasionTitles[occasion]}
              </h2>
              <ul className="mt-6 grid grid-cols-2 gap-x-3 gap-y-8">
                {list.map((d, i) => (
                  // колонка: кнопка «Кўриш» всегда внизу карточки, даже если у соседа есть строка «с фото»
                  <li key={d.id} className="flex flex-col">
                    <Link
                      href={`/demo/${d.id}`}
                      className="block overflow-hidden rounded-[20px] bg-[#efe6d6] shadow-[0_14px_30px_-20px_rgba(59,42,30,0.6)] ring-1 ring-[#b8892f]/25"
                    >
                      <div className="relative aspect-[9/16] w-full">
                        {hasCover(d.cover) && (
                          <Image
                            src={thumbOf(d.cover)}
                            alt={t.designs[d.id]}
                            fill
                            sizes="(max-width: 480px) 50vw, 240px"
                            className="object-cover"
                            loading={i < 2 ? "eager" : "lazy"}
                          />
                        )}
                        <DealBadge occasion={d.occasion} format={d.format} />
                      </div>
                    </Link>
                    <p className="mt-2 text-[13px] tracking-[0.14em] text-[#a87a28] uppercase">
                      {t.catalog.number(d.number)} · {t.formats[d.format]}
                    </p>
                    <p
                      className="text-[22px] leading-tight font-semibold"
                      style={{ fontFamily: "var(--font-catalog-display)" }}
                    >
                      {t.designs[d.id]}
                    </p>
                    <DealPrice occasion={d.occasion} format={d.format} base={PRICES[d.format]} />
                    {d.clientPhotos && <p className="text-[14px] text-[#6b5a48]">{t.catalog.withPhoto}</p>}
                    <span aria-hidden className="h-2 shrink-0" />
                    <Link
                      href={`/demo/${d.id}`}
                      className="gold-fill mt-auto block rounded-full py-2.5 text-center text-[16px] font-bold text-[#3b2a1e]"
                    >
                      {t.catalog.open}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </main>
    </DealsProvider>
  );
}
