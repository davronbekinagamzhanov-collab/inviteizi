"use client";

import { useEffect, useState } from "react";
import { t } from "@/texts/uz-cyrl";
import type { Invitation } from "./useInvitation";

/**
 * Дизайн без заставки (Оддий, Варақланадиган): на первом экране мягкая заметная кнопка «▶ Мусиқани ёқиш».
 * Браузер включает звук только после нажатия — поэтому кнопка, а не автозапуск. Уходит, когда музыка играет
 * или гость пролистал первый экран (там уже есть круглая кнопка музыки).
 */
export function MusicHint({ inv }: { inv: Invitation }) {
  const [onFirstScreen, setOnFirstScreen] = useState(true);
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    const check = () => setOnFirstScreen(window.scrollY < window.innerHeight * 0.5);
    check();
    window.addEventListener("scroll", check, { passive: true });
    return () => window.removeEventListener("scroll", check);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- раз заиграло, подсказка больше не нужна
    if (inv.playing) setTouched(true);
  }, [inv.playing]);
  if (!inv.hasMusic || inv.hasOpening || touched) return null;
  const shown = onFirstScreen && !inv.playing;
  return (
    <button
      type="button"
      data-music-button
      data-music-hint
      aria-hidden={!shown}
      tabIndex={shown ? undefined : -1}
      onClick={() => {
        setTouched(true);
        inv.toggleMusic();
      }}
      className={`fixed left-1/2 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-40 inline-flex h-11 -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-[var(--n-paper,#fffaf2)]/90 pl-3 pr-4 font-sans text-[14px] font-medium text-[var(--n-ink,#3b2a1e)] shadow-[0_8px_22px_-10px_rgba(40,30,20,.55)] ring-1 ring-[var(--n-ink,#3b2a1e)]/15 backdrop-blur-sm transition-[opacity,transform] duration-500 ease-[cubic-bezier(.22,1,.36,1)] active:scale-95 ${shown ? "opacity-100" : "pointer-events-none translate-y-2 opacity-0"}`}
    >
      <span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--n-ink,#3b2a1e)] text-[var(--n-paper,#fffaf2)]">
        <svg viewBox="0 0 24 24" className="ml-0.5 h-3.5 w-3.5"><path fill="currentColor" d="M8 5.5v13l11-6.5z" /></svg>
      </span>
      {t.musicHint}
    </button>
  );
}
