/**
 * Цена заказа (17.11.2026): акция, промокод, оптовая скидка — одно место для бота, Mini App и каталога.
 *
 * Правила:
 * - Акция и промокод — только для обычных клиентов. Партнёрам, менеджерам, оптовикам и админам — обычная цена
 *   (роль аккаунта на момент перехода к оплате). Клиентам по ссылке партнёра акция — только если включено в акции.
 * - Оптовик: своя постоянная скидка, без акций и промокодов.
 * - Акция и промокод не складываются: берётся бо́льшая скидка.
 * - Цена кратна 100 ₸ (вниз), 100 % = 0 ₸.
 * - Цена фиксируется в заказе при переходе к оплате и пересчитывается перед чеком (акция могла закончиться).
 */
import type { OrderPricing, OrderRecord, Promotion } from "@/lib/domain";
import type { Occasion } from "@/lib/types";
import { PRICES, type Format } from "@/templates/registry";
import { PARTNER_CODE } from "@/lib/marketing/config";
import type { Deps } from "./flow/types";
import { PAYABLE_STATUSES } from "./flow/util";

export type BuyerRole = "admin" | "manager" | "wholesale" | "partner" | "client";
export type Buyer = { role: BuyerRole; wholesalePercent: number | null; viaPartner: boolean };

import { discounted } from "@/lib/pricing-math";
export { discounted };

/** Роль аккаунта для цены. Порядок важен: админ > менеджер > оптовик > партнёр > клиент */
export async function buyerOf(deps: Pick<Deps, "repo">, userId: number): Promise<Buyer> {
  const user = await deps.repo.getUser(userId);
  const viaPartner = PARTNER_CODE.test(user?.source ?? "");
  if (await deps.repo.isAdmin(userId)) return { role: "admin", wholesalePercent: null, viaPartner };
  if (await deps.repo.getManager(userId)) return { role: "manager", wholesalePercent: null, viaPartner };
  const w = await deps.repo.getWholesaler(userId);
  if (w) return { role: "wholesale", wholesalePercent: w.percent, viaPartner };
  if (await deps.repo.findPartnerForUser(userId, user?.username ?? null))
    return { role: "partner", wholesalePercent: null, viaPartner };
  return { role: "client", wholesalePercent: null, viaPartner };
}

export const isRunning = (p: Promotion, now: Date) => !p.stoppedAt && +p.startsAt <= +now && +now < +p.endsAt;

/** Действующая сейчас акция (одна) */
export async function runningPromotion(deps: Pick<Deps, "repo">, now: Date) {
  return (await deps.repo.listPromotions()).find((p) => isRunning(p, now)) ?? null;
}

export const promotionCovers = (p: Pick<Promotion, "occasions" | "formats">, occasion: Occasion, format: Format) =>
  (!p.occasions || p.occasions.includes(occasion)) && (!p.formats || p.formats.includes(format));

/** Акция, которую этот покупатель видит и получает (null — бейджей не показывать) */
export const promotionFor = (p: Promotion | null, b: Buyer) =>
  p && b.role === "client" && (!b.viaPartner || p.forPartnerClients) ? p : null;

/** Сводка акции для витрины (каталог, баннер, бот): то, что показываем покупателю */
export type PromotionView = {
  id: string;
  name: string;
  percent: number;
  endsAt: string;
  occasions: Occasion[] | null;
  formats: Format[] | null;
};
export const promotionView = (p: Promotion): PromotionView => ({
  id: p.id,
  name: p.name,
  percent: p.percent,
  endsAt: p.endsAt.toISOString(),
  occasions: p.occasions,
  formats: p.formats,
});

/** Акция для каталога этого пользователя (партнёрам, оптовикам, сотрудникам — null) */
export async function catalogPromotion(deps: Pick<Deps, "repo" | "now">, userId: number) {
  const p = promotionFor(await runningPromotion(deps, deps.now()), await buyerOf(deps, userId));
  return p ? promotionView(p) : null;
}

type PromoHold = { code: string; percent: number; original: number };

/** Живая бронь промокода на заказе (только Postgres с маркетингом) */
async function promoHold(deps: Deps, o: OrderRecord): Promise<PromoHold | null> {
  if (!deps.repo.marketing) return null;
  return deps.repo.marketing.holdOf(o.id, deps.now());
}

