"use client";

import { motion, type Variants } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Появление блока при листании. Каждый дизайн выбирает свой эффект.
 *
 * Правило: пустого экрана не бывает никогда.
 * - Блок запускается заранее — когда до него остаётся ещё четверть экрана.
 * - Анимация короткая (0,35 с) и начинается не с нуля: блок сразу виден на 35%.
 * - Если гость пролистал так быстро, что блок уже на экране, — он показывается мгновенно.
 */
export const revealEffects = {
  rise: { hidden: { opacity: 0.35, y: 14 }, shown: { opacity: 1, y: 0 } },
  // «луч прожектора»: из лёгкой дымки и чуть меньше размером
  spotlight: { hidden: { opacity: 0.35, scale: 0.97 }, shown: { opacity: 1, scale: 1 } },
  // мягкое проявление без сдвига
  fade: { hidden: { opacity: 0.35 }, shown: { opacity: 1 } },
  // разворачивается сверху вниз, как свиток (край не уходит в ноль)
  unroll: {
    hidden: { opacity: 0.5, clipPath: "inset(0% 0% 40% 0%)" },
    shown: { opacity: 1, clipPath: "inset(0% 0% 0% 0%)" },
  },
} satisfies Record<string, Variants>;

export type RevealEffect = keyof typeof revealEffects;

type State = "hidden" | "animate" | "instant";

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

  return (
    <motion.div
      ref={ref}
      className={className}
      variants={revealEffects[effect]}
      initial="hidden"
      animate={state === "hidden" ? "hidden" : "shown"}
      transition={
        state === "instant"
          ? { duration: 0 }
          : { duration: 0.35, delay: Math.min(delay, 0.15), ease: [0.22, 1, 0.36, 1] }
      }
    >
      {children}
    </motion.div>
  );
}

/**
 * Проверяем положение при каждом кадре скролла (а не только «пересечение»):
 * даже если гость пролистал блок за долю секунды, он всё равно появится.
 */
function useRevealState(ref: React.RefObject<HTMLElement | null>) {
  const [state, setState] = useState<State>("hidden");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;
    let first = true;

    const check = () => {
      frame = 0;
      const { top } = el.getBoundingClientRect();
      const h = window.innerHeight;
      if (top < h * 1.25) {
        // уже глубоко на экране после быстрого листания — без анимации
        setState(!first && top < h * 0.85 ? "instant" : "animate");
        stop();
      }
      first = false;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(check);
    };
    function stop() {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    check();
    return stop;
  }, [ref]);

  return state;
}
