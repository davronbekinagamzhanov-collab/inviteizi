"use client";

import { motion } from "motion/react";
import { t } from "@/texts/uz-cyrl";

const BASE =
  "fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 flex h-12 w-12 items-center justify-center active:scale-90";
const DEFAULT_LOOK =
  "rounded-full bg-primary text-gold-light shadow-xl shadow-black/30 ring-1 ring-gold/70";

/** Кнопка ▶/⏸ в углу экрана. className — внешний вид от дизайна */
export function MusicButton({
  playing,
  onToggle,
  className,
}: {
  playing: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      aria-label={playing ? t.music.pause : t.music.play}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3, duration: 0.4 }}
      className={`${BASE} ${className ?? DEFAULT_LOOK}`}
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
