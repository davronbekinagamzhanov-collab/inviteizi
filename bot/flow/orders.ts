import { CURRENT_DESIGN_VERSION } from "@/templates/design-version";
import { rsvpTotals } from "@/lib/rsvp";
/** Заказ: создание/сохранение, оплата Kaspi, чек, решение админа, «мои приглашения», смена ссылки */
import QRCode from "qrcode";
import type { Ctx, Deps, Draft, Result, Step } from "./types";
import type { Lang, OrderRecord } from "@/lib/domain";
import type { InlineButton } from "../tg";
import { PRICES } from "@/templates/registry";
import { tPlain as t } from "@/texts/uz-cyrl";
import { uz } from "@/texts/bot-uz";
import { staff } from "@/texts/bot-ru";
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
  startMenu,
  namesOf,
  ownerUrl,
  PAID_STATUSES,
  PAYABLE_STATUSES,
  pageUrl,
  price,
  send,
  txFor,
  texts,
} from "./util";
import { getDesign, isOnSale } from "@/templates/registry";
import { rememberUpdate } from "../update";
import { recordBotError, toEntry } from "../errors";
import { paidNotices } from "./notify";
import { isQuiet } from "@/lib/quiet-hours";
import { creditPartnerSafely } from "./partners";
import { isSeller } from "./panel";
import { kzToday } from "../calendar";

/** Последний тадбир уже прошёл (по времени Казахстана): платить за такую ссылку бессмысленно — она сразу заглушка */
function eventsPassed(c: Ctx, o: OrderRecord) {
  const last = o.data.events.map((e) => e.date).filter(Boolean).sort().at(-1);
  return !!last && last < kzToday(c.deps.now());
}

/**
 * Сообщение после уже записанного действия (заказ, чек, оплата): ошибка здесь не должна вызывать
 * повтор update, потому что само действие выполнено. Одна быстрая повторная попытка, затем журнал.
 */
async function sendAfterCommit(c: Ctx, chatId: number, text: string, opts?: Parameters<Ctx["deps"]["tg"]["sendMessage"]>[2]) {
  for (let left = 1; ; left--) {
    try {
      await c.deps.tg.sendMessage(chatId, text, opts);
      return true;
    } catch (e) {
      if (left > 0) continue;
      console.error("after commit", e instanceof Error ? e.name : "Error");
      await recordBotError(c.deps, toEntry(e, c.u, c.step, "ack"));
      return false;
    }
  }
}

// ── Создание / сохранение из сводки ──

/** seller — владелец или менеджер: может отдать неоплаченный заказ клиенту (cl:<n>) */
export function orderButtons(c: Ctx, o: OrderRecord, seller: boolean): InlineButton[][] {
  const rows: InlineButton[][] = [];
  if (PAYABLE_STATUSES.includes(o.status)) rows.push([{ text: c.tx.order.pay(price(o.amount)), data: `pay:${o.number}` }]);
  rows.push([{ text: c.tx.order.edit, data: `edit:${o.number}` }]);
  if (seller && PAYABLE_STATUSES.includes(o.status)) rows.push([{ text: staff.btn.toClient, data: `cl:${o.number}` }]);
  return rows;
}

/** Итог сохранения черновика в заказ — одинаковый для чата и приложения */
export type UpsertOutcome =
  | { kind: "created" | "updated"; order: OrderRecord }
  | { kind: "incomplete" | "notFound" | "formatLocked" | "catalogChanged" | "race" }
  | { kind: "closed" | "waiting" };

/**
 * Черновик → заказ (НАМУНА). Есть orderId — правка неоплаченного заказа (та же ссылка), иначе новый заказ.
 * Новый заказ создаётся атомарно вместе с «занятием» вопроса expectedQ: двойное нажатие не создаст второй.
 */
