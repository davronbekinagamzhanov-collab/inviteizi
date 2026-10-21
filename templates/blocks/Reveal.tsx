"use client";

import { motion, type Variants } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Появление блока при листании. Каждый дизайн выбирает свой эффект.
 * Короткие и лёгкие анимации: при быстром листании блок уже виден, пустого экрана нет.
 */
export const revealEffects = {
  rise: { hidden: { opacity: 0, y: 18 }, shown: { opacity: 1, y: 0 } },
  // «луч прожектора»: из лёгкой дымки и чуть меньше размером
  spotlight: { hidden: { opacity: 0, scale: 0.95 }, shown: { opacity: 1, scale: 1 } },
  // разворачивается сверху вниз, как свиток
  unroll: {
    hidden: { opacity: 0, clipPath: "inset(0% 0% 100% 0%)" },
    shown: { opacity: 1, clipPath: "inset(0% 0% 0% 0%)" },
  },
} satisfies Record<string, Variants>;

export type RevealEffect = keyof typeof revealEffects;

export function Reveal({
  children,
  delay = 0,
  effect = "rise",
  className,
}: {
  children: ReactNode;
  delay?: number;
  effect?: RevealEffect;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const shown = useShownOnScroll(ref);

  return (
    <motion.div
      ref={ref}
      className={className}
      variants={revealEffects[effect]}
      initial="hidden"
      animate={shown ? "shown" : "hidden"}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Блок показывается, как только его верх оказался чуть ниже края экрана или выше.
 * Проверяем при каждом скролле (а не только «пересечение»), поэтому даже если гость
 * пролистал блок за долю секунды, он всё равно появится и не останется пустым.
 */
function useShownOnScroll(ref: React.RefObject<HTMLElement | null>) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;

    const check = () => {
      frame = 0;
      if (el.getBoundingClientRect().top < window.innerHeight * 1.05) {
        setShown(true);
        stop();
      }
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

  return shown;
}
