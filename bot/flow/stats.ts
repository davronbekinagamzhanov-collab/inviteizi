/**
 * v2, часть 8: «📊 Статистика» — одно сообщение, кнопки периода [Сегодня][Неделя][Месяц][Год]
 * и раздела [💰 Деньги][🤝 Партнёры][🎨 Дизайны][📉 Где уходят].
 *  - владелец (st:<период>:<раздел>) — всё;
 *  - менеджер (sm:<период>:<раздел>) — только своя сеть + заработок;
 *  - партнёр (sp:<период>) — оплаты по его QR (неделя / месяц / всё), начислено / выплачено / к выплате.
 * Заказы сотрудников (тестовые) не считаются: снимок panelData уже без них.
 */
import { isPaid } from "@/lib/analytics";
import { OCCASIONS, partnerRowsWithin, partnerSource, type PanelOrder, type PanelSnapshot, type Partner } from "@/lib/owner-panel";
import { attributionOf, kzMidnight, kzMonth, managerEarning, managerMonth, monthStart, nextMonth, prevMonth, ruDate, ruMonth, ruPayments } from "@/lib/money";
import { managerName, MANAGER_BONUS, MANAGER_GOAL, MANAGER_PER_ORDER, type Manager } from "@/lib/roles";
import { activeDesigns } from "@/templates/registry";
import { staff } from "@/texts/bot-ru";
import type { InlineButton } from "../tg";
import { panelData, panelDataWithStaff, partnerRowOf, staffOrdersWithin } from "./partners";
import { designName, editOrSend, inline, price, roleOf, send, texts } from "./util";
import type { Ctx } from "./types";

const S = staff.st;
const DAY = 86_400_000;
const PERIODS = ["d", "w", "m", "y"] as const;
const SECTIONS = ["money", "pt", "ds", "fn"] as const;
type P = (typeof PERIODS)[number];
type Sec = (typeof SECTIONS)[number];
type Screen = { text: string; rows: InlineButton[][] };
export type Range = { from: Date; to: Date; label: string };

/** Промежуток периода по Алматы: сегодня / 7 дней / календарный месяц / календарный год */
export function rangeOf(p: P | "a", now: Date): Range {
  const mid = kzMidnight(now);
  const end = new Date(+mid + DAY);
  if (p === "d") return { from: mid, to: end, label: S.range.d(ruDate(now)) };
  if (p === "w") return { from: new Date(+mid - 6 * DAY), to: end, label: S.range.w };
  const month = kzMonth(now);
  if (p === "m") return { from: monthStart(month), to: end, label: S.range.m(`${ruMonth(month)} ${month.slice(0, 4)}`) };
  if (p === "y") return { from: monthStart(`${month.slice(0, 4)}-01`), to: end, label: S.range.y(month.slice(0, 4)) };
  return { from: new Date(0), to: end, label: "" };
}

const inRange = (r: Range) => (d: Date) => +d >= +r.from && +d < +r.to;
const paidAt = (o: PanelOrder) => o.paidAt ?? o.updatedAt;
const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : "");

/** Снимок только сети менеджера: его партнёры, их клиенты, его «заказы для клиента» */
export function networkOf(s: PanelSnapshot, managers: Manager[], managerId: number): PanelSnapshot {
  const partners = s.partners.filter((p) => p.managedBy === managerId);
  const sources = new Set(partners.map((p) => partnerSource(p.code)));
  const users = s.users.filter((u) => u.source && sources.has(u.source));
  const userIds = new Set(users.map((u) => u.id));
  const mine = (o: PanelOrder) => {
    if (s.clientOrders?.some((x) => x.orderId === o.id)) return attributionOf(s, managers, o).manager?.telegramId === managerId;
    return userIds.has(o.userId);
  };
  const orders = s.orders.filter(mine);
  const ids = new Set(partners.map((p) => p.id));
  return {
    ...s,
    orders,
    users,
    partners,
    earnings: s.earnings.filter((e) => ids.has(e.partnerId)),
    payouts: s.payouts.filter((p) => ids.has(p.partnerId)),
    managerPayouts: s.managerPayouts?.filter((x) => x.managerId === managerId),
  };
}

