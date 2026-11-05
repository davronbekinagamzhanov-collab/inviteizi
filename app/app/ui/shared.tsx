"use client";
/** Общее для экранов приложения: тексты, тост, главная кнопка (native в Telegram, своя — в браузере) */
import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from "react";
import type { AppTexts } from "@/texts/app-uz";
import { insideTelegram, useMainButton } from "./telegram";
import s from "../app.module.css";

const noSubscribe = () => () => undefined;

export const TextsContext = createContext<AppTexts | null>(null);
export const useT = () => useContext(TextsContext)!;

export function Toast({ text, onDone }: { text: string | null; onDone: () => void }) {
  useEffect(() => {
    if (!text) return;
    const id = setTimeout(onDone, 2200);
    return () => clearTimeout(id);
  }, [text, onDone]);
  return text ? (
    <div className={s.toast} role="status" aria-live="polite" key={text}>
      {text}
    </div>
  ) : null;
}

/** Главное действие экрана. В Telegram — native MainButton, в браузере — кнопка внизу страницы */
export function MainAction({ text, onClick, active = true, progress = false }: { text: string | null; onClick: () => void; active?: boolean; progress?: boolean }) {
  useMainButton(text, onClick, { active, progress });
  const inside = useSyncExternalStore(noSubscribe, insideTelegram, () => true);
  if (inside || !text) return null;
  return (
    <div className={s.mainBar}>
      <button type="button" className={s.btn} onClick={onClick} disabled={!active || progress} data-main-action>
        {progress ? "…" : text}
      </button>
    </div>
  );
}

export function Section({ title, extra, children }: { title?: ReactNode; extra?: ReactNode; children: ReactNode }) {
  return (
    <section className={s.section}>
      {title && (
        <h2 className={s.sectionTitle}>
          <span>{title}</span>
          {extra}
        </h2>
      )}
      {children}
    </section>
  );
}

export function Field({ label, error, help, children }: { label: string; error?: string | null; help?: string; children: ReactNode }) {
  return (
    <label className={s.field}>
      <span className={s.label}>{label}</span>
      {children}
      {error ? <span className={s.err}>{error}</span> : help ? <span className={s.help}>{help}</span> : null}
    </label>
  );
}
