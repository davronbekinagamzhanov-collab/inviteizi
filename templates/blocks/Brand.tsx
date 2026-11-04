import { botLink } from "@/lib/brand";
import { t } from "@/texts/uz-cyrl";

// Слева внизу: кнопка музыки стоит справа, поэтому они не пересекаются
const LEFT = "left-[max(0.75rem,calc((100vw-430px)/2+0.75rem))]";
const BOTTOM = "bottom-[calc(1.5rem+env(safe-area-inset-bottom))]";
// В НАМУНА внизу плашка «Тўловдан сўнг…» — поднимаем над ней, как кнопку музыки
const BOTTOM_RAISED = "bottom-[calc(4rem+env(safe-area-inset-bottom))]";

/** Маленькая плашка на всё время просмотра. Без размытия фона: оно тормозит на слабых телефонах */
export function BrandBadge({ raised }: { raised: boolean }) {
  return (
    <a
      data-brand-badge
      href={botLink("badge")}
      target="_blank"
      rel="noopener"
      aria-label={t.brand.badgeLabel}
      className={`fixed ${LEFT} ${raised ? BOTTOM_RAISED : BOTTOM} z-40 inline-flex h-8 items-center gap-1 rounded-full bg-[#2b1f16]/60 px-3 font-sans text-[12px] font-medium tracking-wide text-white shadow-md shadow-black/20 ring-1 ring-white/25 active:scale-95`}
    >
      <span aria-hidden className="text-[#f0d596]">✦</span>
      {t.brand.badge}
    </a>
  );
}

/** Автор фото (Unsplash и др.): «Сурат: Имя / Unsplash» со ссылками */
export type PhotoCredit = { author: string; authorUrl: string; source: string; sourceUrl: string };

/** Самый конец приглашения. Снизу запас: плашка и кнопка музыки не закрывают ссылку */
export function BrandFooter({ credits = [], creditClassName = "text-current opacity-60" }: { credits?: PhotoCredit[]; creditClassName?: string }) {
  return (
    <footer data-brand-footer className="relative z-10 flex flex-col items-center gap-3 px-4 pt-6 pb-28">
      {credits.length > 0 && (
        <p data-photo-credits className={`max-w-[360px] text-center font-sans text-[11px] leading-relaxed ${creditClassName}`}>
          {credits.map((c, i) => (
            <span key={c.authorUrl} className="inline-block">
              {i > 0 && <span aria-hidden className="px-1.5">·</span>}
              {t.photoCredits.label}{" "}
              <a href={c.authorUrl} target="_blank" rel="noopener" className="underline underline-offset-2">{c.author}</a>
              {" / "}
              <a href={c.sourceUrl} target="_blank" rel="noopener" className="underline underline-offset-2">{c.source}</a>
            </span>
          ))}
        </p>
      )}
      <div className="flex flex-col items-center gap-2 rounded-2xl bg-[#2b1f16]/70 px-5 py-3 text-center font-sans text-white ring-1 ring-white/20">
        <p className="text-[13px] leading-snug">{t.brand.footer}</p>
        <a href={botLink("footer")} target="_blank" rel="noopener" className="rounded-full bg-[#f0d596] px-4 py-2 text-[14px] font-semibold text-[#2b1f16] active:scale-95">
          {t.brand.footerLink}
        </a>
      </div>
    </footer>
  );
}
