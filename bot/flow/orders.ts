/** Заказ: создание/сохранение, оплата Kaspi, чек, решение админа, «мои приглашения», смена ссылки */
import QRCode from "qrcode";
import type { Ctx, Deps, Result, Step } from "./types";
import type { Lang, OrderRecord } from "@/lib/domain";
import type { InlineButton } from "../tg";
import { PRICES } from "@/templates/registry";
import { t } from "@/texts/uz-cyrl";
import { uz } from "@/texts/bot-uz";
import { isReservedSlug, slugify } from "@/lib/slug";
import {
  backRow,
  designName,
  expiresAt,
  finalData,
  fmtDate,
  inline,
  isCompleteEvent,
  mainMenu,
  namesOf,
  ownerUrl,
  PAID_STATUSES,
  PAYABLE_STATUSES,
  pageUrl,
  price,
  send,
  txFor,
} from "./util";
import { getDesign } from "@/templates/registry";

// ── Создание / сохранение из сводки ──

function orderButtons(c: Ctx, o: OrderRecord): InlineButton[][] {
  const rows: InlineButton[][] = [];
  if (PAYABLE_STATUSES.includes(o.status)) rows.push([{ text: c.tx.order.pay(price(o.amount)), data: `pay:${o.number}` }]);
  rows.push([{ text: c.tx.order.edit, data: `edit:${o.number}` }]);
  return rows;
}

export async function confirmDraft(c: Ctx): Promise<Result> {
  const s = c.s;
  const data = finalData(s);
  if (!s.templateId || !s.format || !data.events.length || !(s.data?.events ?? []).every(isCompleteEvent)) return null;
  const music = s.music ?? { kind: "none" as const };
  const repo = c.deps.repo;

  if (s.orderId) {
    const old = await repo.getOrder(s.orderId);
    if (!old || old.userId !== c.user.id) return { hint: c.tx.order.notFound };
    const canChangePrice = PAYABLE_STATUSES.includes(old.status);
    const o = await repo.updateOrder(old.id, {
      data,
      music,
      templateId: s.templateId,
      ...(canChangePrice ? { format: s.format, amount: PRICES[s.format] } : {}),
      ...(PAID_STATUSES.includes(old.status) ? { expiresAt: expiresAt(data) } : {}),
    });
    await send(c, c.tx.order.updated(pageUrl(c, o.slug)), inline(orderButtons(c, o)));
    return { done: true };
  }

  const slugBase = data.occasion === "nikoh" ? slugify(data.groom ?? "", data.bride ?? "") : slugify(data.person ?? "");
  const o = await repo.createOrder({
    userId: c.user.id,
    occasion: data.occasion,
    format: s.format,
    templateId: s.templateId,
    data,
    music,
    amount: PRICES[s.format],
    status: "preview",
    slugBase,
  });
  await send(c, c.tx.order.created(pageUrl(c, o.slug)), inline(orderButtons(c, o)));
  return { done: true };
}

// ── Свои заказы ──

async function ownOrder(c: Ctx, n: number) {
  const o = await c.deps.repo.getOrderByNumber(n);
  return o && o.userId === c.user.id ? o : null;
}

/** Открыть заказ на правку: сводка с данными заказа (slug не меняется) */
export async function editOrder(c: Ctx, n: number): Promise<Result> {
  const o = await ownOrder(c, n);
  if (!o || o.status === "archived") {
    await send(c, c.tx.order.notFound);
    return { done: true };
  }
  c.s = {
    orderId: o.id,
    occasion: o.occasion,
    format: o.format,
    templateId: o.templateId,
    data: structuredClone(o.data),
    music: o.music,
    paid: !PAYABLE_STATUSES.includes(o.status),
  };
  return { enter: "review" };
}

/** «Тўлаш»: реквизиты Kaspi, статус awaiting_payment, ждём чек */
export async function payOrder(c: Ctx, n: number): Promise<Result> {
  const o = await ownOrder(c, n);
  if (!o) {
    await send(c, c.tx.order.notFound);
    return { done: true };
  }
  if (PAID_STATUSES.includes(o.status)) {
    await send(c, c.tx.pay.alreadyPaid);
    return { done: true };
  }
  if (o.status === "receipt_sent") {
    await send(c, c.tx.pay.waiting);
    return { done: true };
  }
  await c.deps.repo.transition(o.id, PAYABLE_STATUSES, "awaiting_payment");
  const env = c.deps.env;
  await send(
    c,
    c.tx.pay.info(price(o.amount), env.kaspiPhone, env.kaspiName, o.number),
    inline([[{ text: c.tx.pay.copy, copy: env.kaspiPhone.replace(/[^\d+]/g, "") }], [{ text: c.tx.pay.sendReceipt, data: `rcpt:${o.number}` }]]),
  );
  // Чек можно прислать сразу, не нажимая «Чекни юбориш»
  c.s = { orderId: o.id };
  return { wait: "receipt" };
}

