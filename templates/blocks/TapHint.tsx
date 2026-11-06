"use client";
import { useEffect, useState } from "react";
import { t } from "@/texts/uz-cyrl";
import type { Invitation } from "./useInvitation";

const DELAY_MS = 3000;

/**
 * Подсказка открытия во всех дизайнах с заставкой (через InvitationShell): гость 3 с не касался экрана —
 * внизу мягко пульсирует нарисованная рука и «Очиш учун экранга босинг». Первое касание (или открытие) — исчезает навсегда.
 * Нажатия проходят сквозь подсказку; имена и дата выше — не закрываются. Без анимаций в телефоне — без пульса.
 */
export function TapHint({ inv }: { inv: Invitation }) {
  const [touched, setTouched] = useState(false);
  const [due, setDue] = useState(false);
  useEffect(() => {
    if (inv.started) return;
    const id = setTimeout(() => setDue(true), DELAY_MS);
    const done = () => setTouched(true);
    const opts = { capture: true, passive: true } as const;
    window.addEventListener("pointerdown", done, opts);
    window.addEventListener("touchstart", done, opts);
    window.addEventListener("keydown", done, opts);
    return () => {
      clearTimeout(id);
      window.removeEventListener("pointerdown", done, opts);
      window.removeEventListener("touchstart", done, opts);
      window.removeEventListener("keydown", done, opts);
    };
  }, [inv.started]);
  const shown = due && !touched && !inv.started && inv.langReady;
  return (
    <div
      aria-hidden={!shown}
      data-tap-hint={shown ? "on" : "off"}
      className={`pointer-events-none fixed inset-x-0 z-[45] mx-auto flex w-full max-w-[430px] justify-center px-4 transition-[opacity,transform] duration-700 ease-[cubic-bezier(.22,1,.36,1)] ${inv.mode === "demo" ? "bottom-[calc(3.9rem+env(safe-area-inset-bottom))]" : "bottom-[calc(1.4rem+env(safe-area-inset-bottom))]"} ${shown ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"}`}
    >
      <span role="status" className="inline-flex items-center gap-2.5 rounded-full bg-[#fffaf2]/92 py-2 pl-2.5 pr-4 font-sans text-[15px] font-medium leading-tight text-[#3b2a1e] shadow-[0_10px_26px_-12px_rgba(40,30,20,.6)] ring-1 ring-[#3b2a1e]/12 backdrop-blur-md">
        <span className="relative grid size-9 shrink-0 place-items-center">
          <span className="tap-ring absolute inset-0 rounded-full bg-[#a8772a]/25" />
          <svg className="tap-finger relative" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8a5d1c" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9.5 11.5V5.2a1.6 1.6 0 0 1 3.2 0v5.3" />
            <path d="M12.7 10.4v-.9a1.6 1.6 0 0 1 3.2 0v1.6" />
            <path d="M15.9 10.6a1.6 1.6 0 0 1 3.1.4v3.3c0 3.6-2.5 6.2-6 6.2h-.7c-2 0-3.4-.8-4.6-2.4l-2.6-3.6a1.6 1.6 0 0 1 2.4-2.1l1.9 1.8" />
          </svg>
        </span>
        {t.opening.tapScreen}
      </span>
    </div>
  );
}
