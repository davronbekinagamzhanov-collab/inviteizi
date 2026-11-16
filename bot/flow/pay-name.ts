/**
 * Оплата без чека (17.11.2026) — основной способ в Сайраме: клиент переводит в Kaspi, жмёт «✅ Тўладим» и пишет имя,
 * как оно видно в Kaspi. Заказ — в тот же статус, что после чека (receipt_sent), владельцу — «№120 · 4 990 ₸ · от … · 14:32».
 * Чек — по желанию: прежний путь или пересланный из Kaspi в чат (бот привязывает к последнему заказу).
 */
import type { OrderRecord } from "@/lib/domain";
import { isQuiet } from "@/lib/quiet-hours";
import { allow } from "@/lib/rate-limit";
import { cleanPayerName, payCopy } from "@/texts/pay";
import { applyPricing } from "../pricing";
import { mainMenu, PAYABLE_STATUSES, price, send } from "./util";
import { notifyAdmins, receipt } from "./orders";
import type { Ctx, Deps, Result, Step } from "./types";

/** «Тўладим» — не чаще 3 раз в час на заказ */
const PAID_LIMIT = { max: 3, windowMs: 3_600_000 };

export type PayByNameError = "notFound" | "closed" | "waiting" | "name" | "tooOften" | "priceChanged" | "notConfirmed";

export async function payByName(
  deps: Deps,
  userId: number,
  orderId: string,
  rawName: unknown,
): Promise<{ ok: true; order: OrderRecord; night: boolean } | { error: PayByNameError }> {
  const o = orderId ? await deps.repo.getOrder(orderId).catch(() => null) : null;
  if (!o || o.userId !== userId) return { error: "notFound" };
  if (o.status === "receipt_sent") return { error: "waiting" };
  if (!PAYABLE_STATUSES.includes(o.status)) return { error: "closed" };
  // Как с чеком: реквизиты видят только после «✅ Ҳаммаси тўғри» (условия и проверка образца)
  if (!o.payConfirmedAt) return { error: "notConfirmed" };
  const name = cleanPayerName(rawName);
  if (!name) return { error: "name" };
  if (!allow(`paid:${o.id}`, PAID_LIMIT)) return { error: "tooOften" };
  // Акция/промокод фиксируются так же, как при чеке: сумма изменилась — сначала новая сумма
  if ((await applyPricing(deps, o)).amount !== o.amount) return { error: "priceChanged" };
  const now = deps.now();
  const done = await deps.repo.transition(o.id, PAYABLE_STATUSES, "receipt_sent", {
    payerName: name,
    receiptAt: now,
    receipt: null,
    rejectReason: null,
    adminRemindedAt: null,
  });
  if (!done) return { error: "waiting" };
  try {
    await notifyAdmins(deps, { ...done, payerName: name });
  } catch (e) {
    // Заказ уже в receipt_sent — cron напомнит админам
    console.error("pay by name → admins", e instanceof Error ? e.name : "Error");
  }
  return { ok: true, order: { ...done, payerName: name }, night: isQuiet(now) };
}

/** «№120 · 4 990 ₸ · от Давронбек И. · 14:32» (время Алматы) — первой строкой карточки владельцу */
export function payerLine(lang: string, o: OrderRecord) {
  if (!o.payerName) return "";
  const at = new Date(+(o.receiptAt ?? o.updatedAt) + 5 * 3_600_000).toISOString().slice(11, 16);
  return payCopy(lang).adminLine(o.number, price(o.amount), o.payerName, at) + "\n\n";
}

// ── Бот ──