export async function upsertDraftOrder(deps: Deps, userId: number, s: Draft, expectedQ: number, handledUpdates?: number[]): Promise<UpsertOutcome> {
  const data = finalData(s);
  if (!s.templateId || !s.format || !data.events.length || !(s.data?.events ?? []).every(isCompleteEvent)) return { kind: "incomplete" };
  const music = s.music ?? { kind: "none" as const };
  const repo = deps.repo;

  if (s.orderId) {
    const old = await repo.getOrder(s.orderId);
    if (!old || old.userId !== userId) return { kind: "notFound" };
    // The status guard belongs in the UPDATE, not only in the earlier read.
    if (!PAYABLE_STATUSES.includes(old.status)) return { kind: old.status === "receipt_sent" ? "waiting" : "closed" };
    // До оплаты можно сменить и дизайн, и формат (решение владельца 03.11.2026): новый формат — новая цена.
    // Тот же дизайн и формат — прежняя согласованная сумма (даже если каталог потом переклассифицировал дизайн).
    const selected = getDesign(s.templateId);
    const unchanged = s.templateId === old.templateId && s.format === old.format;
    if (!unchanged && (!selected || !isOnSale(selected.id) || selected.format !== s.format || selected.occasion !== old.occasion)) {
      s.format = old.format;
      s.templateId = old.templateId;
      return { kind: "formatLocked" };
    }
    const preservedData = { ...data };
    delete preservedData.designVersion;
    if (old.data.designVersion) preservedData.designVersion = old.data.designVersion;
    const o = await repo.transition(old.id, PAYABLE_STATUSES, old.status, {
      data: preservedData,
      music,
      templateId: s.templateId,
      // Тот же формат — согласованная сумма (каталог её не меняет); другой формат — цена этого формата
      format: s.format,
      amount: s.format === old.format ? old.amount : PRICES[s.format],
    });
    if (!o) {
      const current = await repo.getOrder(old.id);
      return { kind: current?.status === "receipt_sent" ? "waiting" : "closed" };
    }
    return { kind: "updated", order: o };
  }

  const selected = getDesign(s.templateId);
  // Старый черновик мог запомнить дизайн, который потом сняли с каталога: купить его уже нельзя
  if (!selected || !isOnSale(selected.id) || selected.format !== s.format || selected.occasion !== data.occasion) return { kind: "catalogChanged" };
  const slugBase = data.occasion === "nikoh" ? slugify(data.groom ?? "", data.bride ?? "") : slugify(data.person ?? "");
  const o = await repo.createOrderFromDraft(
    {
      userId,
      occasion: data.occasion,
      format: s.format,
      templateId: s.templateId,
      data: { ...data, designVersion: CURRENT_DESIGN_VERSION },
      music,
      amount: PRICES[s.format],
      status: "preview",
      slugBase,
    },
    expectedQ,
    handledUpdates,
  );
  return o ? { kind: "created", order: o } : { kind: "race" };
}

