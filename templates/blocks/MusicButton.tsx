"use client";

import { motion } from "motion/react";
import { t } from "@/texts/uz-cyrl";
import { MOTION } from "@/templates/blocks/motion";

// right: на компьютере кнопка стоит в углу колонки шириной 430px, а не в углу экрана
const BASE =
  "fixed right-[max(1rem,calc((100vw-430px)/2+1rem))] z-40 flex h-12 w-12 items-center justify-center active:scale-90";
// в НАМУНА внизу плашка «Тўловдан сўнг…» — кнопку поднимаем над ней
const BOTTOM = "bottom-[calc(1rem+env(safe-area-inset-bottom))]";
const BOTTOM_RAISED = "bottom-[calc(3.5rem+env(safe-area-inset-bottom))]";
const DEFAULT_LOOK =
  "rounded-full bg-primary text-gold-light shadow-xl shadow-black/30 ring-1 ring-gold/70";

/** Кнопка ▶/⏸ в углу экрана. className — внешний вид от дизайна */
export function MusicButton({
  playing,
  onToggle,
  className,
  raised = false,
  variant = "default",
}: {
  playing: boolean;
  onToggle: () => void;
  className?: string;
  raised?: boolean;
  /** soft — круглая полупрозрачная кнопка с линейной иконкой (натуральные дизайны) */
  variant?: "default" | "soft";
}) {
  if (variant === "soft") return <SoftMusicButton playing={playing} onToggle={onToggle} className={className} raised={raised} />;
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      aria-label={playing ? t.music.pause : t.music.play}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3, duration: MOTION.fast, ease: MOTION.ease }}
      className={`${BASE} ${raised ? BOTTOM_RAISED : BOTTOM} ${className ?? DEFAULT_LOOK}`}
    >
      {playing && (
        <span className="absolute inset-0 animate-ping rounded-[inherit] ring-1 ring-current opacity-40 [animation-duration:2.4s]" />
      )}
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        {playing ? (
          <path fill="currentColor" d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />
        ) : (
          <path fill="currentColor" d="M8 5.5v13l11-6.5z" />
        )}
      </svg>
    </motion.button>
  );
}

/**
 * Круглая «мягкая» кнопка: полупрозрачный фон в цвет дизайна с размытием, тонкая обводка, линейная иконка динамика.
 * Пока играет музыка, по тонкому кольцу медленно (7 с на оборот) идёт точка — как пластинка; на паузе стоит.
 * className задаёт цвета: фон (bg-…/70), текст (text-…), обводку (ring-…).
 */
function SoftMusicButton({ playing, onToggle, className, raised }: { playing: boolean; onToggle: () => void; className?: string; raised: boolean }) {
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      aria-label={playing ? t.music.pause : t.music.play}
      aria-pressed={playing}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3, duration: MOTION.fast, ease: MOTION.ease }}
      data-music-button
      className={`${BASE} ${raised ? BOTTOM_RAISED : BOTTOM} !h-[46px] !w-[46px] rounded-full ring-1 shadow-[0_6px_18px_-8px_rgba(40,30,20,.45)] backdrop-blur-md transition-transform duration-300 ${className ?? "bg-white/70 text-[#3a2a22] ring-black/10"}`}
    >
      <span
        aria-hidden
        className={`pointer-events-none absolute -inset-[5px] rounded-full border border-current opacity-30 transition-opacity duration-300 animate-[spin_7s_linear_infinite] motion-reduce:animate-none ${playing ? "" : "[animation-play-state:paused] !opacity-0"}`}
      >
        <span className="absolute left-1/2 top-[-2.5px] h-[4px] w-[4px] -translate-x-1/2 rounded-full bg-current" />
      </span>
      <svg viewBox="0 0 24 24" className="h-[21px] w-[21px]" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M4 9.5h3l4.5-3.8v12.6L7 14.5H4z" />
        <g className={`transition-opacity duration-300 ${playing ? "opacity-100" : "opacity-0"}`}>
          <path d="M15 9.2a4 4 0 0 1 0 5.6" />
          <path d="M17.6 6.8a7.4 7.4 0 0 1 0 10.4" />
        </g>
        <g className={`transition-opacity duration-300 ${playing ? "opacity-0" : "opacity-100"}`}>
          <path d="M15.5 9.5l5 5M20.5 9.5l-5 5" />
        </g>
      </svg>
    </motion.button>
  );
}