/** Заработок менеджеров за промежуток: месяцы — с бонусом, неполные дни — 500 ₸ × оплаты */
function managersCost(s: PanelSnapshot, managers: Manager[], r: Range, p: P, only?: number) {
  let sum = 0;
  for (const m of managers) {
    if (only !== undefined && m.telegramId !== only) continue;
    if (p === "m" || p === "y") {
      for (let key = kzMonth(r.from); +monthStart(key) < +r.to; key = nextMonth(key)) sum += managerMonth(s, managers, m.telegramId, key).amount;
    } else {
      const n = s.orders.filter((o) => isPaid(o) && inRange(r)(paidAt(o)) && attributionOf(s, managers, o).manager?.telegramId === m.telegramId).length;
      sum += n * MANAGER_PER_ORDER;
    }
  }
  return sum;
}

function money(s: PanelSnapshot, managers: Manager[], r: Range, p: P, managerId?: number) {
  const paid = s.orders.filter((o) => isPaid(o) && inRange(r)(paidAt(o)));
  if (!paid.length && managerId === undefined) return S.none;
  const revenue = paid.reduce((n, o) => n + o.amount, 0);
  const by = (f: (o: PanelOrder) => boolean) => paid.filter(f).length;
  const occ = OCCASIONS.map((id) => [texts.ru.category[id], by((o) => o.occasion === id)] as const)
    .filter(([, n]) => n > 0)
    .map(([name, n]) => `${name.replace(/^\S+\s/, "")} ${n}`)
    .join(" · ");
  const lines = [
    S.paid(paid.length, price(revenue)),
    ...(paid.length ? [S.average(price(Math.round(revenue / paid.length))), S.formats(by((o) => o.format === "animated"), by((o) => o.format === "scroll"), by((o) => o.format === "simple"))] : []),
    ...(occ ? [S.occasions(occ)] : []),
  ];
  if (managerId !== undefined) return [...lines, "", S.myMoney(price(managersCost(s, managers, r, p, managerId)))].join("\n");
  const earned = s.earnings.filter((e) => inRange(r)(e.createdAt)).reduce((n, e) => n + e.amount, 0);
  const paidOut = s.payouts.filter((x) => inRange(r)(x.createdAt)).reduce((n, x) => n + x.amount, 0);
  const mgr = managersCost(s, managers, r, p);
  return [...lines, "", S.partnersCost(price(earned), price(paidOut)), ...(mgr ? [S.managersCost(price(mgr))] : []), S.left(price(revenue - earned - mgr))].join("\n");
}

function partnersSection(s: PanelSnapshot, managers: Manager[], r: Range, p: P, owner: boolean) {
  const rows = partnerRowsWithin(s, inRange(r)).filter((x) => x.partner.status !== "rejected");
  if (!rows.length) return S.none;
  const who = (pt: Partner) => {
    const m = owner ? managers.find((x) => x.telegramId === pt.managedBy) : undefined;
    return `${pt.name.slice(0, 32)}${m ? ` (${managerName(m)})` : ""}`;
  };
  const sorted = [...rows].sort((a, b) => b.paid - a.paid || b.scanned - a.scanned || a.partner.id - b.partner.id);
  const shown = sorted.slice(0, 12);
  const total = (k: "scanned" | "started" | "paid") => rows.reduce((n, x) => n + x[k], 0);
  const lines = [
    S.ptLegend,
    S.ptTotal(total("scanned"), total("started"), total("paid")),
    "",
    ...shown.map((x) => S.ptLine(who(x.partner), x.scanned, x.started, x.paid, x.due > 0 ? price(x.due) : "")),
    ...(sorted.length > shown.length ? [S.more(sorted.length - shown.length)] : []),
  ];
  if (owner) {
    const active = managers.filter((m) => m.active);
    const mgrLines = active.map((m) => {
      const n = s.orders.filter((o) => isPaid(o) && inRange(r)(paidAt(o)) && attributionOf(s, managers, o).manager?.telegramId === m.telegramId).length;
      return S.mgrLine(managerName(m), n, price(managersCost(s, managers, r, p, m.telegramId)));
    });
    if (mgrLines.length) lines.push("", ...mgrLines);
  }
  return lines.join("\n");
}

function designsSection(s: PanelSnapshot, r: Range) {
  const created = s.orders.filter((o) => inRange(r)(o.createdAt));
  const paid = s.orders.filter((o) => isPaid(o) && inRange(r)(paidAt(o)));
  if (!created.length && !paid.length) return S.none;
  const all = activeDesigns();
  const rows = all
    .map((d) => ({ d, samples: created.filter((o) => o.templateId === d.id).length, paid: paid.filter((o) => o.templateId === d.id).length }))
    .filter((x) => x.samples || x.paid)
    .sort((a, b) => b.paid - a.paid || b.samples - a.samples || a.d.number - b.d.number);
  const shown = rows.slice(0, 12);
  return [
    S.dsLegend,
    "",
    ...shown.map((x) => S.dsLine(x.d.number, designName(x.d.id), x.samples, x.paid)),
    ...(rows.length > shown.length ? [S.more(rows.length - shown.length)] : []),
    "",
    S.dsUnused(all.length - rows.length, all.length),
  ].join("\n");
}

