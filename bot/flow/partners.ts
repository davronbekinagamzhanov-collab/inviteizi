/**
 * Партнёры: ссылка с кодом, начисление за оплаченный заказ, выплаты и /hamkor.
 * Клиент не платит ничего лишнего; засчитывается первый источник человека (users.source).
 * Кнопки: dp:new, dp:qr:<id>, dp:rate:<id>, dp:pay:<id>:<сумма>, dp:ok:<id>:<сумма>
 */
import { randomBytes } from "node:crypto";
import QRCode from "qrcode";
import type { Period } from "@/lib/analytics";
import type { OrderRecord } from "@/lib/domain";
import { parsePartnerSource, partnerRows, partnerSource, withoutStaff, type PanelSnapshot, type Partner, type PartnerRow } from "@/lib/owner-panel";
import type { InlineButton } from "../tg";
import { recordBotError, toEntry } from "../errors";
import { backRow, ib, inline, price, send, txFor } from "./util";
import type { Ctx, Deps, Result, Step } from "./types";

const PAGE = 8;
export const DEFAULT_RATE = 1000;
const MAX_RATE = 1_000_000;
const CODE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

export function newPartnerCode() {
  return [...randomBytes(8)].map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

export const parseContact = (raw: string): { telegramId: number | null; username: string | null } | null => {
  const v = raw.trim().replace(/^https?:\/\/t\.me\//i, "").replace(/^@/, "");
  if (/^\d{5,15}$/.test(v)) return { telegramId: Number(v), username: null };
  if (/^[A-Za-z][A-Za-z0-9_]{3,31}$/.test(v)) return { telegramId: null, username: v };
  return null;
};

const parseRate = (raw: string) => {
  const n = Number(raw.replace(/[\s ₸]/g, ""));
  return Number.isInteger(n) && n >= 0 && n <= MAX_RATE ? n : null;
};

const isStaff = async (c: Ctx) => c.chatId === c.user.id && (await c.deps.repo.isAdmin(c.user.id));

const contactOf = (p: Partner) => (p.username ? `@${p.username}` : p.telegramId ? `id ${p.telegramId}` : "—");

async function linkOf(deps: Deps, p: Partner) {
  return `https://t.me/${await deps.tg.botUsername()}?start=${partnerSource(p.code)}`;
}

async function sendPack(c: Ctx, p: Partner) {
  const link = await linkOf(c.deps, p);
  const png = await QRCode.toBuffer(link, { width: 600, margin: 2 });
  await c.deps.tg.sendPhoto(c.chatId, new Uint8Array(png), { caption: c.tx.panel.partner.pack(p.name, link, price(p.rate)) });
}

/** Снимок для всех цифр панели и /hamkor: без владельца и админов */
export const panelData = async (deps: Deps) => withoutStaff(await deps.repo.panelSnapshot(), await deps.repo.staffIds());

// ── Экраны панели ──

const statLine = (c: Ctx, r: PartnerRow) => {
  const t = c.tx.panel.partner;
  return `${t.scanned}: ${r.scanned} · ${t.started}: ${r.started} · ${t.paid}: ${r.paid}\n${t.due}: ${price(r.due)} · ${t.paidOut}: ${price(r.paidOut)}`;
};

export function partnerList(c: Ctx, s: PanelSnapshot, rows: PartnerRow[], p: Period, pageArg: string) {
  const t = c.tx.panel.partner;
  if (!s.partnersReady) return { text: t.notReady, rows: [] as InlineButton[][] };
  const sorted = [...rows].sort((a, b) => b.due - a.due || a.partner.id - b.partner.id);
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE));
  const page = Math.min(Math.max(0, Number(pageArg) || 0), pages - 1);
  const shown = sorted.slice(page * PAGE, (page + 1) * PAGE);
  const list = shown.map((r) => `${r.partner.name.slice(0, 40)}\n${statLine(c, r)}${r.undelivered ? `\n${t.undelivered(r.undelivered)}` : ""}`);
  const nav: InlineButton[][] = [];
  if (pages > 1) {
    const to = (n: number) => `dash:partners:${p}::${n}`;
    nav.push([{ text: "◀", data: to(Math.max(0, page - 1)) }, { text: `${page + 1}/${pages}`, data: to(page) }, { text: "▶", data: to(Math.min(pages - 1, page + 1)) }]);
  }
  return {
    text: list.join("\n\n") || t.empty,
    rows: [
      ...shown.map((r) => [{ text: r.partner.name.slice(0, 50), data: `dash:partners:${p}:${r.partner.id}` }]),
      ...nav,
      [{ text: t.add, data: "dp:new" }],
    ],
  };
}

