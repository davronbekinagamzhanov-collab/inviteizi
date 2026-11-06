"use client";

import { useEffect, useState } from "react";
import { botLink } from "@/lib/brand";
import { t } from "@/texts/uz-cyrl";
import type { PhotoCredit } from "./Brand";

// Мягкий вариант плашек InviteIZI — только для натуральных дизайнов (--n-paper / --n-ink / --n-accent).
// Старые дизайны пользуются Brand.tsx без изменений.

// Сверху по центру колонки: снизу справа кнопка музыки, а у натуральных дизайнов внизу первого экрана обычно текст
const TOP = "top-[calc(0.75rem+env(safe-area-inset-top))] left-1/2 -translate-x-1/2";

/** Бейдж виден только на первом экране, при прокрутке плавно исчезает */
export function SoftBrandBadge() {
  const [shown, setShown] = useState(true);
  useEffect(() => {
    const check = () => setShown(window.scrollY < window.innerHeight * 0.35);
    check();
    window.addEventListener("scroll", check, { passive: true });
    return () => window.removeEventListener("scroll", check);
  }, []);
  return (
    <a
      data-brand-badge
      data-shown={shown}
      href={botLink("badge")}
      target="_blank"
      rel="noopener"
      aria-label={t.brand.badgeLabel}
      aria-hidden={!shown}
      tabIndex={shown ? undefined : -1}
      className={`fixed ${TOP} z-40 inline-flex h-8 items-center gap-1.5 rounded-full bg-[var(--n-paper,#fff)]/90 px-3 backdrop-blur-[6px] font-sans text-[12px] font-medium tracking-wide text-[var(--n-ink,#2b1f16)] shadow-[0_4px_14px_-8px_rgba(40,30,20,.5)] ring-1 ring-[var(--n-ink,#2b1f16)]/12 transition-[opacity,transform] duration-500 ease-[cubic-bezier(.22,1,.36,1)] active:scale-95 ${shown ? "opacity-100" : "pointer-events-none -translate-y-2 opacity-0"}`}
    >
      <span aria-hidden className="text-[var(--n-accent,#8c7764)]">✦</span>
      {t.brand.badge}
    </a>
  );
}

/** Низ страницы: плашка в цветах дизайна и одна строка авторов фото (ссылки с utm — правило Unsplash) */
export function SoftBrandFooter({ credits = [] }: { credits?: PhotoCredit[] }) {
  const sources = [...new Map(credits.map((c) => [c.source, c.sourceUrl])).entries()];
  return (
    <footer data-brand-footer className="relative z-10 flex flex-col items-center gap-4 px-6 pt-10 pb-32 font-sans text-[var(--n-ink,#2b1f16)]">
      <div className="flex w-full max-w-[340px] flex-col items-center gap-3 rounded-[22px] bg-white/45 px-5 py-5 text-center ring-1 ring-[var(--n-ink,#2b1f16)]/10">
        <p className="text-[16px] leading-snug opacity-80">{t.brand.footer}</p>
        <a
          href={botLink("footer")}
          target="_blank"
          rel="noopener"
          className="rounded-full bg-[var(--n-accent,#8c7764)] px-5 py-2.5 text-[16px] font-medium text-[var(--n-paper,#fff)] transition-transform duration-300 active:scale-95"
        >
          {t.brand.footerLink}
        </a>
      </div>
      {credits.length > 0 && (
        <p data-photo-credits className="max-w-[340px] text-center text-[11px] leading-relaxed opacity-55">
          {t.photoCredits.many}{" "}
          {credits.map((c, i) => (
            <span key={c.authorUrl}>
              {i > 0 && ", "}
              <a href={c.authorUrl} target="_blank" rel="noopener" className="underline decoration-current/40 underline-offset-2">
                {c.author}
              </a>
            </span>
          ))}
          {sources.map(([name, url], i) => (
            <span key={name}>
              {i === 0 ? " · " : ", "}
              <a href={url} target="_blank" rel="noopener" className="underline decoration-current/40 underline-offset-2">
                {name}
              </a>
            </span>
          ))}
        </p>
      )}
    </footer>
  );
}