function funnel(s: PanelSnapshot, r: Range, reviews?: { avg: number; count: number }) {
  const users = s.users.filter((u) => inRange(r)(u.createdAt));
  const created = s.orders.filter((o) => inRange(r)(o.createdAt));
  const makers = new Set(created.map((o) => o.userId));
  const payers = new Set(created.filter((o) => isPaid(o)).map((o) => o.userId));
  const stuck = created.filter((o) => !isPaid(o));
  const steps = Object.keys(staff.n.steps)
    .map((st) => [st, stuck.filter((o) => o.status === st).length] as const)
    .filter(([, n]) => n > 0)
    .map(([st, n]) => `${staff.n.steps[st]} ${n}`);
  if (!users.length && !created.length) return reviews?.count ? S.reviews(reviews.avg.toFixed(1).replace(".", ","), reviews.count) : S.none;
  return [
    S.fnClients(users.length),
    S.fnSamples(makers.size, pct(makers.size, users.length)),
    S.fnPaid(payers.size, pct(payers.size, makers.size)),
    ...(stuck.length ? ["", S.fnStuck(stuck.length), steps.join(" · ")] : []),
    ...(reviews?.count ? ["", S.reviews(reviews.avg.toFixed(1).replace(".", ","), reviews.count)] : []),
  ].join("\n");
}

function keyboard(prefix: "st" | "sm", p: P, sec: Sec): InlineButton[][] {
  const mark = (on: boolean, t: string) => (on ? `• ${t}` : t);
  return [
    PERIODS.map((x) => ({ text: mark(x === p, S.periods[x]), data: `${prefix}:${x}:${sec}` })),
    [
      { text: mark(sec === "money", S.sections.money), data: `${prefix}:${p}:money` },
      { text: mark(sec === "pt", S.sections.pt), data: `${prefix}:${p}:pt` },
    ],
    [
      { text: mark(sec === "ds", S.sections.ds), data: `${prefix}:${p}:ds` },
      { text: mark(sec === "fn", S.sections.fn), data: `${prefix}:${p}:fn` },
    ],
    [{ text: staff.back, data: "pn:home" }],
  ];
}

const isP = (x: string): x is P => (PERIODS as readonly string[]).includes(x);
const isSec = (x: string): x is Sec => (SECTIONS as readonly string[]).includes(x);

/** Экран статистики владельца или менеджера */
export async function statsScreen(c: Ctx, role: "owner" | "manager", pArg = "d", secArg = "money"): Promise<Screen> {
  const p: P = isP(pArg) ? pArg : "d";
  const sec: Sec = isSec(secArg) ? secArg : "money";
  const now = c.deps.now();
  const r = rangeOf(p, now);
  const { s: full, staffOrders } = await panelDataWithStaff(c.deps);
  const managers = await c.deps.repo.listManagers();
  const s = role === "owner" ? full : networkOf(full, managers, c.user.id);
  const testOrders = role === "owner" ? staffOrdersWithin(staffOrders, r.from, r.to) : 0;
  const reviews = sec === "fn" ? await c.deps.repo.reviewSummary?.(r.from, r.to, role === "owner" ? null : s.orders.map((o) => o.id)) : undefined;
  const body =
    sec === "money"
      ? role === "owner"
        ? money(s, managers, r, p)
        : moneyNet(s, full, managers, r, p, c.user.id)
      : sec === "pt"
        ? partnersSection(s, managers, r, p, role === "owner")
        : sec === "ds"
          ? designsSection(s, r)
          : funnel(s, r, reviews ?? undefined);
  const note = testOrders ? ["", S.staffExcluded(testOrders)] : [];
  return { text: [role === "owner" ? S.title(r.label) : S.titleNet(r.label), S.sections[sec], "", body, ...note].join("\n"), rows: keyboard(role === "owner" ? "st" : "sm", p, sec) };
}

function moneyNet(net: PanelSnapshot, full: PanelSnapshot, managers: Manager[], r: Range, p: P, managerId: number) {
  const base = money(net, managers, r, p, managerId).split("\n");
  // Последняя строка — заработок: считаем по полному снимку (атрибуция заказов «для клиента»)
  base[base.length - 1] = S.myMoney(price(managersCost(full, managers, r, p, managerId)));
  return base.join("\n");
}

