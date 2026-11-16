/**
 * Акции и промокод в боте и Mini App (17.11.2026): применить промокод клиента, выдать заказ 0 ₸ по акции без чека,
 * строки цены (старая цена, экономия, подпись), строка об акции при старте (не чаще раза в 6 часов).
 */
import type { OrderRecord } from "@/lib/domain";
import { computeExpiresAt } from "@/lib/orders";
import { allow } from "@/lib/rate-limit";
import { salesCopy, shortDate } from "@/texts/sales";
import { MarketingError } from "../marketing-repo";
import { applyPricing, buyerOf, catalogPromotion, priceNote, type PriceNote } from "../pricing";
import { sendLinkPack } from "./orders";
import type { Ctx, Deps, Result, Step } from "./types";
import { inline, PAYABLE_STATUSES, price, send } from "./util";

const PROMO_LIMIT = { max: 8, windowMs: 60_000 };

export type PromoError = keyof ReturnType<typeof salesCopy>["promoErrors"] | "notFound";

/** Промокод клиента для своего неоплаченного заказа. Права и роль — только здесь, на сервере */
export async function applyPromoCode(
  deps: Deps,
  userId: number,
  orderId: string,
  raw: unknown,
): Promise<{ ok: true; order: OrderRecord; code: string; percent: number } | { error: PromoError }> {
  const store = deps.repo.marketing;
  if (!deps.env.marketing?.promos || !store) return { error: "disabled" };
  if (!allow(`promo:${userId}`, PROMO_LIMIT)) return { error: "rateLimit" };
  const code = typeof raw === "string" ? raw.trim().toUpperCase().slice(0, 32) : "";
  if (!/^[A-Z0-9_]{3,32}$/.test(code)) return { error: "promo_unavailable" };
  const o = await deps.repo.getOrder(orderId).catch(() => null);
  if (!o || o.userId !== userId) return { error: "notFound" };
  if (!PAYABLE_STATUSES.includes(o.status)) return { error: "order_locked" };
  if ((await buyerOf(deps, userId)).role !== "client") return { error: "notForYou" };
  try {
    // Цена до скидки — без акции: бронь считает скидку от полной цены
    const base = o.pricing?.base;
    if (base && base !== o.amount) await deps.repo.updateOrder(o.id, { amount: base, pricing: null });
    await store.reservePromo(userId, o.id, code, deps.now());
  } catch (e) {
    if (e instanceof MarketingError && e.code in salesCopy("uz").promoErrors) {
      await applyPricing(deps, (await deps.repo.getOrder(o.id))!);
      return { error: e.code as PromoError };
    }
    throw e;
  }
  // Акция выгоднее — бронь снимается, клиент видит одну (бо́льшую) скидку
  const fresh = await applyPricing(deps, (await deps.repo.getOrder(o.id))!);
  const note = await priceNote(deps, fresh);
  if (note?.kind !== "promo") return { error: "better" };
  return { ok: true, order: fresh, code, percent: note.percent };
}

/** Заказ 0 ₸ по акции: без Kaspi и чека, ссылка сразу (как бесплатная выдача владельца, в статистике — «по акции») */
export async function issueByPromotion(deps: Deps, o: OrderRecord) {
  if (o.amount !== 0 || o.pricing?.kind !== "promotion") return null;
  const now = deps.now();
  const done = await deps.repo.transition(o.id, PAYABLE_STATUSES, "active", {
    paidAt: now,
    payConfirmedAt: o.payConfirmedAt ?? now,
    termsAcceptedAt: o.termsAcceptedAt ?? now,
    expiresAt: computeExpiresAt(o.data.events),
  });
  if (done)
    await sendLinkPack(deps, done, true).catch((e) =>
      console.error("promotion free link", e instanceof Error ? e.name : "Error"),
    );
  return done;
}

/** Строки цены для проверки перед оплатой (бот) */
export function priceLines(lang: string, amount: number, note: PriceNote | null) {
  if (!note) return null;
  const t = salesCopy(lang);
  const label =
    note.kind === "promotion"
      ? t.promotionLine(note.label, note.percent, note.endsAt ? shortDate(note.endsAt) : "")
      : note.kind === "promo"
        ? t.promoLine(note.label, note.percent)
        : t.wholesaleLine(note.percent);
  return [
    t.priceLine(amount === 0 ? t.free : price(amount), price(note.before)),
    label,
    t.saving(price(note.saving)),
  ].join("\n");
}

export async function priceLinesFor(c: Pick<Ctx, "deps" | "lang">, o: OrderRecord) {
  return priceLines(c.lang, o.amount, await priceNote(c.deps, o));
}

/**
 * Одна строка об акции (старт, каталог): не чаще раза в 6 часов на человека.
 * Время показа — в базе (users.promo_line_at), чтобы перезапуск сервера не показывал строку снова.
 * Пока миграции нет — запасной вариант в памяти процесса.
 */
const PROMO_LINE_GAP_MS = 6 * 3_600_000;
const shownBy = new WeakMap<object, Map<number, number>>();
export async function promotionLine(c: Pick<Ctx, "deps" | "lang" | "user">, force = false) {
  const p = await catalogPromotion(c.deps, c.user.id);
  if (!p) return null;
  const at = c.deps.now(),
    now = +at;
  const claimed = force ? true : ((await c.deps.repo.claimPromoLine?.(c.user.id, at, PROMO_LINE_GAP_MS)) ?? null);
  if (claimed === false) return null;
  if (claimed === null) {
    let shown = shownBy.get(c.deps.repo);
    if (!shown) shownBy.set(c.deps.repo, (shown = new Map()));
    if (now - (shown.get(c.user.id) ?? 0) < PROMO_LINE_GAP_MS) return null;
    shown.set(c.user.id, now);
  }
  return salesCopy(c.lang).startLine(p.name, p.percent, shortDate(p.endsAt));
}

// ── Бот: «🎟 Промокод» на шаге оплаты ──

export async function beginPromo(c: Ctx, n: number): Promise<Result> {
  const t = salesCopy(c.lang);
  const o = await c.deps.repo.getOrderByNumber(n);
  if (!o || o.userId !== c.user.id || !PAYABLE_STATUSES.includes(o.status)) {
    await send(c, t.promoErrors.order_locked);
    return { done: true };
  }
  if (!c.deps.env.marketing?.promos || !c.deps.repo.marketing) {
    await send(c, t.promoErrors.disabled);
    return { done: true };
  }
  c.s = { q: c.s.q, orderId: o.id };
  return { enter: "promoCode" };
}

export const promoCode: Step = {
  async ask(c) {
    const o = c.s.orderId ? await c.deps.repo.getOrder(c.s.orderId) : null;
    await send(c, salesCopy(c.lang).promoAsk, o ? inline([[{ text: c.tx.back, data: `pay:${o.number}` }]]) : undefined);
  },
  async onMessage(c): Promise<Result> {
    const t = salesCopy(c.lang);
    if (c.u.kind !== "text") return { hint: t.promoAsk };
    const r = await applyPromoCode(c.deps, c.user.id, c.s.orderId ?? "", c.u.text);
    if ("error" in r) {
      if (r.error === "notFound" || r.error === "order_locked" || r.error === "disabled") {
        await send(c, t.promoErrors[r.error === "notFound" ? "order_locked" : r.error]);
        return { done: true };
      }
      return { hint: t.promoErrors[r.error] };
    }
    await send(c, t.promoApplied(r.code, r.percent, r.order.amount === 0 ? t.free : price(r.order.amount)));
    const { payOrder } = await import("./orders");
    return payOrder(c, r.order.number);
  },
};
