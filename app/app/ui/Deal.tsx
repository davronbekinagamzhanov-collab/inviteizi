"use client";
/**
 * Акция в Mini App (17.11.2026): баннер с обратным отсчётом, бейдж «−50 %» / «БЕПУЛ» на карточке,
 * старая цена зачёркнута, новая — акцентом. Сервер присылает акцию только обычному клиенту
 * (партнёрам, оптовикам и сотрудникам — null, бейджей нет). Закончилась — всё исчезает само, без перезапуска.
 */
import { useEffect, useState } from "react";
import type { PromotionView } from "@/bot/pricing";
import { discounted } from "@/lib/pricing-math";
import { salesCopy } from "@/texts/sales";
import type { Design } from "@/templates/registry";
import { useT } from "./shared";
import s from "../app.module.css";

/** Текущее время, обновляется раз в 30 с (таймер без мерцания: меняется только текст минут) */
function useNow(stepMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), stepMs);
    return () => clearInterval(id);
  }, [stepMs]);
  return now;
}

/** Акция, пока она идёт; по окончании — null (бейджи и зачёркивания исчезают) */
export function useLivePromotion(p: PromotionView | null | undefined) {
  const now = useNow();
  return p && now < +new Date(p.endsAt) ? { promotion: p, now } : { promotion: null, now };
}

export const coversDesign = (p: PromotionView | null, d: Pick<Design, "occasion" | "format">) =>
  Boolean(p && (!p.occasions || p.occasions.includes(d.occasion)) && (!p.formats || p.formats.includes(d.format)));

/** Цена дизайна по акции (null — акция его не касается) */
export const dealPrice = (p: PromotionView | null, d: Pick<Design, "occasion" | "format">, base: number) =>
  p && coversDesign(p, d) ? discounted(base, p.percent) : null;

export function DealBanner({ promotion }: { promotion: PromotionView | null | undefined }) {
  const T = useT();
  const t = salesCopy(T.lang);
  const { promotion: p, now } = useLivePromotion(promotion);
  if (!p) return null;
  const left = Math.max(0, +new Date(p.endsAt) - now);
  const d = Math.floor(left / 86_400_000);
  const h = Math.floor((left % 86_400_000) / 3_600_000);
  const m = Math.floor((left % 3_600_000) / 60_000);
  return (
    <section className={s.dealBanner} aria-label={p.name} data-deal-banner>
      <span className={s.dealBadgeBig}>{p.percent >= 100 ? t.free : t.off(p.percent)}</span>
      <span className={s.dealText}>
        <b>{p.name}</b>
        <small>{t.timer(d, h, m)}</small>
      </span>
    </section>
  );
}

/** Цена на карточке: «8 000» зачёркнуто + «4 000 ₸» акцентом; без акции — как раньше */
export function DealPrice({ base, deal, className }: { base: number; deal: number | null; className?: string }) {
  const T = useT();
  const t = salesCopy(T.lang);
  if (deal === null) return <span className={className}>{T.price(base)}</span>;
  return (
    <span className={`${className ?? ""} ${s.dealPrice}`} data-deal-price>
      <s>{T.price(base)}</s>
      <b>{deal === 0 ? t.free : T.price(deal)}</b>
    </span>
  );
}

export function DealBadge({ percent }: { percent: number }) {
  const T = useT();
  const t = salesCopy(T.lang);
  return <span className={s.dealBadge}>{percent >= 100 ? t.free : t.off(percent)}</span>;
}
