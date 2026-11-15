"use client";
import styles from "@/components/marketing/badge.module.css";

import { useEffect, useRef, useState } from "react";
import { useBrandDestination } from "@/components/marketing/BrandContext";
import { useBadgePlacement } from "@/components/marketing/useBadgePlacement";
import { t } from "@/texts/uz-cyrl";
import { BADGE_LOOK, BadgeContent, BrandFooter, badgeStyle, type PhotoCredit } from "./Brand";
import { useBrandTone } from "./brandTone";

// Мягкий вариант плашек InviteIZI — только для натуральных дизайнов (--n-paper / --n-ink / --n-accent).
// Старые дизайны пользуются Brand.tsx без изменений.

// Сверху по центру колонки: снизу справа кнопка музыки, а у натуральных дизайнов внизу первого экрана обычно текст
const TOP = "top-[calc(0.75rem+env(safe-area-inset-top))] left-1/2 -translate-x-1/2";

/** Бейдж виден только на первом экране, при прокрутке плавно исчезает */
export function SoftBrandBadge() {
  const badgeRef = useRef<HTMLAnchorElement>(null);
  const destination = useBrandDestination("badge"),
    placement = useBadgePlacement(badgeRef, destination.enabled, true);
  const tone = useBrandTone(badgeRef);
  const [shown, setShown] = useState(true);
  useEffect(() => {
    const check = () => setShown(window.scrollY < window.innerHeight * 0.35);
    check();
    window.addEventListener("scroll", check, { passive: true });
    return () => window.removeEventListener("scroll", check);
  }, []);
  const visible = destination.enabled ? placement.shown : shown;
  return (
    <a
      ref={badgeRef}
      style={{
        ...badgeStyle(tone),
        ...(destination.enabled && placement.lower
          ? {
              top: "auto",
              left: "max(0.75rem,calc((100vw - 430px)/2 + 0.75rem))",
              transform: "none",
              translate: "none",
              bottom: `calc(${placement.bottom}px + env(safe-area-inset-bottom))`,
            }
          : undefined),
      }}
      data-brand-badge
      data-shown={visible}
      href={destination.href}
      target="_blank"
      rel="noopener"
      aria-label={t.brand.badgeLabel}
      aria-hidden={!visible}
      tabIndex={visible ? undefined : -1}
      className={`${styles.badge} ${BADGE_LOOK} fixed ${TOP} z-40 motion-reduce:transition-none transition-[opacity,transform] duration-500 ease-[cubic-bezier(.22,1,.36,1)] ${visible ? "opacity-100" : "pointer-events-none -translate-y-2 opacity-0"}`}
    >
      <BadgeContent />
    </a>
  );
}

/** Низ страницы: тот же минималистичный блок, что у остальных дизайнов; авторы фото — одной строкой (ссылки с utm — правило Unsplash) */
export function SoftBrandFooter({ credits = [] }: { credits?: PhotoCredit[] }) {
  const sources = [...new Map(credits.map((c) => [c.source, c.sourceUrl])).entries()];
  return (
    <BrandFooter
      creditsNode={
        <>
          {credits.length > 0 && (
            <p data-photo-credits className="mb-4 max-w-[340px] text-center text-[11px] leading-relaxed opacity-80">
              {t.photoCredits.many}{" "}
              {credits.map((c, i) => (
                <span key={c.authorUrl}>
                  {i > 0 && ", "}
                  <a
                    href={c.authorUrl}
                    target="_blank"
                    rel="noopener"
                    className="underline decoration-current/40 underline-offset-2"
                  >
                    {c.author}
                  </a>
                </span>
              ))}
              {sources.map(([name, url], i) => (
                <span key={name}>
                  {i === 0 ? " · " : ", "}
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener"
                    className="underline decoration-current/40 underline-offset-2"
                  >
                    {name}
                  </a>
                </span>
              ))}
            </p>
          )}
        </>
      }
    />
  );
}
