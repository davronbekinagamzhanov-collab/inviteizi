/**
 * v2, часть 7: уведомления, отчёты 20:00, выплаты.
 *
 * Всё, что бот пишет сам, идёт через очередь bot_notices с ключом: один ключ — одно сообщение
 * (повтор cron, два админа, двойное нажатие не дают дублей). В тихие часы (22:00–08:00 Алматы)
 * сообщение ждёт 08:00 — его отправит cron.
 *
 *  - оплата: владельцу «💳 №134 · 8 000 ₸ · Гул доира · Салон Малика (@менеджер)», менеджеру — только его сеть;
 *  - 20:00: владелец (всегда, пусто — «сегодня тихо»), менеджер и партнёр — только если были оплаты;
 *  - 10:00 в день выплаты: владельцу список с [✅ Оплатил], партнёру «Бугун … ўтказади»; 1-го — менеджеру за месяц.
 * Логины и имена клиентов партнёрам и менеджеру не показываем: номер, первая буква, сумма.
 * Заказы владельца, админов и менеджеров (тестовые) не считаются: снимок panelData уже без них.
 */
import type { OrderRecord } from "@/lib/domain";
import { isPaid } from "@/lib/analytics";
import { partnerRows, partnerSource, type PanelSnapshot, type Partner } from "@/lib/owner-panel";
import { isQuiet, kzHour } from "@/lib/quiet-hours";
import { managerName, MANAGER_BONUS, MANAGER_GOAL, MANAGER_PER_ORDER, type Manager } from "@/lib/roles";
import {
  attributionOf,
  isPayDay,
  kzDay,
  kzMidnight,
  kzMonth,
  managerEarning,
  managerMonth,
  managerPaid,
  maskName,
  monthStart,
  nextPayDay,
  prevMonth,
  ruDate,
  ruMonth,
  ruPayments,
  unpaidCount,
} from "@/lib/money";
import { getDesign } from "@/templates/registry";
import { staff } from "@/texts/bot-ru";
import type { InlineButton } from "../tg";
import { fmtPhone, panelData } from "./partners";
import { designName, editOrSend, inline, ownerUrl, price, texts, txFor } from "./util";
import type { Ctx, Deps } from "./types";

const N = staff.n;
const HOUR = 3_600_000;
export const EVENING_HOUR = 20;
export const PAYDAY_HOUR = 10;

/** Ближайшие 08:00 по Алматы (для отложенных ночью) */
export function morningAfter(now: Date) {
  const mid = kzMidnight(now);
  const eight = new Date(+mid + 8 * HOUR);
  return +eight > +now ? eight : new Date(+eight + 24 * HOUR);
}

type Markup = { inline: InlineButton[][] } | null;

/**
 * Отправить один раз по ключу. Днём — сразу, ночью — в очередь до 08:00.
 * urgent — ответ на действие самого человека (тихие часы не мешают).
 */
export async function notify(deps: Deps, key: string, chatId: number, text: string, markup: Markup = null, urgent = false) {
  const now = deps.now();
  const night = !urgent && isQuiet(now);
  if (!(await deps.repo.queueNotice({ key, chatId, text, markup, dueAt: night ? morningAfter(now) : now }))) return false;
  if (night || !(await deps.repo.claimNotice(key, now))) return false;
  try {
    await deps.tg.sendMessage(chatId, text, markup ? { markup } : undefined);
    return true;
  } catch (e) {
    console.error("notify", e instanceof Error ? e.name : "Error");
    return false;
  }
}

/** cron: отложенные на ночь — после 08:00 */
export async function flushNotices(deps: Deps) {
  const now = deps.now();
  if (isQuiet(now)) return 0;
  let sent = 0;
  for (const n of await deps.repo.claimDueNotices(now, 50)) {
    try {
      await deps.tg.sendMessage(n.chatId, n.text, n.markup ? { markup: n.markup } : undefined);
      sent++;
    } catch (e) {
      console.error("notice flush", e instanceof Error ? e.name : "Error");
    }
  }
  return sent;
}

// ── Оплата ──

const designLabel = (templateId: string) => designName(templateId);
const partnerWho = (p: Partner, m: Manager | null) => `${p.name.slice(0, 40)}${m ? ` (${managerName(m)})` : ""}`;

/**
 * Сразу после подтверждения оплаты: другим админам и менеджеру сети.
 * Возвращает строку «💳 …» для того, кто подтвердил (добавляется к его ответу — без лишнего сообщения).
 * Заказ сотрудника — пусто: тестовые не считаются.
 */
