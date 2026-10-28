"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

/**
 * Появление блока при листании. Каждый дизайн выбирает свой эффект.
 *
 * Правило: пустого экрана не бывает никогда.
 * - Блок запускается заранее — когда до него остаётся ещё четверть экрана.
 * - Анимация короткая (0,35 с) и начинается не с нуля: блок сразу виден на 35%.
 * - Если гость пролистал так быстро, что блок уже на экране, — он показывается мгновенно.
 *
 * Работает на CSS-переходах (а не на JS-анимации): состояние в DOM всегда совпадает с тем,
 * что видно, и анимация не может «застрять» на полпути.
 */
export const revealEffects = {
  rise: { opacity: 0.35, transform: "translateY(14px)" },
  // «луч прожектора»: из лёгкой дымки и чуть меньше размером
  spotlight: { opacity: 0.35, transform: "scale(0.97)" },
  // мягкое проявление без сдвига
  fade: { opacity: 0.35 },
  // разворачивается сверху вниз, как свиток (край не уходит в ноль).
  // Отрицательные отступы — чтобы не обрезать тени карточек
  unroll: { opacity: 0.5, clipPath: "inset(-60px -60px 40% -60px)" },
} satisfies Record<string, CSSProperties>;

export type RevealEffect = keyof typeof revealEffects;

type State = "hidden" | "animate" | "instant";

const SHOWN: CSSProperties = { opacity: 1, transform: "none" };
// clip-path только у «свитка»: у остальных он обрезал бы тени
const SHOWN_UNROLL: CSSProperties = { ...SHOWN, clipPath: "inset(-60px -60px -60px -60px)" };

export function Reveal({
  children,
  delay = 0,
  effect = "rise",
  className,
}: {
  children: ReactNode;
  /** Задержка, не больше 0,15 с (для лесенки внутри блока) */
  delay?: number;
  effect?: RevealEffect;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const state = useRevealState(ref);

  const style: CSSProperties =
    state === "hidden"
      ? revealEffects[effect]
      : {
          ...(effect === "unroll" ? SHOWN_UNROLL : SHOWN),
          transition:
            state === "instant"
              ? "none"
              : `opacity 0.35s ease-out ${Math.min(delay, 0.15)}s, transform 0.35s cubic-bezier(0.22,1,0.36,1) ${Math.min(delay, 0.15)}s, clip-path 0.35s ease-out ${Math.min(delay, 0.15)}s`,
        };

  return (
    <div ref={ref} data-reveal={state} className={`motion-reduce:!transition-none ${className ?? ""}`} style={style}>
      {children}
    </div>
  );
}

/** Browser observes blocks without a scroll/resize handler for every paragraph. */
function useRevealState(ref: React.RefObject<HTMLElement | null>) {
  const [state, setState] = useState<State>("hidden");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const frame = requestAnimationFrame(() => setState("instant"));
      return () => cancelAnimationFrame(frame);
    }
    const observer = new IntersectionObserver(entries => {
      const entry = entries[0];
      if (!entry?.isIntersecting) return;
      setState(entry.boundingClientRect.top < window.innerHeight * 0.85 ? "instant" : "animate");
      observer.disconnect();
    }, { rootMargin: "25% 0px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  return state;
}
