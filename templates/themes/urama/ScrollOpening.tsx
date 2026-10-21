"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { t } from "@/texts/uz-cyrl";
import type { Palette } from "../types";
import { Roll, Rod, SideBorders, parchment, starrySky } from "./decor";

/**
 * Открытие «Ўрамы»: свёрнутый свиток с красной лентой посреди звёздного неба.
 * Нажатие → лента падает → стержень поднимается к верху экрана, а пергамент
 * раскатывается вниз. Последний кадр совпадает с верхом страницы, поэтому
 * переход на страницу незаметен.
 */
type Stage = 0 | 1 | 2 | 3;
const EASE = [0.65, 0, 0.35, 1] as const;

/** Общие размеры: страница использует те же, чтобы кадры совпали */
export const SHEET_INSET = "mx-3.5";

export function ScrollOpening({
  palette,
  onOpenStart,
  onOpened,
}: {
  palette: Palette;
  onOpenStart: () => void;
  onOpened: () => void;
}) {
  const [stage, setStage] = useState<Stage>(0);
  const [move, setMove] = useState({ lift: 0, sheet: 0 });
  const columnRef = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  function open() {
    if (stage !== 0) return;
    onOpenStart();
    // Размеры экрана меряем в момент нажатия: у каждого телефона свои
    setMove({ lift: columnRef.current?.offsetTop ?? 0, sheet: window.innerHeight });
    setStage(1);
    timers.current = [
      setTimeout(() => setStage(2), 450),
      setTimeout(() => setStage(3), 2300),
      setTimeout(onOpened, 2800),
    ];
  }

  return (
    <motion.div
      className="fixed inset-0 z-40 overflow-hidden"
      style={starrySky}
      onClick={open}
      role="button"
      aria-label={t.opening.tapToOpen}
      animate={{ opacity: stage === 3 ? 0 : 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.p
        className="absolute inset-x-0 top-[22svh] text-center font-accent text-xl tracking-[0.3em] text-gold-light"
        animate={{ opacity: stage >= 1 ? 0 : 1 }}
      >
        {t.opening.invitation}
      </motion.p>

      {/* Колонка свитка: та же ширина, что у страницы */}
      <motion.div
        ref={columnRef}
        className="absolute left-1/2 w-full max-w-[480px] -translate-x-1/2"
        style={{ top: "calc(50svh - 40px)" }}
        initial={false}
        animate={{ y: stage >= 2 ? -move.lift : 0 }}
        transition={{ duration: 0.9, ease: EASE }}
      >
        <Rod />
        <motion.div
          className={`relative overflow-hidden ${SHEET_INSET}`}
          style={parchment}
          initial={false}
          animate={{ height: stage >= 2 ? move.sheet : 0 }}
          transition={{ duration: 1.7, ease: EASE }}
        >
          <SideBorders colors={palette} />
        </motion.div>
        <div className="relative">
          <Roll className="-mt-1" />
          {/* шёлковая лента с бантом */}
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            initial={false}
            animate={stage >= 1 ? { y: 80, rotate: 25, opacity: 0 } : { y: 0, rotate: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeIn" }}
          >
            <div className="mx-auto h-16 w-5 bg-accent shadow-md" />
            <svg viewBox="0 0 60 40" className="absolute -top-6 left-1/2 w-16 -translate-x-1/2" aria-hidden>
              <path d="M30 20C18 4 4 6 6 18s16 8 24 2z" fill="var(--c-accent)" />
              <path d="M30 20C42 4 56 6 54 18s-16 8-24 2z" fill="var(--c-accent)" />
              <path d="M30 20l-8 18h6zM30 20l8 18h-6z" fill="var(--c-accent)" opacity="0.85" />
              <circle cx="30" cy="20" r="4" fill="var(--c-gold)" />
            </svg>
          </motion.div>
        </div>
      </motion.div>

      <motion.div
        className="absolute inset-x-0 bottom-[20svh] text-center"
        animate={{ opacity: stage >= 1 ? 0 : 1 }}
      >
        <p className="soft-pulse font-body text-lg text-gold-light">{t.opening.tapToOpen}</p>
      </motion.div>
    </motion.div>
  );
}
