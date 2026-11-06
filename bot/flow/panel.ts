/**
 * Панели ролей (v2): владелец и менеджер — по-русски, партнёр — на своём языке.
 * Каждый экран — одно живое сообщение: кнопка меняет его текст, внизу «◀️ Назад».
 * Кнопки: pn:<экран>[:<id>]; «📤 Отправить клиенту» — cl:<номер заказа>.
 * Права проверяются при каждом нажатии: чужая или старая кнопка ничего не открывает.
 */
import type { InlineButton } from "../tg";
import type { OrderRecord } from "@/lib/domain";
import { overview, partnerRows, type Partner, type PartnerRow } from "@/lib/owner-panel";
import { isQuiet } from "@/lib/quiet-hours";
import {
  hashToken,
  INVITE_TTL_MS,
  managerName,
  managerSource,
  newToken,
} from "@/lib/roles";
import { staff as S } from "@/texts/bot-ru";
import { texts } from "./util";
import { editOrSend, inline, namesOf, ownerUrl, PAYABLE_STATUSES, pageUrl, price, roleOf, send } from "./util";
import { orderButtons, sendReceiptTo } from "./orders";
import { panelData, partnerRowOf, payoutsText, ptList, sendPack, startNewPartner } from "./partners";
import { managerEarningsScreen, partnerStatsScreen, statsScreen } from "./stats";
import { exportScreen } from "./export";
import type { Ctx, Result } from "./types";

type Screen = { text: string; rows: InlineButton[][] };

const back = (data = "pn:home"): InlineButton[] => [{ text: S.back, data }];

async function show(c: Ctx, screen: Screen, fresh = false) {
  const markup = inline(screen.rows);
  if (c.u.kind === "callback" && !fresh) await editOrSend(c, screen.text, markup);
  else await send(c, screen.text, markup);
}

async function toast(c: Ctx, text: string) {
  if (c.u.kind !== "callback") return;
  await c.deps.tg.answerCallbackQuery(c.u.callbackId, { text });
  c.answered = true;
}

/** «13:40» по Алматы */
const clock = (d: Date) => new Date(+d + 5 * 3_600_000).toISOString().slice(11, 16);

const createButton = (c: Ctx, text: string): InlineButton =>
  c.deps.env.miniAppUrl ? { text, webApp: c.deps.env.miniAppUrl } : { text, data: "pn:mk" };



// ── Домашние экраны ──

async function ownerHome(c: Ctx): Promise<Screen> {
  const s = await panelData(c.deps);
  const now = c.deps.now();
  const today = overview(s, "today", now);
  const receipts = (await c.deps.repo.listOrdersByStatus(["receipt_sent"])).length;
  const payouts = partnerRows(s, "all", now).filter((r) => r.due > 0).length;
  return {
    text: `${S.ownerTitle}\n\n${S.today(today.paid, price(today.revenue))}`,
    rows: [
      [{ text: S.btn.stats, data: "pn:stats" }, { text: S.btn.receipts(receipts), data: "pn:rc" }],
      [{ text: S.btn.partners, data: "pn:pt" }, { text: S.btn.payouts(payouts), data: "pn:po" }],
      [{ text: S.btn.client, data: "pn:cl" }],
      [{ text: S.btn.export, data: "pn:ex" }, { text: S.btn.settings, data: "pn:set" }],
      ...(c.deps.env.miniAppUrl ? [[{ text: S.btn.ownerApp, webApp: ownerAppUrl(c.deps.env.miniAppUrl) }]] : []),
      [createButton(c, S.btn.create)],
    ],
  };
}

/** /app → /app/owner (панель владельца в приложении; доступ проверяет сервер по initData) */
export function ownerAppUrl(miniAppUrl: string, page: "owner" | "panel" = "owner") {
  const u = new URL(miniAppUrl);
  u.pathname = `${u.pathname.replace(/\/$/, "")}/${page}`;
  u.search = "";
  return u.toString();
}

async function managerHome(c: Ctx): Promise<Screen> {
  const s = await panelData(c.deps);
  const mine = s.partners.filter((p) => p.managedBy === c.user.id).length;
  return {
    text: `${S.managerTitle}\n\n${S.networkLine(mine)}`,
    rows: [
      [{ text: S.btn.myStats, data: "pn:ms" }, { text: S.btn.myPartners, data: "pn:mp" }],
      [{ text: S.btn.newPartner, data: "pn:mpn" }, { text: S.btn.earnings, data: "pn:me" }],
      [{ text: S.btn.client, data: "pn:cl" }],
      ...(c.deps.env.miniAppUrl ? [[{ text: S.btn.ownerApp, webApp: ownerAppUrl(c.deps.env.miniAppUrl, "panel") }]] : []),
      [createButton(c, S.btn.create)],
    ],
  };
}

