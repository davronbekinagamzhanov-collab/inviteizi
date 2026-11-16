"use client";
/**
 * Акция на веб-каталоге (17.11.2026): баннер с обратным отсчётом, бейдж на обложке, старая цена зачёркнута.
 * /catalog — только узбекский. Акция приходит с /api/promotion; закончилась — бейджи исчезают сами.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { PromotionView } from "@/bot/pricing";
import type { Occasion } from "@/lib/types";
import { discounted } from "@/lib/pricing-math";
import { salesTexts } from "@/texts/sales";
import type { Format } from "@/templates/registry";

const t = salesTexts.uz;
const Ctx = createContext<{ p: PromotionView | null; now: number }>({ p: null, now: 0 });
const sum = (n: number) => `${n.toLocaleString("ru-RU").replace(/ /g, " ")} ₸`;

export function DealsProvider({ children }: { children: ReactNode }) {
  const [p, setP] = useState<PromotionView | null>(null);
  const [now, setNow] = useState(0);
  useEffect(() => {
    let alive = true;
    fetch("/api/promotion")
      .then((r) => r.json())
      .then((r: { promotion: PromotionView | null }) => {
        if (!alive) return;
        setP(r.promotion);
        setNow(Date.now());
      })
      .catch(() => {});
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);
  const live = p && now && now < +new Date(p.endsAt) ? p : null;
  return <Ctx.Provider value={{ p: live, now }}>{children}</Ctx.Provider>;
}

const covers = (p: PromotionView | null, occasion: Occasion, format: Format) =>
  Boolean(p && (!p.occasions || p.occasions.includes(occasion)) && (!p.formats || p.formats.includes(format)));

export function DealsBanner() {
  const { p, now } = useContext(Ctx);
  if (!p) return null;
  const left = Math.max(0, +new Date(p.endsAt) - now);
  const d = Math.floor(left / 86_400_000);
  const h = Math.floor((left % 86_400_000) / 3_600_000);
  const m = Math.floor((left % 3_600_000) / 60_000);
  return (
    <section
      data-deal-banner
      className="mt-8 flex items-center gap-3 rounded-2xl border border-[#9a3d24]/20 bg-gradient-to-br from-[#fbe9df] to-[#fff4e6] px-4 py-3"
    >
      <span className="shrink-0 rounded-xl bg-[#9a3d24] px-2.5 py-1.5 text-[17px] font-extrabold text-[#fff8ec]">
        {p.percent >= 100 ? t.free : t.off(p.percent)}
      </span>
      <span className="grid min-w-0">
        <b className="truncate text-[17px]">{p.name}</b>
        <small className="text-[14px] text-[#7d6a58] tabular-nums">{t.timer(d, h, m)}</small>
      </span>
    </section>
  );
}

export function DealBadge({ occasion, format }: { occasion: Occasion; format: Format }) {
  const { p } = useContext(Ctx);
  if (!p || !covers(p, occasion, format)) return null;
  return (
    <span className="absolute top-2 left-2 rounded-full bg-[#9a3d24] px-2.5 py-1 text-[14px] font-extrabold text-[#fff8ec] shadow">
      {p.percent >= 100 ? t.free : t.off(p.percent)}
    </span>
  );
}

export function DealPrice({ occasion, format, base }: { occasion: Occasion; format: Format; base: number }) {
  const { p } = useContext(Ctx);
  if (!p || !covers(p, occasion, format)) return <p className="text-[16px] font-bold">{sum(base)}</p>;
  const now = discounted(base, p.percent);
  return (
    <p className="flex items-baseline gap-2 text-[16px] font-bold" data-deal-price>
      <s className="text-[14px] font-medium text-[#8a7a6a]">{sum(base)}</s>
      <span className="text-[18px] text-[#9a3d24]">{now === 0 ? t.free : sum(now)}</span>
    </p>
  );
}