export async function paidNotices(deps: Deps, o: OrderRecord, approverId: number): Promise<string> {
  const s = await panelData(deps);
  if (!s.orders.some((x) => x.id === o.id)) return "";
  const managers = await deps.repo.listManagers();
  const a = attributionOf(s, managers, o);
  const who = a.partner ? partnerWho(a.partner, a.manager) : a.manager ? `${managerName(a.manager)} · ${N.forClient}` : N.direct;
  const line = N.paid(o.number, price(o.amount), designLabel(o.templateId), who);
  for (const id of await deps.repo.listAdminIds()) {
    if (id !== approverId) await notify(deps, `paid:${o.id}:${id}`, id, line);
  }
  if (a.manager?.active) {
    const from = a.partner ? a.partner.name.slice(0, 40) : N.forClient[0].toUpperCase() + N.forClient.slice(1);
    await notify(deps, `paid:${o.id}:${a.manager.telegramId}`, a.manager.telegramId, N.mgrPaid(from, o.number, price(o.amount), price(MANAGER_PER_ORDER)));
  }
  return line;
}

// ── Вечер 20:00 ──

const createdToday = (s: PanelSnapshot, from: Date, to: Date) => s.orders.filter((o) => +o.createdAt >= +from && +o.createdAt < +to);
const paidToday = (s: PanelSnapshot, from: Date, to: Date) =>
  s.orders.filter((o) => isPaid(o) && +(o.paidAt ?? o.updatedAt) >= +from && +(o.paidAt ?? o.updatedAt) < +to);

const listOf = (items: string[], max: number) => (items.length > max ? [...items.slice(0, max), N.more(items.length - max)] : items).join(" · ");

export function ownerEvening(s: PanelSnapshot, managers: Manager[], now: Date) {
  const from = kzMidnight(now);
  const to = new Date(+from + 24 * HOUR);
  const date = ruDate(now);
  const sources = new Set(s.partners.map((p) => partnerSource(p.code)));
  const newUsers = s.users.filter((u) => +u.createdAt >= +from && +u.createdAt < +to);
  const scans = newUsers.filter((u) => u.source && sources.has(u.source)).length;
  const created = createdToday(s, from, to);
  const paid = paidToday(s, from, to);
  const stuck = created.filter((o) => !isPaid(o));
  const lines: string[] = [];
  if (newUsers.length) lines.push(N.scans(scans, newUsers.length));
  if (created.length) lines.push(N.samples(created.length));
  if (paid.length) lines.push(N.payments(paid.length, price(paid.reduce((n, o) => n + o.amount, 0))));
  if (stuck.length) {
    const steps = Object.keys(N.steps)
      .map((st) => [st, stuck.filter((o) => o.status === st).length] as const)
      .filter(([, n]) => n > 0)
      .map(([st, n]) => `${N.steps[st]} ${n}`);
    lines.push(N.stuck(stuck.length, steps.join(" · ")));
  }
  const counts = new Map<string, number>();
  for (const o of created) counts.set(o.templateId, (counts.get(o.templateId) ?? 0) + 1);
  const top = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || (getDesign(a[0])?.number ?? 0) - (getDesign(b[0])?.number ?? 0))
    .slice(0, 3)
    .map(([id, n]) => `№${getDesign(id)?.number ?? "?"} ${designLabel(id)} ${n}`);
  if (top.length) lines.push(N.top(top.join(" · ")));
  const dues = partnerRows(s, "all", now)
    .filter((r) => r.due > 0)
    .sort((a, b) => b.due - a.due)
    .map((r) => `${partnerWho(r.partner, managers.find((m) => m.telegramId === r.partner.managedBy) ?? null)} ${price(r.due)}`);
  const quiet = !lines.length;
  if (dues.length) lines.push(N.due(listOf(dues, 5)));
  if (quiet) return [N.quiet(date), ...(dues.length ? ["", ...lines] : [])].join("\n");
  return [N.evTitle(date), "", ...lines].join("\n");
}