export type Quote = {
  amount: number;
  base: number;
  pricing: OrderPricing | null;
  /** Промокод остаётся (он лучше акции) */
  promo: { code: string; percent: number } | null;
  /** Бронь промокода надо снять (роль не клиент или акция выгоднее) */
  dropPromo: boolean;
  buyer: Buyer;
};

/** Посчитать цену заказа сейчас (без записи) */
export async function quote(deps: Deps, o: OrderRecord): Promise<Quote> {
  const now = deps.now();
  const buyer = await buyerOf(deps, o.userId);
  // База — текущая цена формата: неоплаченные заказы после смены прайса получают новую цену (17.11.2026)
  const base = PRICES[o.format] ?? o.pricing?.base ?? o.amount;
  const held = await promoHold(deps, o);
  // Бронь промокода посчитана от старой цены — снимаем, клиент применит код заново к новой
  const stale = Boolean(held && held.original !== base);
  const hold = stale ? null : held;
  const plain = { amount: base, base, pricing: null, promo: null, dropPromo: Boolean(held), buyer };
  if (buyer.role === "wholesale" && buyer.wholesalePercent) {
    const percent = buyer.wholesalePercent;
    return { ...plain, amount: discounted(base, percent), pricing: { kind: "wholesale", base, percent } };
  }
  if (buyer.role !== "client") return plain;
  const p = promotionFor(await runningPromotion(deps, now), buyer);
  const promotion = p && promotionCovers(p, o.occasion, o.format) ? p : null;
  if (promotion && (!hold || promotion.percent > hold.percent)) {
    return {
      ...plain,
      amount: discounted(base, promotion.percent),
      pricing: {
        kind: "promotion",
        base,
        percent: promotion.percent,
        promotionId: promotion.id,
        name: promotion.name,
        endsAt: promotion.endsAt.toISOString(),
      },
    };
  }
  if (hold) return { ...plain, amount: o.amount, promo: { code: hold.code, percent: hold.percent }, dropPromo: false };
  return { ...plain, dropPromo: stale };
}

const samePricing = (a: OrderPricing | null | undefined, b: OrderPricing | null) =>
  JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/**
 * Зафиксировать цену в заказе (переход к оплате, перед чеком). Сумма поменялась — подтверждение «✅ тўлаймиз»
 * сбрасывается: клиент видит новую сумму до оплаты. Оплаченные и чек на проверке не трогаем.
 */
export async function applyPricing(deps: Deps, o: OrderRecord): Promise<OrderRecord> {
  if (!PAYABLE_STATUSES.includes(o.status)) return o;
  const q = await quote(deps, o);
  let order = o;
  if (q.dropPromo && deps.repo.marketing) {
    await deps.repo.marketing.releaseHold(o.id);
    order = (await deps.repo.getOrder(o.id)) ?? o;
  }
  if (order.amount === q.amount && samePricing(order.pricing, q.pricing)) return order;
  const changed = order.amount !== q.amount;
  return deps.repo.updateOrder(o.id, {
    amount: q.amount,
    pricing: q.pricing,
    ...(changed ? { payConfirmedAt: null, termsAcceptedAt: null } : {}),
  });
}

/** Что показать рядом с ценой: старая цена, экономия, подпись (акция / промокод / оптовая) */
export type PriceNote = {
  before: number;
  saving: number;
  kind: "promotion" | "promo" | "wholesale";
  percent: number;
  label: string;
  endsAt?: string;
};
export async function priceNote(deps: Deps, o: OrderRecord): Promise<PriceNote | null> {
  if (o.pricing && o.pricing.base > o.amount)
    return {
      before: o.pricing.base,
      saving: o.pricing.base - o.amount,
      kind: o.pricing.kind,
      percent: o.pricing.percent,
      label: o.pricing.name ?? "",
      endsAt: o.pricing.endsAt,
    };
  const hold = await promoHold(deps, o);
  if (hold && hold.original > o.amount)
    return {
      before: hold.original,
      saving: hold.original - o.amount,
      kind: "promo",
      percent: hold.percent,
      label: hold.code,
    };
  return null;
}
