"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { MOTION, MOTION_CSS_EASE } from "./motion";

/**
 * Появление блока при листании. Каждый дизайн выбирает свой эффект.
 *
 * Правило: пустого экрана не бывает никогда.
 * - Блок запускается заранее — когда до него остаётся ещё четверть экрана.
 * - Анимация по общей системе движения (0,9 с, мягкое замедление) и начинается не с нуля: блок сразу виден на 35%.
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

const revealTransition = (delay: number) => {
  const d = `${MOTION.base}s ${MOTION_CSS_EASE} ${Math.min(delay, MOTION.step * 3)}s`;
  return `opacity ${d}, transform ${d}, clip-path ${d}`;
};

export function Reveal({
  children,
  delay = 0,
  effect = "rise",
  className,
}: {
  children: ReactNode;
  /** Задержка для лесенки внутри блока: шаг MOTION.step, не больше трёх шагов */
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
          transition: state === "instant" ? "none" : revealTransition(delay),
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
      // сверху — целый экран запаса: блок, который гость «перепрыгнул» быстрым листанием, тоже показывается
    }, { rootMargin: "100% 0px 25% 0px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  return state;
}
