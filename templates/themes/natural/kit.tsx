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
import { glueWords } from "@/lib/typography";
import { monthGrid, type WeddingDate } from "@/lib/wedding-date";
import s from "./natural.module.css";

/** Буквы, которых нет в Great Vibes (узбекские и казахские) */
const MISSING_IN_SCRIPT = /[қғҳәңөұүһіҚҒҲӘҢӨҰҮҺІ]/;
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
  // Длинное слово (русское «Программа» вместо «Дастур») не вылезает за край: шрифт уменьшается до ширины колонки
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      el.style.fontSize = "";
      const box = el.parentElement?.getBoundingClientRect();
      if (!box) return;
      // запас: у рукописных букв «хвосты» выходят за рамку слова
      const limit = Math.min(box.width, window.innerWidth - 16) * 0.86;
      let size = parseFloat(getComputedStyle(el).fontSize);
      const over = () => {
        const r = el.getBoundingClientRect();
        return r.width > limit || r.left < 12 || r.right > window.innerWidth - 12;
      };
      for (let i = 0; i < 12 && over() && size > 14; i++) {
        size *= 0.92;
        el.style.fontSize = `${size}px`;
      }
    };
    fit();
    document.fonts?.ready.then(fit).catch(() => undefined);
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [text]);
  return (
    <span
      ref={ref}
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
  | "arch"
  | "round"
  | "circle"
  | "torn"
  | "tornTop"
  | "plain"
  | "petal" // два противоположных угла — большие дуги (лист)
  | "corner" // один большой скруглённый угол сверху слева
  | "oval";

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
  parallax = 18,
}: {
  src: string;
  shape?: FrameShape;
  ratio?: string;
  client?: boolean;
  position?: string;
  className?: string;
  eager?: boolean;
  alt?: string;
  /** Сдвиг фото внутри рамки при листании, px (0 — без параллакса) */
  parallax?: number;
}) {
  const imgRef = useParallax<HTMLImageElement>(parallax);
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
        ref={imgRef}
        src={src}
        alt={alt}
        aria-hidden={alt ? undefined : true}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        onLoad={onLoad}
        className={s.img}
        style={{ objectFit: fit, objectPosition: position }}
      />
      <span className={s.vignette} aria-hidden />
    </div>
  );
}

/* ── Плавность ─────────────────────────────────────────────────────────────
 * Один общий обработчик прокрутки (через requestAnimationFrame) на всю страницу:
 * - Rise: блок проявляется (opacity + translateY), когда его верх выше 90% высоты экрана — в том числе
 *   если его уже пролистали прыжком: ни один блок не остаётся полупрозрачным.
 * - параллакс фото: только transform и только у фото рядом с экраном.
 */
const pending = new Map<Element, () => void>();
const drifting = new Map<HTMLElement, number>();
let ticking = false;
let listening = false;
function onFrame() {
  ticking = false;
  const vh = window.innerHeight;
  for (const [el, show] of pending) {
    if (el.getBoundingClientRect().top < vh * 0.9) {
      show();
      pending.delete(el);
    }
  }
  for (const [img, amp] of drifting) {
    const r = (img.parentElement ?? img).getBoundingClientRect();
    if (r.bottom < -vh * 0.2 || r.top > vh * 1.2) continue;
    const p = Math.max(-1, Math.min(1, (r.top + r.height / 2 - vh / 2) / vh));
    img.style.transform = `translate3d(0, ${(p * amp).toFixed(1)}px, 0) scale(1.08)`;
  }
}
function schedule() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(onFrame);
}
function listen() {
  if (listening) return;
  listening = true;
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });
}
const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function useParallax<T extends HTMLElement>(amp: number) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !amp || reducedMotion()) return;
    drifting.set(el, amp);
    listen();
    schedule();
    return () => {
      drifting.delete(el);
    };
  }, [amp]);
  return ref;
}