export function partnerDetail(c: Ctx, s: PanelSnapshot, rows: PartnerRow[], p: Period, idArg: string) {
  const t = c.tx.panel.partner;
  const back: InlineButton[] = [{ text: c.tx.back, data: `dash:partners:${p}` }];
  const r = rows.find((x) => String(x.partner.id) === idArg);
  if (!r) return { text: t.empty, rows: [back] };
  const buttons: InlineButton[][] = [];
  if (r.due > 0) buttons.push([{ text: t.pay(price(r.due)), data: `dp:pay:${r.partner.id}:${r.due}` }]);
  buttons.push([{ text: t.qr, data: `dp:qr:${r.partner.id}` }, { text: t.rate, data: `dp:rate:${r.partner.id}` }], back);
  return {
    text: `${r.partner.name}\n${contactOf(r.partner)} · ${t.rateValue}: ${price(r.partner.rate)}\n\n${statLine(c, r)}${r.undelivered ? `\n${t.undelivered(r.undelivered)}` : ""}`,
    rows: buttons,
  };
}

/** Кнопки партнёров: права проверяются при каждом нажатии */
export async function partnerAction(c: Ctx, action: string, idArg: string, amountArg: string): Promise<Result | void> {
  if (!(await isStaff(c))) {
    await send(c, c.tx.dashboard.denied);
    return;
  }
  const t = c.tx.panel.partner;
  if (action === "new") {
    c.s.partnerDraft = {};
    return { enter: "partnerName" };
  }
  const partner = await c.deps.repo.getPartner(Number(idArg));
  if (!partner) {
    await send(c, t.empty);
    return;
  }
  if (action === "qr") {
    await sendPack(c, partner);
    return;
  }
  if (action === "rate") {
    c.s.partnerId = partner.id;
    return { enter: "partnerRateEdit" };
  }
  const amount = Number(amountArg);
  if (!Number.isInteger(amount) || amount <= 0) return;
  if (action === "pay") {
    await send(c, t.payConfirm(partner.name, price(amount)), inline([[{ text: t.payYes, data: `dp:ok:${partner.id}:${amount}` }]]));
    return;
  }
  if (action === "ok") {
    // Сумма в кнопке: двойное нажатие или устаревшая кнопка не проведут выплату второй раз
    const done = await c.deps.repo.recordPartnerPayout(partner.id, amount, c.user.id);
    await send(c, done ? t.paidDone(partner.name, price(amount)) : t.payStale);
  }
}

// ── Добавление партнёра ──

const staffOnly = (step: (c: Ctx, text: string) => Promise<Result>) => async (c: Ctx): Promise<Result> => {
  if (!(await isStaff(c))) return { done: true };
  if (c.u.kind !== "text" || !c.u.text.trim()) return null;
  return step(c, c.u.text.trim());
};

export const partnerName: Step = {
  async ask(c) {
    await send(c, c.tx.panel.partner.askName, inline([backRow(c)]));
  },
  onMessage: staffOnly(async (c, text) => {
    if (text.length > 80) return { hint: c.tx.tooLong(80) };
    c.s.partnerDraft = { name: text };
    return { to: "partnerContact" };
  }),
};

export const partnerContact: Step = {
  async ask(c) {
    await send(c, c.tx.panel.partner.askContact, inline([backRow(c)]));
  },
  onMessage: staffOnly(async (c, text) => {
    const contact = parseContact(text);
    if (!contact) return { hint: c.tx.panel.partner.badContact };
    c.s.partnerDraft = { ...c.s.partnerDraft, ...contact };
    return { to: "partnerRate" };
  }),
};

