"use client";
/**
 * Общие детали «натуральных» дизайнов: рукописное слово, фото в рамке (с размытой подложкой),
 * календарь с днём, обведённым «от руки», стрелки-завитки. Цвет берут из currentColor и CSS-переменных дизайна.
 */
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { t } from "@/texts/uz-cyrl";
import { monthGrid, type WeddingDate } from "@/lib/wedding-date";
import s from "./natural.module.css";

/** Буквы, которых нет в Great Vibes */
const MISSING_IN_SCRIPT = /[қғҳҚҒҲ]/;
export const scriptFamily = (text: string) =>
  MISSING_IN_SCRIPT.test(text) ? "var(--n-script-alt)" : "var(--n-script)";

/** Рукописное слово-акцент. Если в слове есть қ/ғ/ҳ — запасной рукописный шрифт */
export function Script({
  text,
  className = "",
  style,
}: {
  text: string;
  className?: string;
  style?: CSSProperties;
}) {
  const alt = MISSING_IN_SCRIPT.test(text);
  return (
    <span
      className={`${s.script} ${alt ? s.scriptAlt : ""} ${className}`}
      style={{ fontFamily: scriptFamily(text), ...style }}
    >
      {text}
    </span>
  );
}

/** Блок появился на экране (один раз): для рисования кружка и стрелок */
export function useSeen<T extends Element>() {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (
      !("IntersectionObserver" in window) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      const f = requestAnimationFrame(() => setSeen(true));
      return () => cancelAnimationFrame(f);
    }
    const io = new IntersectionObserver(
      (e) => {
        if (e[0]?.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -15% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, seen] as const;
}

export type FrameShape =
  "arch" | "round" | "circle" | "torn" | "tornTop" | "plain";

/**
 * Фото в рамке. Фото клиента (client) бывает любых пропорций: если оно сильно не совпадает с рамкой,
 * показываем его целиком поверх размытой копии этого же фото, а не обрезаем лицо.
 */
export function Photo({
  src,
  shape = "plain",
  ratio = "4 / 5",
  client = false,
  position = "50% 50%",
  className = "",
  eager = false,
  alt = "",
}: {
  src: string;
  shape?: FrameShape;
  ratio?: string;
  client?: boolean;
  position?: string;
  className?: string;
  eager?: boolean;
  alt?: string;
}) {
  const [fit, setFit] = useState<"cover" | "contain">("cover");
  const [w, h] = ratio.split("/").map((x) => Number(x.trim()));
  const frame = w / h;
  function onLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    if (!client) return;
    const img = e.currentTarget;
    const own = img.naturalWidth / Math.max(1, img.naturalHeight);
    // Разница больше чем в 1,6 раза (горизонтальное фото в высокой арке) — не режем
    const off = own > frame ? own / frame : frame / own;
    setFit(off > 1.6 ? "contain" : "cover");
  }
  return (
    <div
      className={`${s.frame} ${s[shape]} ${className}`}
      style={{ aspectRatio: ratio }}
    >
      {fit === "contain" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" aria-hidden className={s.backdrop} />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        aria-hidden={alt ? undefined : true}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        onLoad={onLoad}
        className={s.img}
        style={{ objectFit: fit, objectPosition: position }}
      />
    </div>
  );
}

/** Кружок «от руки» (чуть неровный, концы заходят друг за друга) */
export function HandCircle({
  seen,
  className = "",
}: {
  seen: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 64 56"
      className={`${s.hand} ${seen ? s.drawn : ""} ${className}`}
      aria-hidden
      data-decor
    >
      <path
        pathLength={1}
        d="M44.5 7.8C36.2 3.1 22.4 3.6 13.6 10.2 5.2 16.6 3.3 28.4 8.6 37.6c5.6 9.6 18.9 13.9 30.6 11.5 11.4-2.3 19.6-10.9 19.2-21.1C58 18.3 50.6 10.6 41.2 7.4 35.6 5.5 29.9 5.7 25.2 6.9"
      />
    </svg>
  );
}

/** Стрелки-завитки «от руки» между пунктами программы. dir — куда ведёт */
const ARROWS = {
  right:
    "M6 8c10 2 18 9 21 19 2 7-3 12-8 9-5-3-1-11 6-12 12-1 24 6 33 17M58 41l-1-9M58 41l-9-1",
  left: "M58 8c-9 3-16 11-17 20-1 7 5 11 9 7 4-4-1-11-8-10-12 1-22 9-30 17M12 42l1-9M12 42l9-1",
  down: "M30 4c-6 8-8 17-4 25 3 6 10 6 10 1 0-6-9-6-11 1-3 9 0 17 6 24M31 55l-8-3M31 55l2-8",
} as const;

export function Squiggle({
  dir,
  seen,
  className = "",
}: {
  dir: keyof typeof ARROWS;
  seen: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 64 60"
      className={`${s.hand} ${s.arrow} ${seen ? s.drawn : ""} ${className}`}
      aria-hidden
      data-decor
    >
      <path pathLength={1} d={ARROWS[dir]} />
    </svg>
  );
}

/** Календарь месяца: нужный день обведён кружком «от руки» */
export function HandCalendar({
  date,
  className = "",
  title = true,
}: {
  date: WeddingDate;
  className?: string;
  title?: boolean;
}) {
  const [ref, seen] = useSeen<HTMLDivElement>();
  const weeks = monthGrid(date.year, date.monthIndex);
  return (
    <div
      ref={ref}
      className={`${s.calendar} ${className}`}
      aria-label={t.natural.calendarAria(
        t.date.long(date.day, date.monthIndex, date.year),
      )}
      role="img"
    >
      {title && (
        <p className={s.calTitle}>
          {t.date.monthYear(date.monthIndex, date.year)}
        </p>
      )}
      <div className={s.calGrid} aria-hidden>
        {t.weekdaysShort.map((d) => (
          <span key={d} className={s.calHead}>
            {d}
          </span>
        ))}
        {weeks.flat().map((day, i) => (
          <span
            key={i}
            className={`${s.calDay} ${day === date.day ? s.calMarked : ""}`}
          >
            {day ?? ""}
            {day === date.day && (
              <HandCircle seen={seen} className={s.calCircle} />
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Вертикальная надпись сбоку (как в журнале) */
export function SideTitle({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <span className={`${s.side} ${className}`}>{children}</span>;
}
