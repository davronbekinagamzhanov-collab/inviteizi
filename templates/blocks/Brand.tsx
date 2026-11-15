"use client";
import { useRef, type CSSProperties, type ReactNode } from "react";
import { useBrandTone, type BrandTone } from "./brandTone";
import styles from "@/components/marketing/badge.module.css";
import { useBrandDestination } from "@/components/marketing/BrandContext";
import { useBadgePlacement } from "@/components/marketing/useBadgePlacement";
import { t } from "@/texts/uz-cyrl";

// Слева внизу: кнопка музыки стоит справа, поэтому они не пересекаются
const LEFT = "left-[max(0.75rem,calc((100vw-430px)/2+0.75rem))]";
const BOTTOM = "bottom-[calc(1.5rem+env(safe-area-inset-bottom))]";
// В НАМУНА внизу плашка «Тўловдан сўнг…» — поднимаем над ней, как кнопку музыки
const BOTTOM_RAISED = "bottom-[calc(4rem+env(safe-area-inset-bottom))]";

/**
 * Маленький бейдж «✦ InviteIZI» в цветах дизайна: бумага дизайна на 90 %, текст — цвет палитры
 * с лучшим контрастом (≥ 4,5), ✦ — акцент палитры. Контраст проверяет scripts/check-badge.mjs.
 */
export const BADGE_LOOK =
  "inline-flex h-7 items-center gap-1.5 rounded-full px-3 font-sans text-[11.5px] font-normal tracking-[0.08em] backdrop-blur-[4px] active:scale-95";

/** Цвета бейджа: пока тон не посчитан — переменные дизайна (--n-* / --c-*) */
export function badgeStyle(tone: BrandTone | null): CSSProperties {
  return {
    color: tone?.ink ?? "var(--n-ink, var(--c-ink, #2b1f16))",
    backgroundColor: `color-mix(in srgb, ${tone?.paper ?? "var(--n-paper, var(--c-paper, #fffaf2))"} 90%, transparent)`,
    boxShadow: `0 0 0 1px color-mix(in srgb, ${tone?.ink ?? "var(--n-ink, var(--c-ink, #2b1f16))"} 14%, transparent)`,
    ["--brand-accent" as string]: tone?.accent ?? "var(--n-accent, var(--c-accent, currentColor))",
  };
}

export function BadgeContent() {
  return (
    <>
      <span aria-hidden className="text-[10px] text-[var(--brand-accent)]">
        ✦
      </span>
      {t.brand.badge}
    </>
  );
}
export function BrandBadge({ raised }: { raised: boolean }) {
  const badgeRef = useRef<HTMLAnchorElement>(null);
  const destination = useBrandDestination("badge"),
    placement = useBadgePlacement(badgeRef, destination.enabled, false, raised);
  const tone = useBrandTone(badgeRef);
  return (
    <a
      ref={badgeRef}
      style={{
        ...badgeStyle(tone),
        ...(destination.enabled && placement.lower
          ? { bottom: `calc(${placement.bottom}px + env(safe-area-inset-bottom))` }
          : undefined),
      }}
      aria-hidden={destination.enabled && !placement.shown}
      tabIndex={destination.enabled && !placement.shown ? -1 : undefined}
      data-shown={!destination.enabled || placement.shown}
      data-brand-badge
      href={destination.href}
      target="_blank"
      rel="noopener"
      aria-label={t.brand.badgeLabel}
      className={`${styles.badge} ${BADGE_LOOK} ${destination.enabled && !placement.shown ? "pointer-events-none opacity-0" : "opacity-100"} transition-opacity duration-500 motion-reduce:transition-none fixed ${LEFT} ${raised ? BOTTOM_RAISED : BOTTOM} z-40`}
    >
      <BadgeContent />
    </a>
  );
}

/** Автор фото (Unsplash и др.): «Сурат: Имя / Unsplash» со ссылками */
export type PhotoCredit = { author: string; authorUrl: string; source: string; sourceUrl: string };

/**
 * Самый конец приглашения: тонкая линия, «InviteIZI билан яратилди» и ссылка без подложки.
 * Цвет — из палитры дизайна (useBrandTone), снизу запас: бейдж и кнопка музыки не закрывают ссылку.
 */
export function BrandFooter({
  credits = [],
  creditClassName = "",
  creditsNode,
}: {
  credits?: PhotoCredit[];
  creditClassName?: string;
  /** Свой вид строки авторов фото (мягкий вариант группирует источники) */
  creditsNode?: ReactNode;
}) {
  const destination = useBrandDestination("footer");
  const ref = useRef<HTMLElement>(null);
  const tone = useBrandTone(ref);
  const ink = tone?.ink ?? "var(--n-ink, var(--c-ink, currentColor))";
  return (
    <footer
      ref={ref}
      data-brand-footer
      style={{ color: ink, ["--brand-accent" as string]: tone?.accent ?? "currentColor" }}
      className="relative z-10 flex flex-col items-center gap-2 px-8 pt-14 pb-28 text-center font-sans"
    >
      {creditsNode ??
        (credits.length > 0 && (
          <p
            data-photo-credits
            className={`mb-4 max-w-[340px] text-[11px] leading-relaxed opacity-80 ${creditClassName}`}
          >
            {credits.map((c, i) => (
              <span key={c.authorUrl} className="inline-block">
                {i > 0 && (
                  <span aria-hidden className="px-1.5">
                    ·
                  </span>
                )}
                {t.photoCredits.label}{" "}
                <a href={c.authorUrl} target="_blank" rel="noopener" className="underline underline-offset-2">
                  {c.author}
                </a>
                {" / "}
                <a href={c.sourceUrl} target="_blank" rel="noopener" className="underline underline-offset-2">
                  {c.source}
                </a>
              </span>
            ))}
          </p>
        ))}
      <span aria-hidden className="mb-2 h-px w-10 bg-current opacity-30" />
      <p className="text-[12px] font-light tracking-[0.12em]">
        <span aria-hidden className="pr-1.5 text-[var(--brand-accent)]">
          ✦
        </span>
        {t.brand.footer}
      </p>
      <a
        href={destination.href}
        target="_blank"
        rel="noopener"
        data-brand-footer-link
        className="inline-flex min-h-11 items-center px-3 text-[14px] font-light tracking-[0.02em] underline decoration-current/40 decoration-1 underline-offset-[6px] transition-opacity active:opacity-60"
      >
        {t.brand.footerLink}
      </a>
    </footer>
  );
}
