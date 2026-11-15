"use client";
import styles from "@/components/marketing/badge.module.css";

import { useEffect, useRef, useState } from "react";
import {useBrandDestination} from "@/components/marketing/BrandContext";
import {useBadgePlacement} from "@/components/marketing/useBadgePlacement";
import { t } from "@/texts/uz-cyrl";
import type { PhotoCredit } from "./Brand";

// Мягкий вариант плашек InviteIZI — только для натуральных дизайнов (--n-paper / --n-ink / --n-accent).
// Старые дизайны пользуются Brand.tsx без изменений.

// Сверху по центру колонки: снизу справа кнопка музыки, а у натуральных дизайнов внизу первого экрана обычно текст
const TOP = "top-[calc(0.75rem+env(safe-area-inset-top))] left-1/2 -translate-x-1/2";

/** Бейдж виден только на первом экране, при прокрутке плавно исчезает */
export function SoftBrandBadge() {
  const badgeRef=useRef<HTMLAnchorElement>(null);
  const destination=useBrandDestination("badge"),placement=useBadgePlacement(badgeRef,destination.enabled,true);
  const [shown, setShown] = useState(true);
  useEffect(() => {
    const check = () => setShown(window.scrollY < window.innerHeight * 0.35);
    check();
    window.addEventListener("scroll", check, { passive: true });
    return () => window.removeEventListener("scroll", check);
  }, []);
  const visible=destination.enabled?placement.shown:shown;
  return (
    <a
      ref={badgeRef}
      style={destination.enabled&&placement.lower?{top:"auto",left:"max(0.75rem,calc((100vw - 430px)/2 + 0.75rem))",transform:"none",translate:"none",bottom:`calc(${placement.bottom}px + env(safe-area-inset-bottom))`}:undefined}
      data-brand-badge
      data-shown={visible}
      href={destination.href}
      target="_blank"
      rel="noopener"
      aria-label={t.brand.badgeLabel}
      aria-hidden={!visible}
      tabIndex={visible ? undefined : -1}
      className={`${styles.badge} fixed ${TOP} z-40 inline-flex h-8 items-center gap-1.5 rounded-full bg-[var(--n-paper,#fff)]/90 px-3 backdrop-blur-[6px] font-sans text-[12px] font-medium tracking-wide text-[var(--n-ink,#2b1f16)] shadow-[0_4px_14px_-8px_rgba(40,30,20,.5)] ring-1 ring-[var(--n-ink,#2b1f16)]/12 motion-reduce:transition-none transition-[opacity,transform] duration-500 ease-[cubic-bezier(.22,1,.36,1)] active:scale-95 ${visible ? "opacity-100" : "pointer-events-none -translate-y-2 opacity-0"}`}
    >
      <span aria-hidden className="text-[var(--n-accent,#8c7764)]">✦</span>
      {t.brand.badge}
    </a>
  );
}

/** Низ страницы: плашка в цветах дизайна и одна строка авторов фото (ссылки с utm — правило Unsplash) */
export function SoftBrandFooter({ credits = [] }: { credits?: PhotoCredit[] }) {
  const destination=useBrandDestination("footer");
  const sources = [...new Map(credits.map((c) => [c.source, c.sourceUrl])).entries()];
  return (
    <footer data-brand-footer className="relative z-10 flex flex-col items-center gap-4 px-6 pt-10 pb-32 font-sans text-[var(--n-ink,#2b1f16)]">
      <div className="flex w-full max-w-[340px] flex-col items-center gap-3 rounded-[22px] bg-white/45 px-5 py-5 text-center ring-1 ring-[var(--n-ink,#2b1f16)]/10">
        <p className="text-[16px] leading-snug opacity-80">{t.brand.footer}</p>
        <a
          href={destination.href}
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
