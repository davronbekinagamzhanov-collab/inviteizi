/** Заказ: создание/сохранение, оплата Kaspi, чек, решение админа, «мои приглашения», смена ссылки */
import QRCode from "qrcode";
import type { Ctx, Deps, Result, Step } from "./types";
import type { Lang, OrderRecord } from "@/lib/domain";
import type { InlineButton } from "../tg";
import { PRICES } from "@/templates/registry";
import { t } from "@/texts/uz-cyrl";
import { uz } from "@/texts/bot-uz";
import { slugify } from "@/lib/slug";
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
import { rememberUpdate } from "../update";

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
    // The status guard belongs in the UPDATE, not only in the earlier read.
    if (!PAYABLE_STATUSES.includes(old.status)) {
      await send(c, old.status === "receipt_sent" ? c.tx.pay.waiting : c.tx.order.closed);
      return { done: true };
    }
    const selected=getDesign(s.templateId);
    if(s.format!==old.format||(s.templateId!==old.templateId&&(!selected||selected.format!==old.format||selected.occasion!==old.occasion))){
      s.format=old.format;s.templateId=old.templateId;
      return {hint:c.tx.order.formatLocked};
    }
    const o = await repo.transition(old.id, PAYABLE_STATUSES, old.status, {
      data,
      music,
      templateId: s.templateId,
      // A saved order keeps its agreed amount; catalog changes must not reprice it.
      format: s.format, amount: old.amount,
    });
    if (!o) {
      const current = await repo.getOrder(old.id);
      await send(c, current?.status === "receipt_sent" ? c.tx.pay.waiting : c.tx.order.closed);
      return { done: true };
    }
    await send(c, c.tx.order.updated(pageUrl(c, o.slug)), inline(orderButtons(c, o)));
    return { done: true };
  }

  const selected=getDesign(s.templateId);
  if(!selected||selected.format!==s.format||selected.occasion!==data.occasion){
    s.ret="review";
    await send(c,c.tx.order.catalogChanged);
    return {to:"fmt"};
  }
  const slugBase = data.occasion === "nikoh" ? slugify(data.groom ?? "", data.bride ?? "") : slugify(data.person ?? "");
  const o = await repo.createOrderFromDraft({
    userId: c.user.id,
    occasion: data.occasion,
    format: s.format,
    templateId: s.templateId,
    data,
    music,
    amount: PRICES[s.format],
    status: "preview",
    slugBase,
  }, c.q0, c.u.updateId === undefined ? undefined : rememberUpdate(c.user.state.handledUpdates,c.u.updateId));
  if (!o) return { ignore: true };
  await send(c, c.tx.order.created(pageUrl(c, o.slug)), inline(orderButtons(c, o)));
  // Repo already finished this draft in the same transaction. Do not overwrite a newer dialog.
  return { ignore: true };
}

// ── Свои заказы ──

async function ownOrder(c: Ctx, n: number) {
  const o = await c.deps.repo.getOrderByNumber(n);
  return o && o.userId === c.user.id ? o : null;
}