/** Отчёт менеджера; null — сегодня оплат в сети нет (не шлём) */
export function managerEvening(s: PanelSnapshot, managers: Manager[], m: Manager, now: Date): string | null {
  const from = kzMidnight(now);
  const to = new Date(+from + 24 * HOUR);
  const paid = managerPaid(s, managers, m.telegramId, from, to);
  if (!paid.length) return null;
  const mine = s.partners.filter((p) => p.managedBy === m.telegramId && p.status !== "rejected");
  const created = createdToday(s, from, to);
  const rows = mine
    .map((p) => {
      const ids = new Set(s.users.filter((u) => u.source === partnerSource(p.code)).map((u) => u.id));
      const orders = created.filter((o) => ids.has(o.userId) && !s.clientOrders?.some((c) => c.orderId === o.id)).length;
      const pays = paid.filter((o) => attributionOf(s, managers, o).partner?.id === p.id).length;
      return { name: p.name.slice(0, 40), orders, pays };
    })
    .filter((r) => r.orders || r.pays);
  const clientPays = paid.filter((o) => !attributionOf(s, managers, o).partner).length;
  if (clientPays) rows.push({ name: N.mgrClients, orders: 0, pays: clientPays });
  const month = kzMonth(now);
  const monthOrders = managerPaid(s, managers, m.telegramId, monthStart(month), to).length;
  const ordersTotal = rows.reduce((n, r) => n + r.orders, 0);
  return [
    N.evTitle(ruDate(now)),
    N.mgrNet(ordersTotal, paid.length),
    "",
    ...rows.map((r) => N.mgrLine(r.name, r.orders, r.pays)),
    "",
    N.mgrMoney(price(paid.length * MANAGER_PER_ORDER), ruMonth(month), price(managerEarning(monthOrders))),
    monthOrders >= MANAGER_GOAL ? N.goalDone(price(MANAGER_BONUS)) : N.goal(monthOrders, MANAGER_GOAL, price(MANAGER_BONUS)),
  ].join("\n");
}

/** «душанба» / «1 декабр» / «эртага» — следующий день выплаты после сегодняшнего */
function payDayWord(tx: ReturnType<typeof txFor>, p: Partner, now: Date) {
  const t = tx.role;
  const day = nextPayDay(p.schedule, new Date(+kzMidnight(now) + 24 * HOUR));
  const date = new Date(`${day}T00:00:00Z`);
  if (p.schedule === "daily") return t.tomorrow;
  if (p.schedule === "weekly") return t.weekdays[date.getUTCDay()];
  return `${date.getUTCDate()} ${t.months[date.getUTCMonth()]}`;
}

/** Отчёт партнёра; null — сегодня оплат по его QR нет */
export function partnerEvening(s: PanelSnapshot, p: Partner, lang: "uz" | "ru", now: Date): string | null {
  const from = kzMidnight(now);
  const to = new Date(+from + 24 * HOUR);
  const today = s.earnings.filter((e) => e.partnerId === p.id && +e.createdAt >= +from && +e.createdAt < +to);
  if (!today.length) return null;
  const tx = texts[lang];
  const lines = today
    .map((e) => s.orders.find((o) => o.id === e.orderId))
    .filter((o): o is NonNullable<typeof o> => Boolean(o))
    .sort((a, b) => a.number - b.number)
    .map((o) => tx.role.evLine(o.number, maskName(o.firstName), price(o.amount)))
    .join("\n");
  const sum = today.reduce((n, e) => n + e.amount, 0);
  return tx.role.evening({ count: today.length, lines, you: sum > 0 ? price(sum) : "", pending: p.status === "pending", payDay: payDayWord(tx, p, now) });
}

async function recipientOf(deps: Deps, p: Partner) {
  if (p.telegramId) return deps.repo.getUser(p.telegramId);
  return p.username ? deps.repo.findUserByUsername(p.username) : null;
}

/** cron, 20:00–20:59: всем по одному разу за день */
export async function eveningReports(deps: Deps) {
  const now = deps.now();
  if (kzHour(now) !== EVENING_HOUR) return 0;
  const day = kzDay(now);
  const s = await panelData(deps);
  const managers = await deps.repo.listManagers();
  let sent = 0;
  const owner = ownerEvening(s, managers, now);
  for (const id of await deps.repo.listAdminIds()) if (await notify(deps, `ev:${day}:${id}`, id, owner)) sent++;
  for (const m of managers.filter((x) => x.active)) {
    const text = managerEvening(s, managers, m, now);
    if (text && (await notify(deps, `ev:${day}:${m.telegramId}`, m.telegramId, text))) sent++;
  }
  for (const p of s.partners.filter((x) => x.status !== "rejected")) {
    const user = await recipientOf(deps, p);
    if (!user) continue;
    const lang = user.lang === "ru" ? "ru" : "uz";
    const text = partnerEvening(s, p, lang, now);
    const markup = inline([[{ text: texts[lang].contact, url: ownerUrl({ deps }) }]]);
    if (text && (await notify(deps, `ev:${day}:p${p.id}`, user.id, text, markup))) sent++;
  }
  return sent;
}

