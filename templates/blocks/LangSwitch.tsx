"use client";

import type { InviteLang } from "@/texts/invite-lang";
import type { Invitation } from "./useInvitation";

const LABEL: Record<InviteLang, string> = { uz: "ЎЗ", ru: "РУ", kk: "ҚЗ" };
const NAME: Record<InviteLang, string> = { uz: "Ўзбекча", ru: "Русский", kk: "Қазақша" };

// Сверху справа в колонке телефона: внизу — кнопка музыки и плашка InviteIZI, сверху по центру — мягкая плашка
const POS = "top-[calc(0.75rem+env(safe-area-inset-top))] right-[max(0.75rem,calc((100vw-430px)/2+0.75rem))]";

/**
 * «ЎЗ · РУ · ҚЗ» — только языки, которые выбрал клиент. Маленький, полупрозрачный, в цветах дизайна
 * (--n-paper / --n-ink у натуральных, иначе молочный и тёмно-коричневый). Нет других языков — не показывается.
 */
export function LangSwitch({ inv }: { inv: Invitation }) {
  if (inv.langs.length < 2) return null;
  return (
    <div
      data-lang-switch
      role="group"
      aria-label="Тил · Язык · Тіл"
      className={`fixed ${POS} z-[60] flex h-8 items-center gap-0.5 rounded-full bg-[var(--n-paper,#fffaf2)]/80 p-0.5 font-sans text-[11px] font-semibold tracking-[0.06em] text-[var(--n-ink,#3b2a1e)] shadow-[0_4px_14px_-8px_rgba(40,30,20,.5)] ring-1 ring-[var(--n-ink,#3b2a1e)]/12 backdrop-blur-sm`}
    >
      {inv.langs.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          aria-label={NAME[l]}
          aria-pressed={inv.lang === l}
          onClick={() => inv.setLang(l)}
          className={`h-7 min-w-[32px] rounded-full px-2 transition-colors duration-300 active:scale-95 ${inv.lang === l ? "bg-[var(--n-ink,#3b2a1e)] text-[var(--n-paper,#fffaf2)]" : "opacity-70"}`}
        >
          {LABEL[l]}
        </button>
      ))}
    </div>
  );
}
