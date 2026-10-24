import { existsSync } from "node:fs";
import path from "node:path";
import Image from "next/image";
import Link from "next/link";
import { Cormorant_Garamond, PT_Serif } from "next/font/google";
import { t } from "@/texts/uz-cyrl";
import type { Occasion } from "@/lib/types";
import { designs, PRICES } from "@/templates/registry";

const display = Cormorant_Garamond({
  variable: "--font-catalog-display",
  weight: ["500", "600"],
  subsets: ["cyrillic", "cyrillic-ext"],
});
const body = PT_Serif({
  variable: "--font-catalog-body",
  weight: ["400", "700"],
  subsets: ["cyrillic", "cyrillic-ext"],
});

export const metadata = { title: t.catalog.title };

const ORDER: Occasion[] = ["nikoh", "nahorgi", "sunnat", "yubiley"];

/** Обложка есть только после `node scripts/make-covers.mjs` */
const hasCover = (src: string) => existsSync(path.join(process.cwd(), "public", src));

/** Простой каталог: все дизайны по тадбирам, ссылки на живое демо и «НАМУНА» */
export default function CatalogPage() {
  return (
    <main
      className={`${display.variable} ${body.variable} mx-auto min-h-svh max-w-[480px] px-4 pt-12 pb-16 text-[#3b2a1e]`}
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

      {ORDER.map((occasion) => {
        const list = designs.filter((d) => d.occasion === occasion);
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
                <li key={d.id}>
                  <Link
                    href={`/demo/${d.id}`}
                    className="block overflow-hidden rounded-[20px] bg-[#efe6d6] shadow-[0_14px_30px_-20px_rgba(59,42,30,0.6)] ring-1 ring-[#b8892f]/25"
                  >
                    <div className="relative aspect-[9/16] w-full">
                      {hasCover(d.cover) && (
                        <Image
                          src={d.cover}
                          alt={t.designs[d.id]}
                          fill
                          sizes="(max-width: 480px) 50vw, 240px"
                          className="object-cover"
                          loading={i < 2 ? "eager" : "lazy"}
                        />
                      )}
                    </div>
                  </Link>
                  <p className="mt-2 text-[13px] tracking-[0.14em] text-[#a87a28] uppercase">
                    {t.catalog.number(d.number)} · {t.formats[d.format]}
                  </p>
                  <p className="text-[22px] leading-tight font-semibold" style={{ fontFamily: "var(--font-catalog-display)" }}>
                    {t.designs[d.id]}
                  </p>
                  <p className="text-[16px] font-bold">{t.price(PRICES[d.format])}</p>
                  <Link
                    href={`/demo/${d.id}`}
                    className="gold-fill mt-2 block rounded-full py-2.5 text-center text-[16px] font-bold text-[#3b2a1e]"
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
  );
}