/** paid:<n>:<сумма> — «✅ Тўладим»: спросить имя */
export async function beginPaid(c: Ctx, n: number, shownAmount?: number): Promise<Result> {
  const t = payCopy(c.lang);
  const o = await c.deps.repo.getOrderByNumber(n);
  if (!o || o.userId !== c.user.id) {
    await send(c, c.tx.order.notFound);
    return { done: true };
  }
  if (o.status === "receipt_sent") {
    await send(c, c.tx.pay.waiting);
    return { done: true };
  }
  if (!PAYABLE_STATUSES.includes(o.status)) {
    await send(c, c.tx.pay.alreadyPaid);
    return { done: true };
  }
  const priced = await applyPricing(c.deps, o);
  // Сумма на кнопке устарела (акция закончилась, сменилась цена) — показать оплату заново
  if (!o.payConfirmedAt || (shownAmount !== undefined && shownAmount !== priced.amount)) {
    const { payOrder } = await import("./orders");
    return payOrder(c, n);
  }
  c.s = { q: c.s.q, orderId: o.id };
  void t;
  return { enter: "payerName" };
}

export const payerName: Step = {
  async ask(c) {
    await send(c, payCopy(c.lang).askName);
  },
  async onMessage(c): Promise<Result> {
    // Прислал чек вместо имени — тоже хорошо (прежний путь)
    if (c.u.kind === "photo" || c.u.kind === "document") return receipt.onMessage!(c);
    const t = payCopy(c.lang);
    if (c.u.kind !== "text") return { hint: t.askName };
    const r = await payByName(c.deps, c.user.id, c.s.orderId ?? "", c.u.text);
    if ("error" in r) {
      if (r.error === "name") return { hint: t.nameBad };
      if (r.error === "tooOften") {
        await send(c, t.tooOften);
        return { done: true };
      }
      if (r.error === "priceChanged" || r.error === "notConfirmed") {
        const o = c.s.orderId ? await c.deps.repo.getOrder(c.s.orderId) : null;
        const { payOrder } = await import("./orders");
        return o ? payOrder(c, o.number) : { done: true };
      }
      await send(
        c,
        r.error === "waiting" ? c.tx.pay.waiting : r.error === "closed" ? c.tx.pay.alreadyPaid : c.tx.order.notFound,
      );
      return { done: true };
    }
    await send(c, r.night ? t.checkingNight : t.checking, mainMenu());
    return { done: true };
  },
};

/**
 * Чек вне шага оплаты (переслан из Kaspi: «Улашиш → Telegram → InviteIZI бот»): к последнему неоплаченному заказу.
 * Заказ ещё ждёт оплаты — как обычный чек; уже «Тўладим» без чека — чек добавляется к нему и уходит владельцу.
 * null — заказа нет, сообщение обработает обычный путь.
 */
export async function forwardedReceipt(c: Ctx): Promise<Result | null> {
  const u = c.u;
  const isFile =
    u.kind === "photo" ||
    (u.kind === "document" &&
      (/^(application\/pdf|image\/)/.test(u.mimeType ?? "") || /\.pdf$/i.test(u.fileName ?? "")));
  if (!isFile) return null;
  const list = await c.deps.repo.listOrdersByUser(c.user.id);
  const latest = [...list].sort((a, b) => +b.updatedAt - +a.updatedAt);
  const waiting = latest.find((o) => o.status === "receipt_sent" && o.payerName && !o.receipt);
  const payable = latest.find((o) => (o.status === "awaiting_payment" || o.status === "rejected") && o.payConfirmedAt);
  if (waiting && (!payable || +waiting.updatedAt >= +payable.updatedAt)) {
    const file = u as Extract<typeof u, { kind: "photo" | "document" }>;
    const updated = await c.deps.repo.updateOrder(waiting.id, { receipt: { fileId: file.fileId, kind: file.kind } });
    for (const adminId of await c.deps.repo.listAdminIds()) {
      const lang = (await c.deps.repo.getUser(adminId))?.lang ?? "uz";
      const { sendReceiptTo } = await import("./orders");
      await sendReceiptTo(c.deps, adminId, updated, payCopy(lang).adminReceipt(updated.number) + "\n").catch(() => {});
    }
    await send(c, payCopy(c.lang).receiptAttached, mainMenu());
    return { done: true };
  }
  if (payable) {
    c.s = { q: c.s.q, orderId: payable.id };
    return receipt.onMessage!(c);
  }
  return null;
}
