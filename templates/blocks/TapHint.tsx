"use client";
import { useEffect, useRef } from "react";
import { t } from "@/texts/uz-cyrl";
import { useBrandTone } from "./brandTone";
import type { Invitation } from "./useInvitation";

/** Нажатие по этим элементам — их собственное действие, конверт не открываем */
const OWN_ACTION = "[data-open],[data-lang-switch],[data-brand-badge],a,input,select,textarea,[role=dialog]";

/**
 * Единая подсказка закрытого экрана во всех дизайнах (16.11.2026): «Таклифномани очинг» отдельной строкой внизу,
 * в палитре дизайна, появляется сразу после загрузки (мягкое проявление 0,6 с), затем лёгкий пульс раз в 2,6 с.
 * Свои надписи «открыть» дизайнов помечены data-open-prompt и скрыты (видны только «загрузка»/«ошибка»).
 * Весь закрытый экран кликабелен: касание в любом месте открывает конверт дизайна ([data-open]).
 * Без анимаций в телефоне — без пульса и проявления.
 */
export function TapHint({ inv }: { inv: Invitation }) {
  const ref = useRef<HTMLDivElement>(null);
  const tone = useBrandTone(ref, [inv.langReady]);
  const shown = !inv.started && inv.langReady;

  useEffect(() => {
    if (inv.started) return;
    document.documentElement.style.setProperty("--open-hint-space", "64px");
    const onClick = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (!target || target.closest(OWN_ACTION)) return;
      const opener = document.querySelector<HTMLElement>("[data-open]:not(:disabled)");
      opener?.click();
    };
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      document.documentElement.style.removeProperty("--open-hint-space");
    };
  }, [inv.started]);

  return (
    <div
      ref={ref}
      aria-hidden={!shown}
      data-tap-hint={shown ? "on" : "off"}
      className={`pointer-events-none fixed inset-x-0 z-[45] mx-auto flex w-full max-w-[430px] justify-center px-4 transition-opacity duration-[600ms] ease-out motion-reduce:transition-none ${inv.mode === "demo" ? "bottom-[calc(3.9rem+env(safe-area-inset-bottom))]" : "bottom-[calc(0.9rem+env(safe-area-inset-bottom))]"} ${shown ? "opacity-100" : "opacity-0"}`}
    >
      <span
        role="status"
        className="open-hint-pulse inline-flex h-10 items-center gap-2 rounded-full px-5 font-sans text-[14px] font-normal tracking-[0.04em]"
        style={{
          color: tone?.ink ?? "var(--n-ink, var(--c-ink, #3b2a1e))",
          backgroundColor: `color-mix(in srgb, ${tone?.paper ?? "var(--n-paper, var(--c-paper, #fffaf2))"} 88%, transparent)`,
          boxShadow: `0 0 0 1px color-mix(in srgb, ${tone?.ink ?? "var(--n-ink, var(--c-ink, #3b2a1e))"} 14%, transparent), 0 8px 22px -14px rgba(40,30,20,.55)`,
        }}
      >
        <span
          aria-hidden
          className="size-1.5 rounded-full"
          style={{ backgroundColor: tone?.accent ?? "currentColor" }}
        />
        {t.opening.openInvitation}
      </span>
    </div>
  );
}
