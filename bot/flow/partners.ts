/**
 * Партнёры (v2, часть 5): создание (название → телефон → ставка → график), ссылка join_ на 7 дней,
 * подтверждение владельцем партнёров менеджера, предложения ставки, «спящие», начисление за оплаченный заказ.
 * Экраны владельца и менеджера — по-русски (staff.pt), партнёра — на его языке (role).
 * Кнопки: pa:<действие>:<id>[:<x>] — права проверяются при каждом нажатии.
 * Старые кнопки панели-отчёта (dp:…) работают как раньше.
 */
import { randomBytes } from "node:crypto";
import QRCode from "qrcode";
import type { Period } from "@/lib/analytics";
import type { OrderRecord } from "@/lib/domain";
import {
  parsePartnerSource,
  partnerRows,
  partnerSource,
  SCHEDULES,
  withoutStaff,
  type PanelSnapshot,
  type Partner,
  type PartnerRow,
  type PayoutSchedule,
} from "@/lib/owner-panel";
import { hashToken, INVITE_TTL_MS, managerName, newToken } from "@/lib/roles";
import { isQuiet } from "@/lib/quiet-hours";
import { staff as S } from "@/texts/bot-ru";
import type { InlineButton } from "../tg";
import { recordBotError, toEntry } from "../errors";
import { editOrSend, ib, inline, price, roleOf, send, texts, txFor } from "./util";
import { roleHome } from "./panel";
import type { Ctx, Deps, Result, Step } from "./types";

const PAGE = 8;
export const DEFAULT_RATE = 1000;
const MAX_RATE = 1_000_000;
const RATE_PRESETS = [0, 500, 1000, 2000];
export const SLEEP_AFTER_MS = 14 * 24 * 3_600_000;
const CODE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const T = S.pt;

export function newPartnerCode() {
  return [...randomBytes(8)].map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

// ── Номера ──

/** Телефон → +77011234567. 8 701… и 701… — казахстанские; 998… и другие — как есть. null — не номер */
export function normalizePhone(raw: string): string | null {
  const d = raw.trim().replace(/[\s\-().]/g, "").replace(/^\+/, "");
  if (!/^\d+$/.test(d)) return null;
  if (d.length === 10 && d[0] === "7") return `+7${d}`;
  if (d.length === 11 && (d[0] === "7" || d[0] === "8")) return `+7${d.slice(1)}`;
  if (d.length >= 11 && d.length <= 15 && d[0] !== "0" && d[0] !== "8") return `+${d}`;
  return null;
}

/** Kaspi: телефон (+7…) или карта из 16 цифр («4400 4301 2345 6789») */
export function normalizeKaspi(raw: string): string | null {
  const d = raw.trim().replace(/[\s-]/g, "");
  if (/^\d{16}$/.test(d)) return d.replace(/(\d{4})(?=\d)/g, "$1 ");
  return normalizePhone(raw);
}

/** +77011234567 → +7 701 123 45 67 */
export const fmtPhone = (p: string) => p.replace(/^\+7(\d{3})(\d{3})(\d{2})(\d{2})$/, "+7 $1 $2 $3 $4");

const parseRate = (raw: string) => {
  const n = Number(raw.replace(/[\s ₸]/g, ""));
  return raw.trim() && Number.isInteger(n) && n >= 0 && n <= MAX_RATE ? n : null;
};

const isSchedule = (v: string): v is PayoutSchedule => (SCHEDULES as string[]).includes(v);

const termsOf = (rate: number, schedule: PayoutSchedule) => (rate === 0 ? T.noPayout : T.terms(price(rate), T.scheduleLower[schedule]));

const tgOf = (p: Pick<Partner, "username" | "telegramId">) => (p.username ? `@${p.username}` : p.telegramId ? `id ${p.telegramId}` : T.notJoined);

// ── Ссылки и QR ──

async function linkOf(deps: Deps, p: Partner) {
  return `https://t.me/${await deps.tg.botUsername()}?start=${partnerSource(p.code)}`;
}

export async function sendPack(c: Ctx, p: Partner) {
  const link = await linkOf(c.deps, p);
  const png = await QRCode.toBuffer(link, { width: 600, margin: 2 });
  await c.deps.tg.sendPhoto(c.chatId, new Uint8Array(png), { caption: c.tx.panel.partner.pack(p.name, link, price(p.rate)) });
}

/** Одноразовая ссылка партнёру (7 дней) + кнопки WhatsApp на узбекском и русском */
async function joinLink(c: Ctx, p: Partner) {
  const token = newToken();
  await c.deps.repo.createInvite({ tokenHash: hashToken(token), kind: "partner", createdBy: c.user.id, partnerId: p.id, expiresAt: new Date(+c.deps.now() + INVITE_TTL_MS.partner) });
  const link = `https://t.me/${await c.deps.tg.botUsername()}?start=join_${token}`;
  const wa: InlineButton[][] = [
    [{ text: S.btn.waUz, url: `https://wa.me/?text=${encodeURIComponent(texts.uz.role.joinShare(link))}` }],
    [{ text: S.btn.waRu, url: `https://wa.me/?text=${encodeURIComponent(texts.ru.role.joinShare(link))}` }],
  ];
  return { link, wa };
}

/** Снимок для всех цифр панели и /hamkor: без владельца и админов */
export const panelData = async (deps: Deps) => withoutStaff(await deps.repo.panelSnapshot(), await deps.repo.staffIds());

// ── Экраны панели-отчёта (/dashboard, язык владельца) ──

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
    text: `${r.partner.name}\n${tgOf(r.partner)} · ${t.rateValue}: ${price(r.partner.rate)}\n\n${statLine(c, r)}${r.undelivered ? `\n${t.undelivered(r.undelivered)}` : ""}`,
    rows: buttons,
  };
}