/** Открыть заказ на правку: сводка с данными заказа (slug не меняется) */
export async function editOrder(c: Ctx, n: number): Promise<Result> {
  const o = await ownOrder(c, n);
  if (!o) {
    await send(c, c.tx.order.notFound);
    return { done: true };
  }
  // Чек на проверке — ждём ответа; ссылка выдана — заказ закрыт, правки только через владельца (2 000 ₸)
  if (o.status === "receipt_sent") {
    await send(c, c.tx.pay.waiting);
    return { done: true };
  }
  if (PAID_STATUSES.includes(o.status)) {
    await send(c, c.tx.order.closed, inline([[{ text: c.tx.contact, url: ownerUrl(c) }]]));
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
  const card=env.paymentCardNumber?.trim();
  const paymentRows:InlineButton[][]=[[{text:c.tx.pay.copy,copy:env.kaspiPhone.replace(/[^\d+]/g,"")}]];
  if(card)paymentRows.push([{text:c.tx.pay.copyCard,copy:card}]);
  paymentRows.push([{text:c.tx.pay.sendReceipt,data:`rcpt:${o.number}`}]);
  await send(
    c,
    c.tx.pay.info(price(o.amount), env.kaspiPhone, env.kaspiName, o.number)+(card?"\n\n"+c.tx.pay.card(card):""),
    inline(paymentRows),
  );
  // Чек можно прислать сразу, не нажимая «Чекни юбориш»
  c.s = { q: c.s.q, orderId: o.id };
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
  c.s = { q: c.s.q, orderId: o.id };
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
      console.error("notifyAdmins", e instanceof Error ? e.name : "Error");
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

/**
 * Клиенту: ссылка, QR-код, текст для гостей с кнопкой «Меҳмонларга юбориш».
 * Каждая отправка отдельно: сбой одной не отменяет остальные.
 * afterPayment — сразу после ✅: в конце спасибо и ОДНА кнопка «🆕 Янги таклифнома».
 */
async function sendLinkPack(deps: Deps, o: OrderRecord, afterPayment: boolean) {
  const client = o.userId;
  const tx = txFor(await langOf(deps, client));
  const url = `${deps.env.publicBaseUrl}/${o.slug}`;
  const tg = deps.tg;
  const attempt = async (what: string, fn: () => Promise<unknown>) => {
    try {
      await fn();
      return true;
    } catch (e) {
      console.error("клиенту не отправлено:", what, e instanceof Error ? e.name : "Error");
      return false;
    }
  };
  const linkSent = await attempt("ссылка", () => tg.sendMessage(client, tx.pay.paid(url), { markup: mainMenu(tx) }));
  await attempt("QR", async () => {
    const png = await QRCode.toBuffer(url, { width: 600, margin: 2 });
    await tg.sendPhoto(client, new Uint8Array(png), { caption: tx.pay.qrCaption });
  });
  await attempt("пояснение", () => tg.sendMessage(client, tx.pay.shareIntro));
  const share = guestShareText(o, url);
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(share.replace(url, "").trim())}`;
  const shareSent = await attempt("текст для гостей", () =>
    tg.sendMessage(client, share, { markup: inline([[{ text: tx.pay.shareButton, url: shareUrl }]]) }),
  );
  if (afterPayment) {
    await attempt("спасибо", () => tg.sendMessage(client, tx.pay.thanks, { markup: inline([[{ text: tx.pay.newOrder, data: "new" }]]) }));
  }
  return { linkSent, shareSent };
}

/** «🔗 Ҳавола» в «Менинг таклифномаларим»: оплаченному — ссылка, QR и текст заново; неоплаченному — ссылка НАМУНА */
export async function resendLink(c: Ctx, n: number): Promise<Result> {
  const o = await ownOrder(c, n);
  if (!o) {
    await send(c, c.tx.order.notFound);
    return { done: true };
  }
  if (o.status === "active") await sendLinkPack(c.deps, o, false);
  else await send(c, c.tx.my.item(o.number, namesOf(o.data), c.tx.my.statuses[o.status], pageUrl(c, o.slug)));
  return { done: true };
}

export async function approve(c: Ctx, n: number) {
  if (!(await guardAdmin(c))) return;
  const o0 = await c.deps.repo.getOrderByNumber(n);
  const now = c.deps.now();
  const o = o0 && (await c.deps.repo.transition(o0.id, ["receipt_sent"], "active", { paidAt: now, expiresAt: expiresAt(o0.data) }));
  if (!o) return already(c);
  await c.deps.tg.editMessageReplyMarkup(c.chatId, c.u.messageId, null).catch(() => {});

  const { linkSent, shareSent } = await sendLinkPack(c.deps, o, true);
  await send(c, linkSent && shareSent ? c.tx.admin.approved(n) : c.tx.admin.approvedFailed(n));
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
    // До оплаты — всё можно менять; чек на проверке — ждём; ссылка выдана — заказ закрыт
    const rows: InlineButton[][] = [];
    if (PAYABLE_STATUSES.includes(o.status)) {
      rows.push([
        { text: c.tx.order.edit, data: `edit:${o.number}` },
        { text: c.tx.order.pay(price(o.amount)), data: `pay:${o.number}` },
      ]);
    }
    const last: InlineButton[] = o.status === "active" ? [{ text: c.tx.my.link, data: `link:${o.number}` }] : [];
    rows.push([...last, { text: c.tx.contact, url: ownerUrl(c) }]);
    const title = `${namesOf(o.data)} · ${designName(o.templateId)}`;
    await send(c, c.tx.my.item(o.number, title, c.tx.my.statuses[o.status], pageUrl(c, o.slug)), inline(rows));
  }
}