function partnerHome(c: Ctx, p: Partner): Screen {
  const r = c.tx.role;
  return {
    text: r.partnerHome(p.name, p.status === "pending"),
    rows: [
      [{ text: r.stats, data: "pn:ps" }, { text: r.qr, data: "pn:pq" }],
      [{ text: r.payouts, data: "pn:pp" }, { text: c.tx.contact, url: ownerUrl(c) }],
      ...(c.deps.env.miniAppUrl ? [[{ text: r.panel, webApp: ownerAppUrl(c.deps.env.miniAppUrl, "panel") }]] : []),
      [c.deps.env.miniAppUrl ? { text: r.self, webApp: c.deps.env.miniAppUrl } : { text: r.self, data: "pn:self" }],
    ],
  };
}

/**
 * Домашний экран роли. false — это клиент: пусть роутер покажет обычное меню.
 * fresh — новым сообщением (после выбора языка вопрос о языке остаётся в чате)
 */
export async function roleHome(c: Ctx, fresh = false): Promise<boolean> {
  const role = await roleOf(c);
  if (role === "client") return false;
  if (role === "owner") await show(c, await ownerHome(c), fresh);
  else if (role === "manager") await show(c, await managerHome(c), fresh);
  else {
    const p = await c.deps.repo.findPartnerForUser(c.user.id, c.user.username);
    if (!p) return false;
    await show(c, partnerHome(c, p), fresh);
  }
  return true;
}

// ── Экраны владельца ──

async function receipts(c: Ctx): Promise<Screen> {
  const list = await c.deps.repo.listOrdersByStatus(["receipt_sent"]);
  if (!list.length) return { text: S.receiptsNone, rows: [back()] };
  const shown = list.slice(0, 10);
  return {
    text: [S.receiptsTitle(list.length), "", ...shown.map((o) => S.receiptLine(o.number, namesOf(o.data).slice(0, 40), price(o.amount), clock(o.receiptAt ?? o.updatedAt)))].join("\n"),
    rows: [...shown.map((o) => [{ text: S.receiptBtn(o.number, price(o.amount)), data: `pn:rc:${o.number}` }]), back()],
  };
}

async function payouts(c: Ctx): Promise<Screen> {
  const s = await panelData(c.deps);
  const rows = partnerRows(s, "all", c.deps.now()).filter((r) => r.due > 0).sort((a, b) => b.due - a.due);
  if (!rows.length) return { text: S.payoutsNone, rows: [back()] };
  const managers = await c.deps.repo.listManagers();
  const who = (r: PartnerRow) => {
    const m = managers.find((x) => x.telegramId === r.partner.managedBy);
    return m ? managerName(m) : "";
  };
  return {
    text: [S.payoutsTitle, "", ...rows.map((r) => S.payoutLine(r.partner.name.slice(0, 40), price(r.due), who(r)))].join("\n"),
    rows: [...rows.slice(0, 10).map((r) => [{ text: `${r.partner.name.slice(0, 30)} · ${price(r.due)}`, data: `pa:v:${r.partner.id}` }]), back()],
  };
}

async function settings(c: Ctx): Promise<Screen> {
  const managers = (await c.deps.repo.listManagers()).filter((m) => m.active);
  const s = await panelData(c.deps);
  const count = (id: number) => s.partners.filter((p) => p.managedBy === id).length;
  const list = managers.length ? [S.managersTitle, ...managers.map((m) => S.managerLine(managerName(m), count(m.telegramId)))] : [S.managersNone];
  return {
    text: [S.settingsTitle, "", ...list].join("\n"),
    rows: [
      ...managers.slice(0, 10).map((m) => [{ text: S.btn.removeManager(managerName(m)).slice(0, 60), data: `pn:mrm:${m.telegramId}` }]),
      [{ text: S.btn.addManager, data: "pn:madd" }],
      back(),
    ],
  };
}

async function newManagerLink(c: Ctx): Promise<Screen> {
  const token = newToken();
  await c.deps.repo.createInvite({ tokenHash: hashToken(token), kind: "manager", createdBy: c.user.id, expiresAt: new Date(+c.deps.now() + INVITE_TTL_MS.manager) });
  const link = `https://t.me/${await c.deps.tg.botUsername()}?start=mgr_${token}`;
  return { text: S.managerLink(link), rows: [back("pn:set")] };
}