// ── День выплаты 10:00 ──

const ownerFirstName = (deps: Deps) => deps.env.kaspiName.split(/\s+/)[0] || "InviteIZI";

type PayItem =
  | { kind: "partner"; partner: Partner; amount: number; count: number; done: boolean; manager: Manager | null; version: number }
  | { kind: "manager"; manager: Manager; month: string; amount: number; count: number; done: boolean };

/** Кому платить сегодня: партнёры по графику (к выплате > 0 или уже выплачено сегодня), 1-го — менеджеры за прошлый месяц */
export function payItems(s: PanelSnapshot, managers: Manager[], now: Date): PayItem[] {
  const from = kzMidnight(now);
  const items: PayItem[] = [];
  for (const r of partnerRows(s, "all", now)) {
    const p = r.partner;
    if (p.status !== "active" || !isPayDay(p.schedule, now)) continue;
    const todayPaid = s.payouts.filter((x) => x.partnerId === p.id && +x.createdAt >= +from).reduce((n, x) => n + x.amount, 0);
    const manager = managers.find((m) => m.telegramId === p.managedBy) ?? null;
    // Сколько выплат уже было: старая кнопка (вчерашняя, у второго админа) с тем же долгом не проведёт выплату
    const version = s.payouts.filter((x) => x.partnerId === p.id).length;
    if (r.due > 0) items.push({ kind: "partner", partner: p, amount: r.due, count: unpaidCount(s, p.id), done: false, manager, version });
    else if (todayPaid > 0) items.push({ kind: "partner", partner: p, amount: todayPaid, count: 0, done: true, manager, version });
  }
  if (new Date(+now + 5 * HOUR).getUTCDate() === 1) {
    const month = prevMonth(kzMonth(now));
    for (const m of managers) {
      const done = s.managerPayouts?.find((x) => x.managerId === m.telegramId && x.month === month);
      if (done) items.push({ kind: "manager", manager: m, month, amount: done.amount, count: done.orders, done: true });
      else {
        const e = managerMonth(s, managers, m.telegramId, month);
        if (e.amount > 0) items.push({ kind: "manager", manager: m, month, amount: e.amount, count: e.orders, done: false });
      }
    }
  }
  return items;
}

/** Экран владельца «💰 Выплаты сегодня»: одно сообщение, под каждым — [✅ Оплатил] */
export function payScreen(items: PayItem[], now: Date) {
  const lines = items.map((x, i) => {
    if (x.kind === "manager") {
      return x.done ? N.payMgrDone(i + 1, managerName(x.manager), price(x.amount), ruMonth(x.month)) : N.payMgr(i + 1, managerName(x.manager), price(x.amount), ruMonth(x.month), ruPayments(x.count));
    }
    const name = partnerWho(x.partner, x.manager);
    return x.done ? N.payDone(i + 1, name, price(x.amount)) : N.payLine(i + 1, name, price(x.amount), x.partner.kaspi ? fmtPhone(x.partner.kaspi) : N.noKaspi, ruPayments(x.count));
  });
  const rows: InlineButton[][] = items
    .filter((x) => !x.done)
    .map((x) =>
      x.kind === "manager"
        ? [{ text: N.payBtn(managerName(x.manager).slice(0, 24), price(x.amount)), data: `mp:${x.manager.telegramId}:${x.month.replace("-", "")}:${x.amount}` }]
        : [{ text: N.payBtn(x.partner.name.slice(0, 24), price(x.amount)), data: `po:${x.partner.id}:${x.amount}:${x.version}` }],
    );
  const all = items.length > 0 && rows.length === 0;
  return { text: [N.payTitle(ruDate(now)), "", ...lines, ...(all ? ["", N.payAll] : [])].join("\n"), rows };
}

/** cron, с 10:00 в день выплаты: владельцу список, партнёрам и менеджерам — «сегодня переведёт» */
export async function payDayNotices(deps: Deps) {
  const now = deps.now();
  const h = kzHour(now);
  if (h < PAYDAY_HOUR || isQuiet(now)) return 0;
  const day = kzDay(now);
  const s = await panelData(deps);
  const managers = await deps.repo.listManagers();
  const items = payItems(s, managers, now).filter((x) => !x.done);
  if (!items.length) return 0;
  let sent = 0;
  const screen = payScreen(items, now);
  for (const id of await deps.repo.listAdminIds()) if (await notify(deps, `pay:${day}:${id}`, id, screen.text, inline(screen.rows))) sent++;
  const owner = ownerFirstName(deps);
  for (const x of items) {
    if (x.kind === "partner") {
      const user = await recipientOf(deps, x.partner);
      if (!user) continue;
      const tx = txFor(user.lang);
      if (await notify(deps, `payday:${day}:p${x.partner.id}`, user.id, tx.role.payToday(owner, price(x.amount), x.count))) sent++;
    } else if (x.manager.active) {
      const bonus = x.count >= MANAGER_GOAL ? price(MANAGER_BONUS) : "";
      const text = N.mgrPayToday(ruMonth(x.month), ruPayments(x.count), bonus, price(x.amount), owner);
      if (await notify(deps, `payday:${x.month}:m${x.manager.telegramId}`, x.manager.telegramId, text)) sent++;
    }
  }
  return sent;
}