/** st:/sm: — кнопки статистики; права — на каждом нажатии */
export async function statsAction(c: Ctx, prefix: "st" | "sm", p: string, sec: string) {
  const role = await roleOf(c);
  if ((prefix === "st" && role !== "owner") || (prefix === "sm" && role !== "manager")) {
    if (c.u.kind === "callback") {
      await c.deps.tg.answerCallbackQuery(c.u.callbackId, { text: c.tx.oldButton });
      c.answered = true;
    }
    return;
  }
  const screen = await statsScreen(c, prefix === "st" ? "owner" : "manager", p, sec);
  if (c.u.kind === "callback") await editOrSend(c, screen.text, inline(screen.rows));
  else await send(c, screen.text, inline(screen.rows));
}

// ── Партнёр ──

const PARTNER_PERIODS = ["w", "m", "a"] as const;

/** sp:<w|m|a> — оплаты по QR партнёра; неоплаченные заказы и клиентов не показываем */
export async function partnerStatsScreen(c: Ctx, p: Partner, pArg = "m"): Promise<Screen> {
  const period = (PARTNER_PERIODS as readonly string[]).includes(pArg) ? (pArg as (typeof PARTNER_PERIODS)[number]) : "m";
  const now = c.deps.now();
  const r = rangeOf(period, now);
  const s = await panelData(c.deps);
  const row = partnerRowsWithin(s, inRange(r)).find((x) => x.partner.id === p.id);
  const all = await partnerRowOf(c.deps, p);
  const t = c.tx.role;
  const link = `https://t.me/${await c.deps.tg.botUsername()}?start=p_${p.code}`;
  const label = period === "a" ? t.periods.a : period === "w" ? t.periods.w : `${t.periods.m} · ${t.months[Number(kzMonth(now).slice(5)) - 1]}`;
  return {
    text: t.statsText({
      period: label,
      scanned: row?.scanned ?? 0,
      paid: row?.paid ?? 0,
      earned: price(all?.earned ?? 0),
      paidOut: price(all?.paidOut ?? 0),
      due: price(all ? all.due + all.onHold : 0),
      link,
    }),
    rows: [PARTNER_PERIODS.map((x) => ({ text: `${x === period ? "• " : ""}${t.periods[x]}`, data: `sp:${x}` })), [{ text: c.tx.back, data: "pn:home" }]],
  };
}

export async function partnerStatsAction(c: Ctx, pArg: string) {
  const p = c.chatId === c.user.id ? await c.deps.repo.findPartnerForUser(c.user.id, c.user.username) : null;
  if (!p) {
    if (c.u.kind === "callback") {
      await c.deps.tg.answerCallbackQuery(c.u.callbackId, { text: c.tx.oldButton });
      c.answered = true;
    }
    return;
  }
  const screen = await partnerStatsScreen(c, p, pArg);
  if (c.u.kind === "callback") await editOrSend(c, screen.text, inline(screen.rows));
  else await send(c, screen.text, inline(screen.rows));
}

// ── «💰 Мой заработок» менеджера ──

export async function managerEarningsScreen(c: Ctx): Promise<Screen> {
  const s = await panelData(c.deps);
  const managers = await c.deps.repo.listManagers();
  const now = c.deps.now();
  const month = kzMonth(now);
  const cur = managerMonth(s, managers, c.user.id, month);
  const past: string[] = [];
  for (let key = prevMonth(month), i = 0; i < 3; key = prevMonth(key), i++) {
    const e = managerMonth(s, managers, c.user.id, key);
    const paid = s.managerPayouts?.find((x) => x.managerId === c.user.id && x.month === key);
    if (!e.orders && !paid) continue;
    past.push(S.earnPast(capital(ruMonth(key)), ruPayments(paid?.orders ?? e.orders), price(paid?.amount ?? e.amount), paid ? S.earnPaid : S.earnDue));
  }
  return {
    text: [
      S.earnTitle,
      "",
      S.earnNow(capital(ruMonth(month)), ruPayments(cur.orders), price(managerEarning(cur.orders))),
      cur.orders >= MANAGER_GOAL ? staff.n.goalDone(price(MANAGER_BONUS)) : staff.n.goal(cur.orders, MANAGER_GOAL, price(MANAGER_BONUS)),
      ...(past.length ? ["", ...past] : []),
      "",
      S.earnRule(price(MANAGER_PER_ORDER), price(MANAGER_BONUS), MANAGER_GOAL),
    ].join("\n"),
    rows: [[{ text: staff.back, data: "pn:home" }]],
  };
}

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