async function finishPartner(c: Ctx, rate: number): Promise<Result> {
  const d = c.s.partnerDraft;
  if (!d?.name) return { to: "partnerName" };
  const partner = await c.deps.repo.createPartner({ code: newPartnerCode(), name: d.name, telegramId: d.telegramId ?? null, username: d.username ?? null, rate });
  await sendPack(c, partner);
  return { done: true };
}

export const partnerRate: Step = {
  async ask(c) {
    await send(c, c.tx.panel.partner.askRate, inline([[ib(c, price(DEFAULT_RATE), "default")], backRow(c)]));
  },
  async onButton(c, v) {
    if (!(await isStaff(c))) return { done: true };
    return v === "default" ? finishPartner(c, DEFAULT_RATE) : null;
  },
  onMessage: staffOnly(async (c, text) => {
    const rate = parseRate(text);
    return rate === null ? { hint: c.tx.panel.partner.badRate } : finishPartner(c, rate);
  }),
};

export const partnerRateEdit: Step = {
  async ask(c) {
    await send(c, c.tx.panel.partner.askRate, inline([backRow(c)]));
  },
  onMessage: staffOnly(async (c, text) => {
    const rate = parseRate(text);
    if (rate === null) return { hint: c.tx.panel.partner.badRate };
    if (c.s.partnerId) await c.deps.repo.setPartnerRate(c.s.partnerId, rate);
    await send(c, c.tx.panel.partner.rateSaved(price(rate)));
    return { done: true };
  }),
};

// ── Начисление ──

/** Кому писать: id из карточки или человек с таким username, который нажимал /start */
async function recipientOf(deps: Deps, p: Partner) {
  if (p.telegramId) return deps.repo.getUser(p.telegramId);
  return p.username ? deps.repo.findUserByUsername(p.username) : null;
}

/**
 * Начислить партнёру за оплаченный заказ (один раз) и сообщить ему.
 * Ставка берётся на момент оплаты: смена ставки не меняет прошлые начисления.
 */
export async function creditPartner(deps: Deps, order: Pick<OrderRecord, "id" | "userId">) {
  // Заказ владельца или админа: ни начисления, ни сообщения партнёру
  if ((await deps.repo.staffIds()).includes(order.userId)) return;
  const client = await deps.repo.getUser(order.userId);
  const code = parsePartnerSource(client?.source ?? null);
  if (!code) return;
  const credit = await deps.repo.creditPartnerOrder(order.id, order.userId, code);
  if (!credit) return;
  const recipient = await recipientOf(deps, credit.partner);
  // Партнёр не нажимал /start: пропускаем молча, панель покажет отметку
  if (!recipient) return;
  try {
    await deps.tg.sendMessage(recipient.id, txFor(recipient.lang).partner.paidNotice(price(credit.amount)));
    await deps.repo.markEarningDelivered(order.id);
  } catch (e) {
    console.error("partner notice", e instanceof Error ? e.name : "Error");
  }
}

/** После подтверждения оплаты: сбой партнёрской части не должен мешать выдаче ссылки */
export async function creditPartnerSafely(c: Ctx, order: OrderRecord) {
  try {
    await creditPartner(c.deps, order);
  } catch (e) {
    console.error("credit partner", e instanceof Error ? e.name : "Error");
    await recordBotError(c.deps, toEntry(e, c.u, c.step, "ack"));
  }
}

// ── /hamkor ──

/** true — партнёр увидел свои цифры */
export async function partnerStats(c: Ctx): Promise<boolean> {
  if (c.chatId !== c.user.id) return false;
  const partner = await c.deps.repo.findPartnerForUser(c.user.id, c.user.username);
  if (!partner) return false;
  const row = partnerRows(await panelData(c.deps), "all", c.deps.now()).find((r) => r.partner.id === partner.id);
  if (!row) return false;
  await send(c, c.tx.partner.stats({
    link: await linkOf(c.deps, partner),
    scanned: row.scanned,
    started: row.started,
    paid: row.paid,
    earned: price(row.earned),
    paidOut: price(row.paidOut),
    due: price(row.due),
  }));
  return true;
}