/** После выплаты партнёру (с карточки или из списка дня): партнёру «✅ ўтказилди» [👍 Олдим], менеджеру заметка */
export async function afterPartnerPayout(deps: Deps, p: Partner, amount: number) {
  const stamp = +deps.now();
  const user = await recipientOf(deps, p);
  if (user) {
    const tx = txFor(user.lang);
    await notify(deps, `out:${p.id}:${stamp}`, user.id, tx.role.paidOut(price(amount)), inline([[{ text: tx.role.gotIt, data: "pg" }]]));
  }
  const m = p.managedBy ? await deps.repo.getManager(p.managedBy) : null;
  if (m) await notify(deps, `out:${p.id}:${stamp}:m`, m.telegramId, N.mgrNote(p.name.slice(0, 40), price(amount)));
}

async function toast(c: Ctx, text: string) {
  if (c.u.kind !== "callback") return;
  await c.deps.tg.answerCallbackQuery(c.u.callbackId, { text });
  c.answered = true;
}

/** Обновить список выплат после ✅ (только невыплаченные ушли в ✅) */
async function refreshPayScreen(c: Ctx) {
  const now = c.deps.now();
  const items = payItems(await panelData(c.deps), await c.deps.repo.listManagers(), now);
  const screen = payScreen(items, now);
  await editOrSend(c, screen.text, inline(screen.rows));
}

/** po:<партнёр>:<сумма> — выплата партнёру из списка дня. Только владелец; сумма в кнопке — без дублей */
export async function payPartnerAction(c: Ctx, idArg: string, amountArg: string, versionArg = "") {
  if (!(await c.deps.repo.isAdmin(c.user.id))) return toast(c, c.tx.oldButton);
  const p = await c.deps.repo.getPartner(Number(idArg));
  const amount = Number(amountArg);
  const paidBefore = p ? (await c.deps.repo.panelSnapshot()).payouts.filter((x) => x.partnerId === p.id).length : -1;
  const fresh = versionArg === String(paidBefore);
  const done = Boolean(p) && fresh && Number.isInteger(amount) && amount > 0 && (await c.deps.repo.recordPartnerPayout(p!.id, amount, c.user.id));
  if (done) await afterPartnerPayout(c.deps, p!, amount);
  await toast(c, done ? N.payOk : N.payStale);
  await refreshPayScreen(c);
}

/** mp:<менеджер>:<ГГГГММ>:<сумма> — выплата менеджеру за месяц */
export async function payManagerAction(c: Ctx, idArg: string, monthArg: string, amountArg: string) {
  if (!(await c.deps.repo.isAdmin(c.user.id))) return toast(c, c.tx.oldButton);
  const id = Number(idArg);
  const month = /^(\d{4})(\d{2})$/.exec(monthArg) ? `${monthArg.slice(0, 4)}-${monthArg.slice(4)}` : "";
  const amount = Number(amountArg);
  const managers = await c.deps.repo.listManagers();
  const m = managers.find((x) => x.telegramId === id);
  const expected = m && month ? managerMonth(await panelData(c.deps), managers, id, month) : null;
  const done =
    Boolean(m && expected && expected.amount === amount && amount > 0) &&
    (await c.deps.repo.recordManagerPayout({ managerId: id, month, amount, orders: expected!.orders, createdBy: c.user.id }));
  if (done && m) await notify(c.deps, `mout:${month}:${id}`, id, N.mgrPaidOut(price(amount), ruMonth(month)));
  await toast(c, done ? N.payOk : N.payStale);
  await refreshPayScreen(c);
}

/** pg — партнёр нажал «👍 Олдим»: убрать кнопку */
export async function gotPayout(c: Ctx) {
  await c.deps.tg.editMessageReplyMarkup(c.chatId, c.u.messageId, null).catch(() => undefined);
  await toast(c, c.tx.role.thanks);
}