// ── Заказ для клиента ──

function clientHow(c: Ctx): Screen {
  const rows: InlineButton[][] = [];
  if (c.deps.env.miniAppUrl) rows.push([{ text: S.btn.openApp, webApp: c.deps.env.miniAppUrl }]);
  rows.push([{ text: S.btn.inChat, data: "pn:mk" }], [{ text: S.btn.myOrders, data: "m:my" }], back());
  return { text: S.clientHow, rows };
}

/** Владелец или менеджер может отдать свой неоплаченный заказ клиенту */
export async function isSeller(c: Ctx) {
  const role = await roleOf(c);
  return role === "owner" || role === "manager";
}

const waLink = (text: string) => {
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  return url.length <= 2000 ? url : null;
};

/** cl:<n> — готовое сообщение для WhatsApp: НАМУНА, предупреждение, сумма, ссылка в бота (реквизиты — там, после подтверждения) */
export async function toClient(c: Ctx, n: number): Promise<Result | void> {
  const role = await roleOf(c);
  if (role !== "owner" && role !== "manager") return void (await toast(c, c.tx.oldButton));
  const o = await c.deps.repo.getOrderByNumber(n);
  if (!o || o.userId !== c.user.id) return void (await toast(c, c.tx.oldButton));
  if (!PAYABLE_STATUSES.includes(o.status)) return void (await send(c, S.clientNotPayable));
  const manager = role === "manager" ? await c.deps.repo.getManager(c.user.id) : null;
  const token = newToken();
  await c.deps.repo.issueClientOrder({ orderId: o.id, createdBy: c.user.id, tokenHash: hashToken(token), refSource: manager ? managerSource(manager.code) : null });
  // Реквизитов здесь нет: клиент увидит их в боте только после предупреждения и «✅ Ҳаммаси тўғри»
  const share = { url: pageUrl(c, o.slug), amount: price(o.amount), bot: `https://t.me/${await c.deps.tg.botUsername()}?start=o_${token}` };
  const uz = texts.uz.role.clientShare(share);
  const ru = texts.ru.role.clientShare(share);
  const wa = [[uz, S.btn.waUz], [ru, S.btn.waRu]].flatMap(([text, label]) => {
    const url = waLink(text);
    return url ? [[{ text: label, url }]] : [];
  });
  await toast(c, S.btn.toClient);
  await send(c, uz, inline(wa));
}

/** start=o_<токен>: клиент забирает заказ, собранный для него. Он теперь его — дальше обычная оплата и чек */
export async function claimOrder(c: Ctx, token: string): Promise<"shown" | "askLang" | "done"> {
  const r = await c.deps.repo.claimClientOrder(hashToken(token), c.user.id, c.deps.now());
  const tx = c.tx.role;
  if (r.status === "creator") {
    await send(c, S.clientOwnLink);
    return "done";
  }
  if (r.status === "none" || r.status === "used" || r.status === "closed" || !r.order) {
    await send(c, r.status === "used" ? tx.claimUsed : r.status === "closed" ? tx.claimClosed : tx.claimNone);
    return c.user.lang ? "done" : "askLang";
  }
  if (!c.user.lang) {
    c.s = { q: c.s.q, claimed: r.order.number };
    return "askLang";
  }
  await showClaimed(c, r.order);
  return "shown";
}

export async function showClaimed(c: Ctx, o: OrderRecord) {
  if (!PAYABLE_STATUSES.includes(o.status) || o.userId !== c.user.id) return void (await send(c, c.tx.role.claimClosed));
  await send(c, c.tx.role.claimed(pageUrl(c, o.slug), price(o.amount)), inline(orderButtons(c, o, false)));
}

// ── Назначение менеджера ──