/** «Чекни юбориш» / «Чекни қайта юбориш» */
export async function askReceipt(c: Ctx, n: number): Promise<Result> {
  const o = await ownOrder(c, n);
  if (!o) {
    await send(c, c.tx.order.notFound);
    return { done: true };
  }
  if (PAID_STATUSES.includes(o.status)) {
    await send(c, c.tx.pay.alreadyPaid);
    return { done: true };
  }
  if (o.status === "receipt_sent") {
    await send(c, c.tx.pay.waiting);
    return { done: true };
  }
  c.s = { orderId: o.id };
  return { enter: "receipt" };
}

const RECEIPT_DOC = /^(application\/pdf|image\/)/;

export const receipt: Step = {
  async ask(c) {
    await send(c, c.tx.pay.receiptAsk, inline([backRow(c)]));
  },
  async onMessage(c): Promise<Result> {
    const u = c.u;
    const ok = u.kind === "photo" || (u.kind === "document" && (RECEIPT_DOC.test(u.mimeType ?? "") || /\.pdf$/i.test(u.fileName ?? "")));
    if (!ok) return { hint: c.tx.pay.receiptBad };
    const file = u as Extract<typeof u, { kind: "photo" | "document" }>;
    const o = await c.deps.repo.transition(c.s.orderId ?? "", PAYABLE_STATUSES, "receipt_sent", {
      receipt: { fileId: file.fileId, kind: file.kind },
      receiptAt: c.deps.now(),
      rejectReason: null,
      adminRemindedAt: null,
    });
    if (!o) {
      await send(c, c.tx.pay.waiting);
      return { done: true };
    }
    await send(c, c.tx.pay.receiptGot, mainMenu(c.tx));
    await notifyAdmins(c.deps, o);
    return { done: true };
  },
};

// ── Админ ──

async function langOf(deps: Deps, id: number): Promise<Lang> {
  return (await deps.repo.getUser(id))?.lang ?? "uz";
}

export function adminCard(deps: Deps, o: OrderRecord, lang: Lang, client: { username: string | null; id: number } | null) {
  const tx = txFor(lang);
  const first = o.data.events[0];
  return tx.admin.card({
    n: o.number,
    amount: price(o.amount),
    format: tx.format.names[o.format],
    design: `№${getDesign(o.templateId)?.number ?? "?"} ${designName(o.templateId)}`,
    names: namesOf(o.data),
    date: first ? `${fmtDate(first.date)} ${first.time}` : "—",
    client: client ? `${client.username ? `@${client.username}` : "—"} (id ${client.id})` : "—",
    url: `${deps.env.publicBaseUrl}/${o.slug}`,
  });
}

export const decisionButtons = (tx: ReturnType<typeof txFor>, n: number): InlineButton[][] => [
  [{ text: tx.admin.approve, data: `ok:${n}` }],
  [{ text: tx.admin.reject, data: `no:${n}` }],
];

/** Чек + карточка заказа + кнопки решения — каждому админу */
export async function notifyAdmins(deps: Deps, o: OrderRecord, prefix = "") {
  const client = await deps.repo.getUser(o.userId);
  for (const adminId of await deps.repo.listAdminIds()) {
    const lang = await langOf(deps, adminId);
    const tx = txFor(lang);
    const caption = prefix + adminCard(deps, o, lang, client);
    const opts = { caption, markup: inline(decisionButtons(tx, o.number)) };
    try {
      if (o.receipt?.kind === "document") await deps.tg.sendDocument(adminId, o.receipt.fileId, opts);
      else if (o.receipt) await deps.tg.sendPhoto(adminId, o.receipt.fileId, opts);
      else await deps.tg.sendMessage(adminId, caption, { markup: opts.markup });
    } catch (e) {
      // Админ мог не запускать бота — остальным всё равно отправляем
      console.error("notifyAdmins", adminId, e);
    }
  }
}

async function guardAdmin(c: Ctx): Promise<boolean> {
  if (await c.deps.repo.isAdmin(c.user.id)) return true;
  await c.deps.tg.answerCallbackQuery((c.u as { callbackId: string }).callbackId, { text: c.tx.admin.notAdmin, alert: true });
  c.answered = true;
  return false;
}

async function already(c: Ctx) {
  await c.deps.tg.answerCallbackQuery((c.u as { callbackId: string }).callbackId, { text: c.tx.admin.already, alert: true });
  c.answered = true;
}

/** Текст для гостей (всегда ўзбекча) */
export function guestShareText(o: OrderRecord, url: string) {
  const d = o.data;
  const g = uz.guest;
  const what =
    d.occasion === "nikoh"
      ? g.nikoh(d.groom ?? "", d.bride ?? "")
      : d.occasion === "sunnat"
        ? g.sunnat(d.person ?? "")
        : d.occasion === "nahorgi"
          ? g.nahorgi(d.person ?? "", t.occasionTitles[d.cause ?? "nikoh"].toLowerCase())
          : g.yubiley(d.person ?? "");
  const first = d.events[0];
  return g.share(what, first ? `${fmtDate(first.date)}, ${first.time}` : "", url);
}