export async function confirmDraft(c: Ctx): Promise<Result> {
  const r = await upsertDraftOrder(c.deps, c.user.id, c.s, c.q0, c.u.updateId === undefined ? undefined : rememberUpdate(c.user.state.handledUpdates, c.u.updateId));
  switch (r.kind) {
    case "incomplete":
      return null;
    case "notFound":
      return { hint: c.tx.order.notFound };
    case "formatLocked":
      return { hint: c.tx.order.formatLocked };
    case "waiting":
    case "closed":
      await send(c, r.kind === "waiting" ? c.tx.pay.waiting : c.tx.order.closed);
      return { done: true };
    case "catalogChanged":
      c.s.ret = "review";
      await send(c, c.tx.order.catalogChanged);
      return { to: "fmt" };
    case "race":
      return { ignore: true };
    case "updated":
      await send(c, c.tx.order.updated(pageUrl(c, r.order.slug)), inline(orderButtons(c, r.order, await isSeller(c))));
      return { done: true };
    case "created":
      await sendAfterCommit(c, c.chatId, c.tx.order.created(pageUrl(c, r.order.slug)), { markup: inline(orderButtons(c, r.order, await isSeller(c))) });
      // Repo already finished this draft in the same transaction. Do not overwrite a newer dialog.
      return { ignore: true };
  }
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
  if (eventsPassed(c, o)) {
    await send(c, c.tx.pay.eventPassed, inline(orderButtons(c, o, false).filter((r) => !r.some((b) => "data" in b && b.data.startsWith("pay:")))));
    return { done: true };
  }
  await c.deps.repo.transition(o.id, PAYABLE_STATUSES, "awaiting_payment");
  const env = c.deps.env;
  const card=env.paymentCardNumber?.trim();
  const paymentRows:InlineButton[][]=[[{text:c.tx.pay.copy,copy:env.kaspiPhone.replace(/[^\d+]/g,"")}]];
  if(card)paymentRows.push([{text:c.tx.pay.copyCard,copy:card}]);
  // Сумма в кнопке: если до чека сменили формат (новая цена), старая кнопка снова покажет реквизиты
  paymentRows.push([{text:c.tx.pay.sendReceipt,data:`rcpt:${o.number}:${o.amount}`}]);
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
export async function askReceipt(c: Ctx, n: number, shownAmount?: number): Promise<Result> {
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
  if (eventsPassed(c, o)) {
    await send(c, c.tx.pay.eventPassed, inline(orderButtons(c, o, false).filter((r) => !r.some((b) => "data" in b && b.data.startsWith("pay:")))));
    return { done: true };
  }
  // Клиент видел реквизиты с другой суммой (цена сменилась) — показываем актуальные
  if (shownAmount !== undefined && shownAmount !== o.amount) return payOrder(c, n);
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
    // Сначала админы: при сбое ответа клиенту повтор уже не дойдёт до этого места (чек принят)
    try {
      await notifyAdmins(c.deps, o);
    } catch (e) {
      // Заказ остаётся в receipt_sent, cron напомнит админам
      console.error("notifyAdmins", e instanceof Error ? e.name : "Error");
      await recordBotError(c.deps, toEntry(e, c.u, c.step, "ack"));
    }
    await sendAfterCommit(c, c.chatId, isQuiet(c.deps.now()) ? c.tx.pay.receiptGotNight : c.tx.pay.receiptGot, { markup: mainMenu() });
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
/** Чек заказа одному админу: фото/файл с карточкой и кнопками решения */
export async function sendReceiptTo(deps: Deps, adminId: number, o: OrderRecord, prefix = "") {
  const client = await deps.repo.getUser(o.userId);
  const lang = await langOf(deps, adminId);
  const caption = prefix + adminCard(deps, o, lang, client);
  const opts = { caption, markup: inline(decisionButtons(txFor(lang), o.number)) };
  if (o.receipt?.kind === "document") await deps.tg.sendDocument(adminId, o.receipt.fileId, opts);
  else if (o.receipt) await deps.tg.sendPhoto(adminId, o.receipt.fileId, opts);
  else await deps.tg.sendMessage(adminId, caption, { markup: opts.markup });
}

export async function notifyAdmins(deps: Deps, o: OrderRecord, prefix = "") {
  for (const adminId of await deps.repo.listAdminIds()) {
    try {
      await sendReceiptTo(deps, adminId, o, prefix);
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
const RU_CAUSE: Record<string, string> = { nikoh: "по случаю свадьбы", sunnat: "по случаю суннат-тоя", yubiley: "по случаю юбилея" };
const KK_CAUSE: Record<string, string> = { nikoh: "үйлену тойына", sunnat: "сүндет тойына", yubiley: "мерейтойына" };

export function guestShareText(o: OrderRecord, url: string) {
  const d = o.data;
  // Гостям — на главном языке приглашения (по умолчанию узбекский)
  const main = d.mainLang && d.langs?.includes(d.mainLang) ? d.mainLang : "uz";
  const g = texts[main].guest;
  const cause = main === "kk" ? KK_CAUSE[d.cause ?? "nikoh"] : main === "ru" ? RU_CAUSE[d.cause ?? "nikoh"] : t.occasionTitles[d.cause ?? "nikoh"].toLowerCase();
  const what =
    d.occasion === "nikoh"
      ? g.nikoh(d.groom ?? "", d.bride ?? "")
      : d.occasion === "sunnat"
        ? g.sunnat(d.person ?? "")
        : d.occasion === "nahorgi"
          ? g.nahorgi(d.person ?? "", cause)
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
  const linkSent = await attempt("ссылка", () => tg.sendMessage(client, tx.pay.paid(url), { markup: mainMenu() }));
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
    await attempt("спасибо", () =>
      tg.sendMessage(client, tx.pay.thanks, {
        markup: inline([...(o.data.rsvp ? [[{ text: tx.rsvp.answers, data: `rsvp:${o.number}` }]] : []), [{ text: tx.pay.newOrder, data: "new" }]]),
      }),
    );
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

const RSVP_SHOWN = 40;

/** Ответы гостей: видит только хозяин заказа */
export async function rsvpAnswers(c: Ctx, n: number): Promise<Result> {
  const o = await ownOrder(c, n);
  if (!o) {
    await send(c, c.tx.order.notFound);
    return { stay: true };
  }
  const list = await c.deps.repo.listRsvp(o.id);
  if (!list.length) {
    await send(c, c.tx.rsvp.empty);
    return { stay: true };
  }
  const total = rsvpTotals(list);
  const lines = list.slice(0, RSVP_SHOWN).map((r) => (r.attending ? c.tx.rsvp.lineYes(r.name, r.guests) : c.tx.rsvp.lineNo(r.name)));
  if (list.length > RSVP_SHOWN) lines.push(c.tx.rsvp.more(list.length - RSVP_SHOWN));
  await send(c, [c.tx.rsvp.head(total.replies, total.people, total.declined), "", ...lines].join("\n"));
  return { stay: true };
}

export async function approve(c: Ctx, n: number) {
  if (!(await guardAdmin(c))) return;
  const o0 = await c.deps.repo.getOrderByNumber(n);
  const now = c.deps.now();
  const o = o0 && (await c.deps.repo.transition(o0.id, ["receipt_sent"], "active", { paidAt: now, expiresAt: expiresAt(o0.data) }));
  if (!o) return already(c);
  await c.deps.tg.editMessageReplyMarkup(c.chatId, c.u.messageId, null).catch(() => {});

  await creditPartnerSafely(c, o);
  const { linkSent, shareSent } = await sendLinkPack(c.deps, o, true);
  // «💳 №134 · 8 000 ₸ · дизайн · кто привёл» — к ответу подтвердившего; другим админам и менеджеру — отдельно
  const paidLine = await paidNotices(c.deps, o, c.user.id).catch(async (e) => {
    await recordBotError(c.deps, toEntry(e, c.u, c.step, "ack"));
    return "";
  });
  const done = linkSent && shareSent ? c.tx.admin.approved(n) : c.tx.admin.approvedFailed(n);
  await sendAfterCommit(c, c.chatId, paidLine ? `${done}\n${paidLine}` : done);
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
  const tx = txFor(await langOf(c.deps, o.userId).catch(() => "uz" as const));
  await sendAfterCommit(c, o.userId, tx.pay.rejected(n, tx.admin.reasons[code]), {
    markup: inline([[{ text: tx.pay.resend, data: `rcpt:${n}:${o.amount}` }], [{ text: tx.contact, url: ownerUrl(c) }]]),
  });
  await sendAfterCommit(c, c.chatId, c.tx.admin.rejectedDone(n, c.tx.admin.reasons[code]));
}

// ── «Менинг таклифномаларим» ──

const MY_LIMIT = 10;

export async function myOrders(c: Ctx) {
  const list = (await c.deps.repo.listOrdersByUser(c.user.id)).slice(0, MY_LIMIT);
  if (!list.length) {
    await send(c, c.tx.my.empty, await startMenu(c));
    return;
  }
  const seller = await isSeller(c);
  for (const o of list) {
    // До оплаты — всё можно менять; чек на проверке — ждём; ссылка выдана — заказ закрыт
    const rows: InlineButton[][] = [];
    if (PAYABLE_STATUSES.includes(o.status)) {
      rows.push([
        { text: c.tx.order.edit, data: `edit:${o.number}` },
        { text: c.tx.order.pay(price(o.amount)), data: `pay:${o.number}` },
      ]);
      if (seller) rows.push([{ text: staff.btn.toClient, data: `cl:${o.number}` }]);
    }
    const last: InlineButton[] = o.status === "active" ? [{ text: c.tx.my.link, data: `link:${o.number}` }] : [];
    if (o.status === "active" && o.data.rsvp) rows.push([{ text: c.tx.rsvp.answers, data: `rsvp:${o.number}` }]);
    rows.push([...last, { text: c.tx.contact, url: ownerUrl(c) }]);
    const title = `${namesOf(o.data)} · ${designName(o.templateId)}`;
    await send(c, c.tx.my.item(o.number, title, c.tx.my.statuses[o.status], pageUrl(c, o.slug)), inline(rows));
  }
}
