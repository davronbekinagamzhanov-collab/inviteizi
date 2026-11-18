"use client";
import { DEMO_RSVP_SLUG } from "@/lib/types";

import { useState, type CSSProperties, type FormEvent } from "react";
import { t } from "@/texts/uz-cyrl";

const STORE = "inviteizi-rsvp-v1";
const MAX_GUESTS = 20;

/** Ключ устройства: повторный ответ гостя заменяет прежний, а не добавляет новый */
function visitorKey() {
  const make = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-guest`);
  try {
    const saved = localStorage.getItem(STORE);
    if (saved) return saved;
    const key = make();
    localStorage.setItem(STORE, key);
    return key;
  } catch {
    return make();
  }
}

type State = "form" | "sending" | "done" | "error" | "limited";

/**
 * Цвета формы в цветах дизайна: CSS-переменные --rsvp-* (без них — прежняя карточка).
 * paper — фон, ink — текст, line — рамки, soft — кнопки «−/+» и «Келолмайман», accent — «Келаман», font — шрифт.
 */
export type RsvpLook = { paper: string; ink: string; line: string; soft: string; accent: string; accentInk?: string; font?: string; radius?: string; buttonRadius?: string };

export function rsvpVars(l: RsvpLook): CSSProperties {
  return {
    "--rsvp-paper": l.paper, "--rsvp-ink": l.ink, "--rsvp-line": l.line, "--rsvp-soft": l.soft,
    "--rsvp-accent": l.accent, "--rsvp-accent-ink": l.accentInk ?? "#fff", "--rsvp-font": l.font ?? "inherit", "--rsvp-radius": l.radius ?? "16px", "--rsvp-btn-radius": l.buttonRadius ?? "0.75rem",
  } as CSSProperties;
}

/** Карточка со своими цветами: одинаково читается на светлых и тёмных дизайнах */
export function Rsvp({ slug, preview: previewProp, look }: { slug: string; preview: boolean; look?: RsvpLook }) {
  const preview = previewProp || slug === DEMO_RSVP_SLUG;
  const [name, setName] = useState("");
  const [guests, setGuests] = useState(1);
  const [state, setState] = useState<State>("form");
  const [attending, setAttending] = useState<boolean | null>(null);
  const [trap, setTrap] = useState("");

  const tx = t.rsvp;
  async function submit(e: FormEvent, value: boolean) {
    e.preventDefault();
    if (!name.trim() || state === "sending") return;
    setAttending(value);
    // Намуна: форма живая, но на сервер ничего не уходит
    if (preview) {
      setState("done");
      return;
    }
    setState("sending");
    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, visitorKey: visitorKey(), name, guests: value ? guests : 0, attending: value, website: trap }),
      });
      setState(res.ok ? "done" : res.status === 429 ? "limited" : "error");
    } catch {
      setState("error");
    }
  }

  return (
    <section data-rsvp className="relative z-10 px-4 pt-8" style={look ? rsvpVars(look) : undefined}>
      <div className={`mx-auto max-w-[380px] rounded-[var(--rsvp-radius,1rem)] bg-[var(--rsvp-paper,#fbf6ec)] p-5 text-[var(--rsvp-ink,#2b1f16)] shadow-lg shadow-black/10 ring-1 ring-[var(--rsvp-line,#c9a86a80)] ${look ? "font-[family-name:var(--rsvp-font)]" : "font-sans"}`}>
        <h2 className="text-center text-[20px] font-semibold">{tx.title}</h2>
        {preview && <p className="mt-2 rounded-xl bg-[var(--rsvp-soft,#f6e3b4)] px-3 py-2 text-center text-[15px] font-semibold">{tx.preview}</p>}
        {state === "done" ? (
          <div className="mt-3 text-center">
            <p className="text-[16px]">{preview ? tx.previewThanks : attending ? tx.thanksYes : tx.thanksNo}</p>
            <button type="button" onClick={() => setState("form")} className="mt-3 min-h-11 rounded-full px-4 text-[15px] underline">
              {tx.change}
            </button>
          </div>
        ) : (
          <form onSubmit={(e) => e.preventDefault()} className="mt-4 flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-[15px]">
              {tx.name}
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                autoComplete="name"
                className="min-h-12 rounded-[var(--rsvp-btn-radius,0.75rem)] border border-[var(--rsvp-line,#c9a86a)] bg-white px-3 text-[17px] text-[var(--rsvp-ink,#2b1f16)]"
              />
            </label>
            {/* Ловушка для роботов: человек это поле не видит */}
            <input aria-hidden tabIndex={-1} autoComplete="off" name="website" value={trap} onChange={(e) => setTrap(e.target.value)} className="absolute -left-[9999px] h-0 w-0 opacity-0" />
            <div className="flex items-center justify-between gap-3 text-[15px]">
              <span>{tx.guests}</span>
              <span className="flex items-center gap-2">
                <button type="button" aria-label={tx.less} onClick={() => setGuests((n) => Math.max(1, n - 1))} className="h-11 w-11 rounded-full bg-[var(--rsvp-soft,#efe3cd)] text-[20px]">−</button>
                <output className="w-8 text-center text-[18px] font-semibold">{guests}</output>
                <button type="button" aria-label={tx.more} onClick={() => setGuests((n) => Math.min(MAX_GUESTS, n + 1))} className="h-11 w-11 rounded-full bg-[var(--rsvp-soft,#efe3cd)] text-[20px]">+</button>
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button type="submit" disabled={!name.trim() || state === "sending"} onClick={(e) => submit(e, true)} className="min-h-12 rounded-[var(--rsvp-btn-radius,0.75rem)] bg-[var(--rsvp-accent,#3f6b47)] px-2 text-[16px] font-semibold text-[var(--rsvp-accent-ink,#fff)] disabled:opacity-50">{tx.yes}</button>
              <button type="button" disabled={!name.trim() || state === "sending"} onClick={(e) => submit(e, false)} className="min-h-12 rounded-[var(--rsvp-btn-radius,0.75rem)] bg-[var(--rsvp-soft,#efe3cd)] px-2 text-[16px] font-semibold text-[var(--rsvp-ink,#2b1f16)] disabled:opacity-50">{tx.no}</button>
            </div>
            {state === "error" && <p role="alert" className="text-center text-[14px] text-[#9b2c1f]">{tx.error}</p>}
            {state === "limited" && <p role="alert" className="text-center text-[14px] text-[#9b2c1f]">{tx.limited}</p>}
          </form>
        )}
      </div>
    </section>
  );
}