const isOwner = async (c: Ctx) => (await roleOf(c)) === "owner";
const canAddPartners = async (c: Ctx) => ["owner", "manager"].includes(await roleOf(c));

/** Кнопки dp: панели-отчёта. Ставка, выплаты и QR — только владелец */
export async function partnerAction(c: Ctx, action: string, idArg: string, amountArg: string): Promise<Result | void> {
  if (action === "new" && (await canAddPartners(c))) return startNewPartner(c);
  if (!(await isOwner(c))) {
    await send(c, c.tx.dashboard.denied);
    return;
  }
  const t = c.tx.panel.partner;
  const partner = await c.deps.repo.getPartner(Number(idArg));
  if (!partner) return void (await send(c, t.empty));
  if (action === "qr") return void (await sendPack(c, partner));
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

// ── Экраны владельца и менеджера (pa:) ──

type Screen = { text: string; rows: InlineButton[][] };

/** Владелец видит всех, менеджер — только свою сеть */
async function visibleRows(c: Ctx, role: "owner" | "manager") {
  const rows = partnerRows(await panelData(c.deps), "all", c.deps.now());
  return role === "owner" ? rows : rows.filter((r) => r.partner.managedBy === c.user.id);
}

const ORDER = { pending: 0, active: 1, rejected: 2 };
const hasProposal = (p: Partner) => p.proposedRate !== null && p.status !== "rejected";

export async function ptList(c: Ctx, role: "owner" | "manager", pageArg = ""): Promise<Screen> {
  const back: InlineButton[] = [{ text: S.back, data: "pn:home" }];
  const add: InlineButton[] = [{ text: T.btn.add, data: "pa:new" }];
  const rows = (await visibleRows(c, role)).sort(
    (a, b) =>
      ORDER[a.partner.status] - ORDER[b.partner.status] ||
      Number(hasProposal(b.partner)) - Number(hasProposal(a.partner)) ||
      b.due - a.due ||
      a.partner.id - b.partner.id,
  );
  if (!rows.length) return { text: T.listNone, rows: [add, back] };
  const pages = Math.ceil(rows.length / PAGE);
  const page = Math.min(Math.max(0, Number(pageArg) || 0), pages - 1);
  const shown = rows.slice(page * PAGE, (page + 1) * PAGE);
  const pending = rows.filter((r) => r.partner.status === "pending").length;
  const mark = (p: Partner) => (hasProposal(p) && p.status === "active" ? "✏️" : T.mark[p.status]);
  const nav: InlineButton[][] = [];
  if (pages > 1) {
    const to = (n: number) => `pa:l:0:${n}`;
    nav.push([{ text: "◀", data: to(Math.max(0, page - 1)) }, { text: `${page + 1}/${pages}`, data: to(page) }, { text: "▶", data: to(Math.min(pages - 1, page + 1)) }]);
  }
  return {
    text: [
      T.listTitle,
      ...(pending ? [T.pendingTitle(pending)] : []),
      "",
      ...shown.map((r) => T.line(mark(r.partner), r.partner.name.slice(0, 40), r.paid, r.due > 0 ? price(r.due) : "")),
    ].join("\n"),
    rows: [...shown.map((r) => [{ text: `${mark(r.partner)} ${r.partner.name.slice(0, 40)}`, data: `pa:v:${r.partner.id}` }]), ...nav, add, back],
  };
}

async function managerLabel(deps: Deps, id: number | null) {
  if (id === null) return "";
  const m = (await deps.repo.listManagers()).find((x) => x.telegramId === id);
  return m ? managerName(m) : `id ${id}`;
}

export async function ptCard(c: Ctx, role: "owner" | "manager", p: Partner): Promise<Screen> {
  const r = (await visibleRows(c, role)).find((x) => x.partner.id === p.id);
  const proposal = hasProposal(p) && p.proposedSchedule ? termsOf(p.proposedRate!, p.proposedSchedule) : "";
  const card = T.card({
    name: p.name,
    status: T.status[p.status],
    phone: p.phone ? fmtPhone(p.phone) : T.none,
    tg: tgOf(p),
    kaspi: p.kaspi ? fmtPhone(p.kaspi) : T.none,
    terms: termsOf(p.rate, p.schedule),
    manager: role === "owner" ? await managerLabel(c.deps, p.managedBy) : "",
    proposal,
  });
  const stats = r
    ? T.stats({ scanned: r.scanned, started: r.started, paid: r.paid, earned: price(r.earned), paidOut: price(r.paidOut), due: price(r.due), onHold: r.onHold > 0 ? price(r.onHold) : "" })
    : "";
  const rows: InlineButton[][] = [];
  if (role === "owner") {
    if (p.status === "pending") rows.push([{ text: T.btn.approve, data: `pa:ok:${p.id}` }, { text: T.btn.reject, data: `pa:no:${p.id}` }]);
    if (proposal) rows.push([{ text: T.btn.acceptProposal, data: `pa:pok:${p.id}` }], [{ text: T.btn.rejectProposal, data: `pa:pno:${p.id}` }]);
    if (r && r.due > 0) rows.push([{ text: T.btn.pay(price(r.due)), data: `pa:pay:${p.id}:${r.due}` }]);
    if (p.status !== "rejected") rows.push([{ text: T.btn.rate, data: `pa:rate:${p.id}` }, { text: T.btn.schedule, data: `pa:sch:${p.id}` }]);
  } else if (p.status !== "rejected" && !proposal) rows.push([{ text: T.btn.propose, data: `pa:prop:${p.id}` }]);
  if (p.status !== "rejected") {
    rows.push(p.telegramId === null ? [{ text: T.btn.qr, data: `pa:qr:${p.id}` }, { text: T.btn.link, data: `pa:link:${p.id}` }] : [{ text: T.btn.qr, data: `pa:qr:${p.id}` }]);
  }
  rows.push([{ text: S.back, data: "pa:l" }]);
  return { text: stats ? `${card}\n\n${stats}` : card, rows };
}

async function show(c: Ctx, s: Screen) {
  if (c.u.kind === "callback") await editOrSend(c, s.text, inline(s.rows));
  else await send(c, s.text, inline(s.rows));
}

async function toast(c: Ctx, text: string) {
  if (c.u.kind !== "callback") return;
  await c.deps.tg.answerCallbackQuery(c.u.callbackId, { text });
  c.answered = true;
}

const OWNER_ONLY = new Set(["ok", "no", "pok", "pno", "rate", "sch", "sset", "pay", "paid"]);

/** Кнопки pa:… владельца и менеджера */
export async function ptAction(c: Ctx, action: string, idArg: string, x: string): Promise<Result | void> {
  const role = await roleOf(c);
  if (role !== "owner" && role !== "manager") return void (await toast(c, c.tx.oldButton));
  if (action === "new") return startNewPartner(c);
  if (action === "l") return show(c, await ptList(c, role, x));
  const p = await c.deps.repo.getPartner(Number(idArg));
  // Менеджер видит только свою сеть; решения и выплаты — только владелец
  if (!p || (role === "manager" && p.managedBy !== c.user.id) || (OWNER_ONLY.has(action) && role !== "owner")) return void (await toast(c, c.tx.oldButton));

  switch (action) {
    case "v":
      return show(c, await ptCard(c, role, p));
    case "qr":
      return void (await sendPack(c, p));
    case "link": {
      if (p.telegramId !== null || p.status === "rejected") return show(c, await ptCard(c, role, p));
      const { link, wa } = await joinLink(c, p);
      return void (await send(c, T.newLink(p.name, link), inline(wa)));
    }
    case "ok":
    case "no":
      return decide(c, p, action === "ok" ? "active" : "rejected");
    case "pok":
    case "pno":
      return settleProposal(c, p, action === "pok");
    case "rate":
      if (p.status === "rejected") return show(c, await ptCard(c, role, p));
      c.s.partnerId = p.id;
      return { enter: "partnerRateEdit" };
    case "sch":
      return show(c, {
        text: `🤝 ${p.name}\n\n${T.askSchedule}`,
        rows: [...SCHEDULES.map((s) => [{ text: `${s === p.schedule ? "✓ " : ""}${T.schedule[s]}`, data: `pa:sset:${p.id}:${s}` }]), [{ text: S.back, data: `pa:v:${p.id}` }]],
      });
    case "sset":
      if (isSchedule(x) && p.status !== "rejected") await c.deps.repo.updatePartner(p.id, { schedule: x });
      return show(c, await ptCard(c, role, (await c.deps.repo.getPartner(p.id)) ?? p));
    case "pay": {
      const amount = Number(x);
      if (!Number.isInteger(amount) || amount <= 0) return;
      return show(c, {
        text: T.payConfirm(p.name, price(amount), p.kaspi ? fmtPhone(p.kaspi) : T.none),
        rows: [[{ text: T.btn.payYes, data: `pa:paid:${p.id}:${amount}` }], [{ text: S.back, data: `pa:v:${p.id}` }]],
      });
    }
    case "paid": {
      const amount = Number(x);
      // Сумма в кнопке: двойное нажатие или устаревшая кнопка не проведут выплату второй раз
      const done = Number.isInteger(amount) && amount > 0 && (await c.deps.repo.recordPartnerPayout(p.id, amount, c.user.id));
      return show(c, { text: done ? T.paidDone(p.name, price(amount)) : T.payStale, rows: [[{ text: S.back, data: `pa:v:${p.id}` }]] });
    }
    case "prop":
      if (p.status === "rejected") return show(c, await ptCard(c, role, p));
      c.s.partnerId = p.id;
      return { enter: "partnerPropose" };
  }
  return void (await toast(c, c.tx.oldButton));
}

// ── Подтверждение владельцем ──

/** Кому сообщать о партнёре: менеджеру, который привёл (если он ещё менеджер), иначе владельцам */
async function bringerIds(deps: Deps, p: Partner) {
  if (p.managedBy !== null && (await deps.repo.getManager(p.managedBy))) return [p.managedBy];
  return deps.repo.listAdminIds();
}

/** Карточка решения для владельца: новый партнёр менеджера или предложение ставки */
async function ownerCard(deps: Deps, p: Partner): Promise<Screen> {
  const manager = (await managerLabel(deps, p.managedBy)) || "—";
  if (p.status === "active" && p.proposedRate !== null && p.proposedSchedule) {
    return {
      text: T.proposal(manager, p.name, `${price(p.rate)} → ${price(p.proposedRate)}`, `${T.scheduleLower[p.schedule]} → ${T.scheduleLower[p.proposedSchedule]}`),
      rows: [[{ text: T.btn.approve, data: `pa:pok:${p.id}` }, { text: T.btn.reject, data: `pa:pno:${p.id}` }]],
    };
  }
  return {
    text: T.newFrom(manager, p.name, p.phone ? fmtPhone(p.phone) : T.none, termsOf(p.rate, p.schedule)),
    rows: [[{ text: T.btn.approve, data: `pa:ok:${p.id}` }], [{ text: T.btn.editRate, data: `pa:rate:${p.id}` }], [{ text: T.btn.reject, data: `pa:no:${p.id}` }]],
  };
}

/**
 * Сообщить владельцам о новом партнёре менеджера или предложении (если ещё не сообщали).
 * Ночью не пишем: метка остаётся пустой, cron пришлёт после 08:00.
 */
export async function notifyOwners(deps: Deps, p: Partner) {
  const needs = p.status === "pending" || (p.status === "active" && p.proposedRate !== null);
  if (!needs || p.ownerNotifiedAt || isQuiet(deps.now())) return false;
  // Метка до отправки: два запуска cron не пришлют карточку дважды
  await deps.repo.updatePartner(p.id, { ownerNotifiedAt: deps.now() });
  const card = await ownerCard(deps, p);
  for (const id of await deps.repo.listAdminIds()) {
    await deps.tg.sendMessage(id, card.text, { markup: inline(card.rows) }).catch((e) => console.error("partner owner card", e instanceof Error ? e.name : "Error"));
  }
  return true;
}

/** Сообщить тому, кто привёл; ночью — молча (статус виден в «🤝 Мои партнёры») */
async function tellBringer(deps: Deps, p: Partner, text: string) {
  if (isQuiet(deps.now())) return;
  for (const id of await bringerIds(deps, p)) await deps.tg.sendMessage(id, text).catch(() => undefined);
}

async function decide(c: Ctx, p: Partner, status: "active" | "rejected") {
  if (!(await c.deps.repo.decidePartner(p.id, status))) {
    await toast(c, T.already);
    return show(c, await ptCard(c, "owner", (await c.deps.repo.getPartner(p.id)) ?? p));
  }
  await toast(c, T.decided[status]);
  const fresh = (await c.deps.repo.getPartner(p.id)) ?? p;
  if (p.managedBy !== null) await tellBringer(c.deps, fresh, status === "active" ? T.toManagerApproved(p.name, termsOf(fresh.rate, fresh.schedule)) : T.toManagerRejected(p.name));
  return show(c, await ptCard(c, "owner", fresh));
}

async function settleProposal(c: Ctx, p: Partner, accept: boolean) {
  const after = await c.deps.repo.settlePartnerProposal(p.id, accept);
  if (!after) {
    await toast(c, T.already);
    return show(c, await ptCard(c, "owner", (await c.deps.repo.getPartner(p.id)) ?? p));
  }
  await toast(c, accept ? T.decided.active : T.decided.rejected);
  if (p.managedBy !== null) await tellBringer(c.deps, after, accept ? T.toManagerProposalOk(p.name, termsOf(after.rate, after.schedule)) : T.toManagerProposalNo(p.name));
  return show(c, await ptCard(c, "owner", after));
}

// ── Создание партнёра: название → телефон → ставка → график → ✅ ──

export function startNewPartner(c: Ctx): Result {
  c.s.partnerDraft = {};
  return { enter: "partnerName" };
}

/** Шаги сотрудника: «◀️ Назад» по-русски, роль проверяется на каждом ответе */
const staffBack = (c: Ctx): InlineButton[] => [ib(c, S.back, "back")];

const staffText = (step: (c: Ctx, text: string) => Promise<Result>) => async (c: Ctx): Promise<Result> => {
  if (!(await canAddPartners(c))) return { done: true };
  if (c.u.kind !== "text" || !c.u.text.trim()) return null;
  return step(c, c.u.text.trim());
};

const rateButtons = (c: Ctx) => [RATE_PRESETS.map((r) => ib(c, price(r), `r:${r}`))];
const scheduleButtons = (c: Ctx) => SCHEDULES.map((s) => [ib(c, T.schedule[s], `s:${s}`)]);

export const partnerName: Step = {
  async ask(c) {
    await send(c, T.askName, inline([staffBack(c)]));
  },
  onMessage: staffText(async (c, text) => {
    if (text.length > 80) return { hint: c.tx.tooLong(80) };
    c.s.partnerDraft = { name: text };
    return { to: "partnerPhone" };
  }),
};

export const partnerPhone: Step = {
  async ask(c) {
    await send(c, T.askPhone, inline([staffBack(c)]));
  },
  onMessage: staffText(async (c, text) => {
    const phone = normalizePhone(text);
    if (!phone) return { hint: T.badPhone };
    c.s.partnerDraft = { ...c.s.partnerDraft, phone };
    return { to: "partnerRate" };
  }),
};

export const partnerRate: Step = {
  async ask(c) {
    await send(c, T.askRate, inline([...rateButtons(c), staffBack(c)]));
  },
  async onButton(c, v) {
    if (!(await canAddPartners(c))) return { done: true };
    const rate = v.startsWith("r:") ? parseRate(v.slice(2)) : null;
    if (rate === null) return null;
    c.s.partnerDraft = { ...c.s.partnerDraft, rate };
    return { to: "partnerSchedule" };
  },
  onMessage: staffText(async (c, text) => {
    const rate = parseRate(text);
    if (rate === null) return { hint: T.badRate };
    c.s.partnerDraft = { ...c.s.partnerDraft, rate };
    return { to: "partnerSchedule" };
  }),
};

export const partnerSchedule: Step = {
  async ask(c) {
    await send(c, T.askSchedule, inline([...scheduleButtons(c), staffBack(c)]));
  },
  async onButton(c, v) {
    if (!(await canAddPartners(c))) return { done: true };
    const s = v.slice(2);
    if (!v.startsWith("s:") || !isSchedule(s)) return null;
    c.s.partnerDraft = { ...c.s.partnerDraft, schedule: s };
    return { to: "partnerConfirm" };
  },
};

export const partnerConfirm: Step = {
  async ask(c) {
    const d = c.s.partnerDraft ?? {};
    await send(c, T.confirm(d.name ?? "", d.phone ? fmtPhone(d.phone) : T.none, termsOf(d.rate ?? DEFAULT_RATE, d.schedule ?? "weekly")), inline([[ib(c, T.create, "go")], staffBack(c)]));
  },
  async onButton(c, v) {
    const role = await roleOf(c);
    if (role !== "owner" && role !== "manager") return { done: true };
    if (v !== "go") return null;
    const d = c.s.partnerDraft;
    if (!d?.name || !d.phone || d.rate === undefined || !d.schedule) return { enter: "partnerName" };
    const partner = await c.deps.repo.createPartner({
      code: newPartnerCode(),
      name: d.name,
      telegramId: null,
      username: null,
      rate: d.rate,
      phone: d.phone,
      schedule: d.schedule,
      // Партнёр менеджера ждёт ✅ владельца; партнёр владельца подтверждён сразу
      status: role === "manager" ? "pending" : "active",
      managedBy: role === "manager" ? c.user.id : null,
      ownerNotifiedAt: role === "owner" ? c.deps.now() : null,
    });
    const { link, wa } = await joinLink(c, partner);
    await send(c, `${T.created(partner.name, link)}${partner.status === "pending" ? `\n\n${T.createdPending}` : ""}`, inline([...wa, [{ text: S.btn.panel, data: "pn:home" }]]));
    await sendPack(c, partner);
    await notifyOwners(c.deps, partner);
    return { done: true };
  },
};

/** Владелец меняет ставку (с карточки партнёра или из карточки решения). Действует для новых заказов */
export const partnerRateEdit: Step = {
  async ask(c) {
    await send(c, T.askRate, inline([...rateButtons(c), staffBack(c)]));
  },
  async onButton(c, v) {
    return v.startsWith("r:") ? saveRate(c, v.slice(2)) : null;
  },
  onMessage: staffText(saveRate),
};

async function saveRate(c: Ctx, raw: string): Promise<Result> {
  if (!(await isOwner(c))) return { done: true };
  const rate = parseRate(raw);
  if (rate === null) return { hint: T.badRate };
  const p = c.s.partnerId ? await c.deps.repo.getPartner(c.s.partnerId) : null;
  if (!p || p.status === "rejected") return { done: true };
  await c.deps.repo.setPartnerRate(p.id, rate);
  const after = { ...p, rate };
  // Партнёр ещё ждёт решения — та же карточка с ✅ / ❌, уже с новой ставкой
  if (p.status === "pending") {
    const card = await ownerCard(c.deps, after);
    await send(c, card.text, inline(card.rows));
  } else await send(c, T.rateSaved(termsOf(rate, p.schedule)), inline([[{ text: S.back, data: `pa:v:${p.id}` }]]));
  return { done: true };
}

/** Менеджер предлагает ставку и график своему партнёру: применятся после ✅ владельца */
export const partnerPropose: Step = {
  async ask(c) {
    await send(c, T.proposeAsk, inline([...rateButtons(c), staffBack(c)]));
  },
  async onButton(c, v) {
    return v.startsWith("r:") ? proposeRate(c, v.slice(2)) : null;
  },
  onMessage: staffText(proposeRate),
};

async function proposeRate(c: Ctx, raw: string): Promise<Result> {
  if ((await roleOf(c)) !== "manager") return { done: true };
  const rate = parseRate(raw);
  if (rate === null) return { hint: T.badRate };
  c.s.partnerDraft = { rate };
  return { to: "partnerProposeSchedule" };
}

export const partnerProposeSchedule: Step = {
  async ask(c) {
    await send(c, T.askSchedule, inline([...scheduleButtons(c), staffBack(c)]));
  },
  async onButton(c, v) {
    if ((await roleOf(c)) !== "manager") return { done: true };
    const s = v.slice(2);
    const rate = c.s.partnerDraft?.rate;
    if (!v.startsWith("s:") || !isSchedule(s) || rate === undefined) return null;
    const p = c.s.partnerId ? await c.deps.repo.getPartner(c.s.partnerId) : null;
    if (!p || p.managedBy !== c.user.id || p.status === "rejected") return { done: true };
    await c.deps.repo.proposePartnerTerms(p.id, rate, s);
    // Партнёр ещё не подтверждён: предложение и есть его условия — владелец решит одной карточкой
    if (p.status === "pending") await c.deps.repo.settlePartnerProposal(p.id, true);
    await send(c, T.proposeSent, inline([[{ text: S.back, data: `pa:v:${p.id}` }]]));
    const fresh = await c.deps.repo.getPartner(p.id);
    if (fresh && fresh.status === "active") await notifyOwners(c.deps, fresh);
    return { done: true };
  },
};

// ── Партнёр по ссылке join_: язык → номер → Kaspi → меню ──

/**
 * start=join_<токен>. "home" — показать меню роли (сотрудник, уже партнёр), "failed" — ссылка не сработала,
 * иначе — начать знакомство партнёра.
 */
export async function acceptPartnerInvite(c: Ctx, token: string): Promise<Result | "home" | "failed"> {
  if (c.chatId !== c.user.id) return "failed";
  const role = await roleOf(c);
  if (role === "owner" || role === "manager") {
    await send(c, T.joinStaff);
    return "home";
  }
  // Уже партнёр: чужую ссылку не тратим
  if (role === "partner") return "home";
  const tx = c.tx.role;
  const use = await c.deps.repo.useInvite(hashToken(token), "partner", c.user.id, c.deps.now());
  if (use.status !== "ok" || use.partnerId === null) {
    await send(c, use.status === "used" ? tx.joinUsed : use.status === "expired" ? tx.joinExpired : tx.joinNone);
    return "failed";
  }
  const p = await c.deps.repo.bindPartner(use.partnerId, c.user.id, c.user.username);
  if (!p) {
    await send(c, tx.joinTaken);
    return "failed";
  }
  c.s = { q: c.s.q, partnerId: p.id };
  return { enter: "joinLang" };
}

/** Шаги знакомства — только для того, кто привязан к этому партнёру */
async function myPartner(c: Ctx) {
  const p = c.s.partnerId ? await c.deps.repo.getPartner(c.s.partnerId) : null;
  return p && p.telegramId === c.user.id && p.status !== "rejected" ? p : null;
}

export const joinLang: Step = {
  async ask(c) {
    const tx = texts.uz;
    await send(c, tx.role.joinHello, inline([[ib(c, tx.langUz, "uz"), ib(c, tx.langRu, "ru")]]));
  },
  async onButton(c, v) {
    if (v !== "uz" && v !== "ru") return null;
    if (!(await myPartner(c))) return { done: true };
    await c.deps.repo.setLang(c.user.id, v);
    c.user.lang = v;
    c.lang = v;
    c.tx = texts[v];
    return { to: "joinPhone" };
  },
};

export const joinPhone: Step = {
  replyKeyboard: true,
  async ask(c) {
    await send(c, c.tx.role.askPhone, { reply: [[{ text: c.tx.role.phoneButton, contact: true }]] });
  },
  async onMessage(c) {
    const p = await myPartner(c);
    if (!p) return { done: true };
    // Кнопка «📱 Рақамни юбориш» — свой номер; чужую карточку контакта не принимаем. Номер текстом — тоже можно
    const phone = c.u.kind === "contact" && c.u.own ? normalizePhone(c.u.phone) : c.u.kind === "text" ? normalizePhone(c.u.text) : null;
    if (!phone) return { hint: c.tx.role.badPhone };
    await c.deps.repo.updatePartner(p.id, { phone });
    return { to: "joinKaspi" };
  },
};

export const joinKaspi: Step = {
  replyKeyboard: true,
  async ask(c) {
    const p = await myPartner(c);
    await send(c, c.tx.role.askKaspi, p?.phone ? { reply: [[{ text: fmtPhone(p.phone) }]], oneTime: true } : { removeReply: true });
  },
  async onMessage(c) {
    const p = await myPartner(c);
    if (!p) return { done: true };
    const kaspi = c.u.kind === "text" ? normalizeKaspi(c.u.text) : c.u.kind === "contact" ? normalizePhone(c.u.phone) : null;
    if (!kaspi) return { hint: c.tx.role.badKaspi };
    await c.deps.repo.updatePartner(p.id, { kaspi });
    // Убрать нижнюю клавиатуру и сразу показать меню партнёра
    await send(c, c.tx.role.joined, { removeReply: true });
    await roleHome(c, true);
    await tellBringer(c.deps, p, T.joined(p.name, tgOf({ telegramId: c.user.id, username: c.user.username })));
    return { done: true };
  },
};

// ── «Спящие»: 14 дней без сканов ──

/** Одно сообщение тому, кто привёл, на каждый «сон»: после нового скана и нового сна напомним снова */
export async function notifySleeping(deps: Deps) {
  const now = deps.now();
  if (isQuiet(now)) return 0;
  let sent = 0;
  for (const r of partnerRows(await panelData(deps), "all", now)) {
    const p = r.partner;
    if (p.status === "rejected") continue;
    const last = r.lastScanAt && r.lastScanAt > p.createdAt ? r.lastScanAt : p.createdAt;
    if (+now - +last < SLEEP_AFTER_MS || (p.sleepNotifiedAt && p.sleepNotifiedAt >= last)) continue;
    // Метка до отправки: повтор cron не пришлёт второе сообщение
    await deps.repo.updatePartner(p.id, { sleepNotifiedAt: now });
    for (const id of await bringerIds(deps, p)) {
      await deps.tg.sendMessage(id, T.sleeping(p.name), { markup: inline([[{ text: `🤝 ${p.name.slice(0, 40)}`, data: `pa:v:${p.id}` }]]) }).catch(() => undefined);
    }
    sent++;
  }
  return sent;
}

/** Карточки, отложенные на ночь: после 08:00 */
export async function flushOwnerNotices(deps: Deps) {
  if (isQuiet(deps.now())) return 0;
  let sent = 0;
  for (const p of (await deps.repo.panelSnapshot()).partners) if (await notifyOwners(deps, p)) sent++;
  return sent;
}

// ── Начисление ──

/** Кому писать: id из карточки или человек с таким username, который нажимал /start */
async function recipientOf(deps: Deps, p: Partner) {
  if (p.telegramId) return deps.repo.getUser(p.telegramId);
  return p.username ? deps.repo.findUserByUsername(p.username) : null;
}

/**
 * Начислить партнёру за оплаченный заказ (один раз) и сообщить ему.
 * Ставка берётся на момент оплаты: смена ставки не меняет прошлые начисления.
 * Неподтверждённому партнёру начисление записывается (к выплате — после ✅), но без сообщения; ставка 0 — тоже без сообщения.
 */
export async function creditPartner(deps: Deps, order: Pick<OrderRecord, "id" | "userId">) {
  // Заказ владельца или админа: ни начисления, ни сообщения партнёру
  if ((await deps.repo.staffIds()).includes(order.userId)) return;
  // Заказ, собранный сотрудником для клиента: продажа менеджера или владельца, не партнёра
  if (await deps.repo.clientOrderRef(order.id)) return;
  const client = await deps.repo.getUser(order.userId);
  const code = parsePartnerSource(client?.source ?? null);
  if (!code) return;
  const credit = await deps.repo.creditPartnerOrder(order.id, order.userId, code);
  if (!credit) return;
  if (credit.partner.status !== "active" || credit.amount === 0) {
    await deps.repo.markEarningDelivered(order.id);
    return;
  }
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

// ── Партнёр: /hamkor и экраны меню ──

export async function partnerRowOf(deps: Deps, p: Partner) {
  return partnerRows(await panelData(deps), "all", deps.now()).find((r) => r.partner.id === p.id) ?? null;
}

/** «💰 Тўловларим»: начислено, выплачено, к выплате, день выплаты */
export function payoutsText(c: Ctx, p: Partner, r: PartnerRow) {
  const t = c.tx.role;
  if (p.rate === 0 && r.earned === 0) return `${t.payouts}\n\n${t.countOnly}`;
  return [
    t.payoutsText({ earned: price(r.earned), paidOut: price(r.paidOut), due: price(r.due) }),
    ...(r.onHold > 0 ? [t.onHold(price(r.onHold))] : []),
    t.payDay(t.schedule[p.schedule]),
  ].join("\n");
}

/** true — партнёр увидел свои цифры */
export async function partnerStats(c: Ctx): Promise<boolean> {
  if (c.chatId !== c.user.id) return false;
  const partner = await c.deps.repo.findPartnerForUser(c.user.id, c.user.username);
  if (!partner) return false;
  const row = await partnerRowOf(c.deps, partner);
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