/** start=mgr_<токен>. true — человек теперь менеджер (роутер покажет его панель) */
export async function acceptManager(c: Ctx, token: string): Promise<boolean> {
  if (c.chatId !== c.user.id) return false;
  if (await c.deps.repo.isAdmin(c.user.id)) {
    await send(c, S.ownerIsOwner);
    return false;
  }
  // Уже менеджер: чужую ссылку не тратим
  if (await c.deps.repo.getManager(c.user.id)) return true;
  const use = await c.deps.repo.useInvite(hashToken(token), "manager", c.user.id, c.deps.now());
  if (use.status !== "ok") {
    await send(c, use.status === "used" ? S.inviteUsed : use.status === "expired" ? S.inviteExpired : S.inviteNone);
    return false;
  }
  const m = await c.deps.repo.addManager({ telegramId: c.user.id, code: newToken(10), username: c.user.username, firstName: c.user.firstName, invitedBy: use.createdBy });
  if (!c.user.lang) {
    await c.deps.repo.setLang(c.user.id, "ru");
    c.user.lang = "ru";
    c.lang = "ru";
    c.tx = texts.ru;
  }
  await send(c, S.managerWelcome);
  // Владельцу — коротко, но не ночью: в тихие часы он увидит менеджера в «⚙️ Настройки»
  if (!isQuiet(c.deps.now())) await c.deps.tg.sendMessage(use.createdBy, S.managerJoined(managerName(m))).catch(() => undefined);
  return true;
}

// ── Кнопки pn: ──

const OWNER = new Set(["stats", "rc", "pt", "po", "ex", "set", "madd", "mrm"]);
const MANAGER = new Set(["ms", "mp", "mpn", "me", "mq"]);
const SELLER = new Set(["cl", "mk"]);
const PARTNER = new Set(["ps", "pq", "pp", "self"]);

/**
 * Вернёт { kind: "dashboard" } для статистики и партнёров владельца (их рисует панель-отчёт),
 * Result — если нужно войти в шаг диалога, иначе ничего.
 */
/** Статистика партнёра (месяц); null — человек больше не партнёр */
async function partnerScreen(c: Ctx) {
  const p = await c.deps.repo.findPartnerForUser(c.user.id, c.user.username);
  return p ? partnerStatsScreen(c, p) : null;
}

export async function panelAction(c: Ctx, action: string, arg: string): Promise<Result | void> {
  const role = await roleOf(c);
  if (action === "home") {
    if (!(await roleHome(c))) await toast(c, c.tx.oldButton);
    return;
  }
  const allowed =
    (OWNER.has(action) && role === "owner") ||
    (MANAGER.has(action) && role === "manager") ||
    (SELLER.has(action) && (role === "owner" || role === "manager")) ||
    (PARTNER.has(action) && role === "partner");
  if (!allowed) return void (await toast(c, c.tx.oldButton));

  switch (action) {
    case "stats":
      return show(c, await statsScreen(c, "owner"));
    case "pt":
      return show(c, await ptList(c, "owner"));
    case "rc": {
      if (!arg) return show(c, await receipts(c));
      const o = await c.deps.repo.getOrderByNumber(Number(arg));
      if (!o || o.status !== "receipt_sent") return show(c, await receipts(c));
      await sendReceiptTo(c.deps, c.user.id, o);
      return;
    }
    case "po":
      return show(c, await payouts(c));
    case "ex":
      return show(c, await exportScreen(c, ""));
    case "set":
      return show(c, await settings(c));
    case "madd":
      return show(c, await newManagerLink(c));
    case "mrm": {
      const id = Number(arg);
      if (Number.isSafeInteger(id) && (await c.deps.repo.removeManager(id, c.deps.now()))) await toast(c, S.managerRemoved);
      return show(c, await settings(c));
    }
    case "cl":
      return show(c, clientHow(c));
    case "mk":
    case "self":
      return { enter: "cat" };
    case "ms":
      return show(c, await statsScreen(c, "manager"));
    case "mp":
      return show(c, await ptList(c, "manager"));
    case "me":
      return show(c, await managerEarningsScreen(c));
    case "mpn":
      return startNewPartner(c);
    case "mq": {
      const p = await c.deps.repo.getPartner(Number(arg));
      if (!p || p.managedBy !== c.user.id) return void (await toast(c, c.tx.oldButton));
      await sendPack(c, p);
      return;
    }
    case "ps":
      return show(c, (await partnerScreen(c)) ?? { text: c.tx.oldButton, rows: [] });
    case "pp":
    case "pq": {
      const p = await c.deps.repo.findPartnerForUser(c.user.id, c.user.username);
      if (!p) return void (await toast(c, c.tx.oldButton));
      if (action === "pq") return void (await sendPack(c, p));
      const r = await partnerRowOf(c.deps, p);
      if (!r) return void (await toast(c, c.tx.oldButton));
      return show(c, { text: payoutsText(c, p, r), rows: [[{ text: c.tx.back, data: "pn:home" }]] });
    }
  }
}