export async function approve(c: Ctx, n: number) {
  if (!(await guardAdmin(c))) return;
  const o0 = await c.deps.repo.getOrderByNumber(n);
  const now = c.deps.now();
  const o = o0 && (await c.deps.repo.transition(o0.id, ["receipt_sent"], "active", { paidAt: now, expiresAt: expiresAt(o0.data) }));
  if (!o) return already(c);
  await c.deps.tg.editMessageReplyMarkup(c.chatId, c.u.messageId, null).catch(() => {});
  await send(c, c.tx.admin.approved(n));

  const client = o.userId;
  const tx = txFor(await langOf(c.deps, client));
  const url = pageUrl(c, o.slug);
  const tg = c.deps.tg;
  await tg.sendMessage(client, tx.pay.paid(url), { markup: mainMenu(tx) });
  const png = await QRCode.toBuffer(url, { width: 600, margin: 2 });
  await tg.sendPhoto(client, new Uint8Array(png), { caption: tx.pay.qrCaption });
  await tg.sendMessage(client, tx.pay.shareIntro);
  const share = guestShareText(o, url);
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(share.replace(url, "").trim())}`;
  await tg.sendMessage(client, share, { markup: inline([[{ text: tx.pay.shareButton, url: shareUrl }]]) });
}

const REASONS = ["money", "sum", "other"] as const;

export async function askRejectReason(c: Ctx, n: number) {
  if (!(await guardAdmin(c))) return;
  const o = await c.deps.repo.getOrderByNumber(n);
  if (!o || o.status !== "receipt_sent") return already(c);
  const rows = REASONS.map((r) => [{ text: c.tx.admin.reasons[r], data: `nr:${n}:${r}` }]);
  await c.deps.tg.editMessageReplyMarkup(c.chatId, c.u.messageId, inline(rows));
  await c.deps.tg.answerCallbackQuery((c.u as { callbackId: string }).callbackId, { text: c.tx.admin.reasonAsk });
  c.answered = true;
}

export async function reject(c: Ctx, n: number, code: string) {
  if (!(await guardAdmin(c))) return;
  if (!REASONS.includes(code as (typeof REASONS)[number])) return already(c);
  const o0 = await c.deps.repo.getOrderByNumber(n);
  const o = o0 && (await c.deps.repo.transition(o0.id, ["receipt_sent"], "rejected", { rejectReason: uz.admin.reasons[code] }));
  if (!o) return already(c);
  await c.deps.tg.editMessageReplyMarkup(c.chatId, c.u.messageId, null).catch(() => {});
  await send(c, c.tx.admin.rejectedDone(n, c.tx.admin.reasons[code]));
  const tx = txFor(await langOf(c.deps, o.userId));
  await c.deps.tg.sendMessage(o.userId, tx.pay.rejected(n, tx.admin.reasons[code]), {
    markup: inline([[{ text: tx.pay.resend, data: `rcpt:${n}` }], [{ text: tx.contact, url: ownerUrl(c) }]]),
  });
}

// ── «Менинг таклифномаларим» ──

const MY_LIMIT = 10;

export async function myOrders(c: Ctx) {
  const list = (await c.deps.repo.listOrdersByUser(c.user.id)).slice(0, MY_LIMIT);
  if (!list.length) {
    await send(c, c.tx.my.empty, mainMenu(c.tx));
    return;
  }
  for (const o of list) {
    const rows: InlineButton[][] = [];
    const first: InlineButton[] = [];
    if (o.status !== "archived") first.push({ text: c.tx.order.edit, data: `edit:${o.number}` });
    if (PAYABLE_STATUSES.includes(o.status)) first.push({ text: c.tx.order.pay(price(o.amount)), data: `pay:${o.number}` });
    if (first.length) rows.push(first);
    rows.push([{ text: c.tx.my.link, data: `slug:${o.number}` }, { text: c.tx.contact, url: ownerUrl(c) }]);
    const title = `${namesOf(o.data)} · ${designName(o.templateId)}`;
    await send(c, c.tx.my.item(o.number, title, c.tx.my.statuses[o.status], pageUrl(c, o.slug)), inline(rows));
  }
}

export async function askSlug(c: Ctx, n: number): Promise<Result> {
  const o = await ownOrder(c, n);
  if (!o || o.status === "archived") {
    await send(c, c.tx.order.notFound);
    return { done: true };
  }
  c.s = { orderId: o.id };
  return { enter: "slug" };
}

export const slug: Step = {
  async ask(c) {
    const o = await c.deps.repo.getOrder(c.s.orderId ?? "");
    await send(c, c.tx.my.slugAsk(pageUrl(c, o?.slug ?? "")), inline([backRow(c)]));
  },
  async onMessage(c): Promise<Result> {
    if (c.u.kind !== "text") return null;
    const v = c.u.text.trim().toLowerCase();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v) || v.length < 3 || v.length > 40) return { hint: c.tx.my.slugBad };
    const id = c.s.orderId ?? "";
    if (isReservedSlug(v) || (await c.deps.repo.isSlugTaken(v, id))) return { hint: c.tx.my.slugTaken(v) };
    const o = await c.deps.repo.updateOrder(id, { slug: v });
    await send(c, c.tx.my.slugChanged(pageUrl(c, o.slug)), mainMenu(c.tx));
    return { done: true };
  },
};
