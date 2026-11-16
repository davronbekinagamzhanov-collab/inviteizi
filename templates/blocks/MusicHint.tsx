"use client";

import { useEffect, useState } from "react";
import { t } from "@/texts/uz-cyrl";
import type { Invitation } from "./useInvitation";

/**
 * Дизайн без заставки (Оддий, Варақланадиган): мягкая заметная кнопка «▶ Мусиқа» рядом с круглой кнопкой музыки.
 * Браузер включает звук только после нажатия — поэтому кнопка, а не автозапуск.
 * 17.11.2026: на нетронутом первом экране её нет (закрывала нижнюю строку — дату/место). Появляется после первой
 * прокрутки, когда нижняя строка первого экрана уже поднялась, держится 5 секунд и уходит; уходит и когда музыка играет.
 */
export const MUSIC_HINT_AFTER_PX = 24;
const MUSIC_HINT_MS = 5000;

export function MusicHint({ inv }: { inv: Invitation }) {
  const [scrolled, setScrolled] = useState(false);
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    const check = () => {
      if (window.scrollY > MUSIC_HINT_AFTER_PX) setScrolled(true);
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    return () => window.removeEventListener("scroll", check);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- раз заиграло, подсказка больше не нужна
    if (inv.playing) setTouched(true);
  }, [inv.playing]);
  // 5 секунд с первой прокрутки, дальше остаётся только круглая кнопка
  useEffect(() => {
    if (!scrolled) return;
    const id = setTimeout(() => setTouched(true), MUSIC_HINT_MS);
    return () => clearTimeout(id);
  }, [scrolled]);
  // Звук не включился сам (запрет телефона) — кнопка видна сразу, у любого дизайна, пока музыка не заиграет
  const blocked = inv.musicBlocked && !inv.playing;
  if (!inv.hasMusic || (!blocked && (inv.hasOpening || touched))) return null;
  const shown = blocked || (scrolled && !inv.playing);
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
      className={`fixed right-[calc(max(1rem,calc((100vw-430px)/2+1rem))+3.75rem)] ${inv.mode === "demo" ? "bottom-[calc(3.6rem+env(safe-area-inset-bottom))]" : "bottom-[calc(1.1rem+env(safe-area-inset-bottom))]"} z-40 inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-full bg-[var(--n-paper,#fffaf2)]/90 pl-3 pr-4 font-sans text-[14px] font-medium text-[var(--n-ink,#3b2a1e)] shadow-[0_8px_22px_-10px_rgba(40,30,20,.55)] ring-1 ring-[var(--n-ink,#3b2a1e)]/15 backdrop-blur-sm transition-[opacity,transform] duration-500 ease-[cubic-bezier(.22,1,.36,1)] active:scale-95 ${shown ? "opacity-100" : "pointer-events-none translate-y-2 opacity-0"}`}
    >
      <span
        aria-hidden
        className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--n-ink,#3b2a1e)] text-[var(--n-paper,#fffaf2)]"
      >
        <svg viewBox="0 0 24 24" className="ml-0.5 h-3.5 w-3.5">
          <path fill="currentColor" d="M8 5.5v13l11-6.5z" />
        </svg>
      </span>
      {blocked ? t.musicBlocked : t.musicHint}
    </button>
  );
}