/**
 * Мягкое появление: opacity + translateY 16px, 0,8 с, cubic-bezier(0.22, 1, 0.36, 1).
 * stagger — дочерние элементы появляются лесенкой через 100 мс.
 */
export function Rise({
  children,
  className = "",
  stagger = false,
}: {
  children: ReactNode;
  className?: string;
  stagger?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reducedMotion()) {
      const f = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(f);
    }
    pending.set(el, () => setShown(true));
    listen();
    schedule();
    return () => {
      pending.delete(el);
    };
  }, []);
  return (
    <div
      ref={ref}
      data-reveal={shown ? "shown" : "hidden"}
      className={`${s.rise} ${stagger ? s.riseStagger : ""} ${shown ? s.risen : ""} ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * Тонкая розетка (ислими): лепестки и завитки одной линией, без заливки и блеска.
 * Цвет — currentColor, прозрачность задаёт дизайн.
 */
export function Rosette({
  className = "",
  petals = 8,
}: {
  className?: string;
  petals?: 8 | 12;
}) {
  const step = 360 / petals;
  return (
    <svg viewBox="-100 -100 200 200" className={`${s.rosette} ${className}`} aria-hidden data-decor>
      <circle r="96" />
      <circle r="90" strokeDasharray="1 5" />
      <circle r="30" />
      <circle r="6" />
      {Array.from({ length: petals }, (_, i) => (
        <g key={i} transform={`rotate(${i * step})`}>
          <path d="M0 -32 C 14 -46 14 -66 0 -82 C -14 -66 -14 -46 0 -32 Z" />
          <path
            transform={`rotate(${step / 2})`}
            d="M0 -36 C 6 -50 18 -54 20 -64 C 21 -71 14 -74 10 -69 C 7 -65 11 -60 15 -62"
          />
          <circle cy="-88" r="1.6" />
        </g>
      ))}
    </svg>
  );
}

/** Круглый медальон: тонкая двойная окружность, внутри — монограмма или дата */
export function Medallion({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`${s.medallion} ${className}`}>
      <svg viewBox="-50 -50 100 100" className={s.medallionRing} aria-hidden data-decor>
        <circle r="48" />
        <circle r="44.5" strokeDasharray="0.6 2.4" />
      </svg>
      <div className={s.medallionInner}>{children}</div>
    </div>
  );
}

/** Маленький разделитель между блоками: линия — ромбик — линия */
export function Divider({ className = "" }: { className?: string }) {
  return (
    <div className={`${s.divider} ${className}`} aria-hidden data-decor>
      <span />
      <i />
      <span />
    </div>
  );
}

/**
 * Без «висячих» слов: «ва», «ҳам» прилипают к следующему слову, «билан», «учун» — к предыдущему.
 */
export const tidy = glueWords;

/** Кружок «от руки» (чуть неровный, концы заходят друг за друга) */
export function HandCircle({
  seen,
  className = "",
  heart = false,
}: {
  seen: boolean;
  className?: string;
  /** Сердце вместо круга (цветочные дизайны) */
  heart?: boolean;
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
        d={heart ? HEART : CIRCLE}
      />
    </svg>
  );
}

const HEART =
  "M32 50C24 43 9 34 7.5 21.5 6.4 12.6 12.4 6 20 6c5.6 0 9.6 3.4 12 8.2C34.4 9.4 38.4 6 44 6c7.6 0 13.6 6.6 12.5 15.5C55 34 40 43 31.5 50.6";
const CIRCLE =
  "M44.5 7.8C36.2 3.1 22.4 3.6 13.6 10.2 5.2 16.6 3.3 28.4 8.6 37.6c5.6 9.6 18.9 13.9 30.6 11.5 11.4-2.3 19.6-10.9 19.2-21.1C58 18.3 50.6 10.6 41.2 7.4 35.6 5.5 29.9 5.7 25.2 6.9";

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
  heart = false,
}: {
  date: WeddingDate;
  className?: string;
  title?: boolean;
  heart?: boolean;
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
              <HandCircle seen={seen} heart={heart} className={s.calCircle} />
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
