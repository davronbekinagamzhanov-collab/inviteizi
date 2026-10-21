"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { t } from "@/texts/uz-cyrl";
import { Fringe, Valance, velvet } from "./decor";

/**
 * Открытие «Парды»: два бархатных полотна закрывают экран.
 * Нажатие → золотая табличка гаснет → полотна собираются складками и уходят в стороны,
 * открывая сцену. Ламбрекен остаётся наверху и совпадает с ламбрекеном страницы.
 */
type Stage = 0 | 1 | 2;
const EASE = [0.7, 0, 0.25, 1] as const;

export function Curtain({
  initials,
  onOpenStart,
  onOpened,
}: {
  initials: [string, string];
  onOpenStart: () => void;
  onOpened: () => void;
}) {
  const [stage, setStage] = useState<Stage>(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  function open() {
    if (stage !== 0) return;
    onOpenStart();
    setStage(1);
    timers.current = [setTimeout(() => setStage(2), 450), setTimeout(onOpened, 2500)];
  }

  const half = (side: "left" | "right") => (
    <motion.div
      className={`absolute top-0 bottom-0 w-[51%] ${side === "left" ? "left-0" : "right-0"}`}
      style={{
        ...velvet,
        transformOrigin: side === "left" ? "left center" : "right center",
        boxShadow:
          side === "left"
            ? "inset -18px 0 30px rgba(0,0,0,0.55)"
            : "inset 18px 0 30px rgba(0,0,0,0.55)",
      }}
      initial={false}
      animate={
        stage === 2
          ? { x: side === "left" ? "-102%" : "102%", scaleX: 0.55, skewY: side === "left" ? 2 : -2 }
          : { x: "0%", scaleX: 1, skewY: 0 }
      }
      transition={{ duration: 1.9, ease: EASE }}
    >
      <Fringe className="absolute right-0 bottom-0 left-0 h-6" />
    </motion.div>
  );

  return (
    <motion.div
      className="fixed inset-0 z-40 overflow-hidden"
      onClick={open}
      role="button"
      aria-label={t.opening.tapToOpen}
      animate={{ opacity: stage === 2 ? [1, 1, 0] : 1 }}
      transition={{ duration: 2, times: [0, 0.85, 1] }}
    >
      {half("left")}
      {half("right")}

      {/* Ламбрекен — такой же стоит на самой странице, поэтому переход незаметен */}
      <Valance className="absolute inset-x-0 top-0 h-24" />

      {/* Золотая табличка по центру */}
      <motion.div
        className="absolute inset-0 flex flex-col items-center justify-center px-8"
        animate={stage >= 1 ? { opacity: 0, scale: 0.92 } : { opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div
          className="relative flex h-44 w-44 flex-col items-center justify-center rounded-full text-center shadow-[0_10px_40px_rgba(0,0,0,0.6)]"
          style={{
            background:
              "radial-gradient(circle at 35% 30%, var(--c-gold-light), var(--c-gold) 55%, #7d5d1c 100%)",
          }}
        >
          <div className="absolute inset-2 rounded-full border border-[#5b4210]/50" />
          <div className="absolute inset-[14px] rounded-full bg-primary-dark/95 shadow-inner" />
          <p className="relative font-display text-4xl text-gold-light">
            {initials[0]}
            <span className="mx-1 font-accent text-2xl text-gold">·</span>
            {initials[1]}
          </p>
          <p className="relative mt-1 max-w-[120px] font-accent text-[11px] leading-snug tracking-[0.18em] text-gold uppercase">
            {t.opening.invitation}
          </p>
        </div>

        <p className="soft-pulse mt-10 rounded-full border border-gold/50 bg-black/30 px-6 py-2.5 font-accent text-base tracking-[0.15em] text-gold-light">
          {t.opening.tapToOpen}
        </p>
      </motion.div>
    </motion.div>
  );
}
