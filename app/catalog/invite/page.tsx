/* eslint-disable @next/next/no-img-element -- Satori requires img; catalogue uses existing optimized local covers. */
import { naturalFonts } from "@/templates/themes/natural/fonts";
import { tPlain } from "@/texts/uz-cyrl";
import { Suspense } from "react";
import { env } from "@/lib/env";
import { coverOf, getDesign, isOnSale, activeDesigns } from "@/templates/registry";
import { validPublicSource, whatsappUrl } from "@/lib/marketing/config";
import { marketingCopy } from "@/texts/marketing";
import { BOT_USERNAME } from "@/lib/brand";
import s from "./page.module.css";
export const metadata = { title: "InviteIZI — таклифнома", robots: { index: false, follow: false } };
export default function Page(props: {
  searchParams: Promise<{
    lang?: string;
    ref?: string;
  }>;
}) {
  return (
    <Suspense fallback={null}>
      <Landing {...props} />
    </Suspense>
  );
}
async function Landing({
  searchParams,
}: {
  searchParams: Promise<{
    lang?: string;
    ref?: string;
  }>;
}) {
  const q = await searchParams,
    lang = q.lang === "ru" ? "ru" : "uz",
    t = marketingCopy(lang),
    source = validPublicSource(q.ref),
    chat = `https://t.me/${BOT_USERNAME}?start=${source ?? "badge"}`,
    wa = whatsappUrl(env.whatsappPhone());
  const preferred = ["muhr", "girih-barg", "suzani-medalyon"]
    .map((id) => getDesign(id))
    .filter((d) => d && isOnSale(d.id));
  const designs = [...new Map([...preferred, ...activeDesigns()].map((d) => [d!.id, d!])).values()].slice(0, 3);
  const switchHref = `?lang=${lang === "ru" ? "uz" : "ru"}${source ? "&ref=" + encodeURIComponent(source) : ""}`;
  return (
    <main className={`${s.page} ${naturalFonts}`} lang={lang}>
      <header>
        <a href={switchHref} className={s.lang}>
          {lang === "ru" ? "Ўзбекча" : "Русский"}
        </a>
        <p className={s.logo}>InviteIZI</p>
        <p className={s.eyebrow}>{t.eyebrow}</p>
        <h1>{t.title}</h1>
        <p className={s.intro}>{t.intro}</p>
        <div className={s.offer}>
          <strong>{t.price}</strong>
          <span>{t.promise}</span>
        </div>
        <a data-telegram className={s.primary} href={chat}>
          {t.telegram}
          <svg
            aria-hidden="true"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M6 18 18 6M6 6h12v12" />
          </svg>
        </a>
        {wa && (
          <a data-whatsapp className={s.secondary} href={wa + "?text=" + encodeURIComponent("InviteIZI: " + chat)}>
            {t.whatsapp}
          </a>
        )}
      </header>
      <section aria-label={t.selection}>
        <p className={s.selection}>{t.selection}</p>
        {designs.map((d, i) => (
          <article key={d.id}>
            <a
              href={`/demo/${d.id}?lang=${lang}${source ? "&ref=" + encodeURIComponent(source) : ""}`}
              className={s.cover}
            >
              <img src={coverOf(d.cover)} width={1080} height={1920} alt={t.preview} loading={i ? "lazy" : "eager"} />
              <span>{String(i + 1).padStart(2, "0")}</span>
            </a>
            <h2 className={s.designTitle}>{(tPlain.designs as Record<string, string>)[d.id] ?? d.id}</h2>
            <a
              className={s.preview}
              href={`/demo/${d.id}?lang=${lang}${source ? "&ref=" + encodeURIComponent(source) : ""}`}
            >
              {t.preview}
              <svg
                aria-hidden="true"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M6 18 18 6M6 6h12v12" />
              </svg>
            </a>
          </article>
        ))}
      </section>
      <footer>
        <p>{t.footer}</p>
        <a className={s.primary} href={chat}>
          {t.telegram}
          <svg
            aria-hidden="true"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M6 18 18 6M6 6h12v12" />
          </svg>
        </a>
      </footer>
    </main>
  );
}
