/**
 * Расчёты панели владельца: только чистые функции над снимком базы.
 * Созданные заказы считаем по дате создания, оплаченные — по дате оплаты, и не смешиваем их.
 */
import { isPaid, periodStart, type Period } from "./analytics";
import type { MusicChoice, Occasion, OrderStatus } from "./domain";
import { activeDesigns, DESIGN_STYLES, FORMATS, type DesignStyle, type Format } from "@/templates/registry";

export const OCCASIONS: Occasion[] = ["nikoh", "nahorgi", "sunnat", "yubiley"];

export type PanelOrder = {
  id: string;
  number: number;
  userId: number;
  username: string | null;
  firstName: string | null;
  status: OrderStatus;
  occasion: Occasion;
  format: Format;
  templateId: string;
  musicKind: MusicChoice["kind"];
  amount: number;
  createdAt: Date;
  paidAt: Date | null;
  updatedAt: Date;
};
export type PanelUser = { id: number; createdAt: Date; source: string | null };
/** График выплат: каждый день / раз в неделю (пн) / раз в месяц (1-го) */
export type PayoutSchedule = "daily" | "weekly" | "monthly";
export const SCHEDULES: PayoutSchedule[] = ["daily", "weekly", "monthly"];
/** pending — создал менеджер, ждёт ✅ владельца (QR работает, оплаты считаются, выплаты нет); rejected — отклонён */
export type PartnerStatus = "pending" | "active" | "rejected";
export type Partner = {
  id: number;
  code: string;
  name: string;
  telegramId: number | null;
  username: string | null;
  rate: number;
  createdAt: Date;
  /** Менеджер, который привёл; null — партнёр владельца */
  managedBy: number | null;
  /** +77011234567 */
  phone: string | null;
  /** Куда переводить: телефон Kaspi или номер карты */
  kaspi: string | null;
  schedule: PayoutSchedule;
  status: PartnerStatus;
  /** Предложение менеджера (ставка + график), ждёт ✅ владельца; null — нет */
  proposedRate: number | null;
  proposedSchedule: PayoutSchedule | null;
  /** null — владельцу о новом партнёре / предложении ещё не сообщили */
  ownerNotifiedAt: Date | null;
  sleepNotifiedAt: Date | null;
};
export type PartnerEarning = { orderId: string; partnerId: number; amount: number; delivered: boolean; createdAt: Date };
export type PartnerPayout = { partnerId: number; amount: number; createdAt: Date };
export type PanelSnapshot = {
  orders: PanelOrder[];
  users: PanelUser[];
  partners: Partner[];
  earnings: PartnerEarning[];
  payouts: PartnerPayout[];
  /** false — миграция партнёров ещё не применена */
  partnersReady: boolean;
};

/** Владелец и админы пользуются ботом как обычно, но в цифры не попадают */
export function withoutStaff(s: PanelSnapshot, staff: number[]): PanelSnapshot {
  const ids = new Set(staff);
  const staffOrders = new Set(s.orders.filter((o) => ids.has(o.userId)).map((o) => o.id));
  return {
    ...s,
    orders: s.orders.filter((o) => !staffOrders.has(o.id)),
    users: s.users.filter((u) => !ids.has(u.id)),
    earnings: s.earnings.filter((e) => !staffOrders.has(e.orderId)),
  };
}

/** Метка партнёра в users.source: ?start=p_<код> */
export const partnerSource = (code: string) => `p_${code}`;
export const parsePartnerSource = (source: string | null) => /^p_([a-z0-9]{4,32})$/.exec(source ?? "")?.[1] ?? null;

const within = (period: Period, now: Date) => {
  const start = +periodStart(period, now);
  return (d: Date) => +d >= start && +d <= +now;
};
const paidDate = (o: PanelOrder) => o.paidAt ?? o.updatedAt;
const paidWithin = (s: PanelSnapshot, period: Period, now: Date) => {
  const inside = within(period, now);
  return s.orders.filter((o) => isPaid(o) && inside(paidDate(o)));
};

export function overview(s: PanelSnapshot, period: Period, now: Date) {
  const inside = within(period, now);
  const paid = paidWithin(s, period, now);
  const revenue = paid.reduce((sum, o) => sum + o.amount, 0);
  return {
    clients: s.users.filter((u) => inside(u.createdAt)).length,
    created: s.orders.filter((o) => inside(o.createdAt)).length,
    paid: paid.length,
    revenue,
    average: paid.length ? Math.round(revenue / paid.length) : 0,
    /** Текущее состояние, от периода не зависит */
    waiting: s.orders.filter((o) => o.status === "receipt_sent").length,
  };
}

type Money = { paid: number; revenue: number };

export function revenueBreakdown(s: PanelSnapshot, period: Period, now: Date) {
  const paid = paidWithin(s, period, now);
  const sum = (list: PanelOrder[]): Money => ({ paid: list.length, revenue: list.reduce((n, o) => n + o.amount, 0) });
  return {
    ...sum(paid),
    formats: FORMATS.map((id) => ({ id, ...sum(paid.filter((o) => o.format === id)) })),
    occasions: OCCASIONS.map((id) => ({ id, ...sum(paid.filter((o) => o.occasion === id)) })),
  };
}

export const ORDERS_PAGE = 8;

export function orderPage(s: PanelSnapshot, period: Period, now: Date, opts: { paidOnly: boolean; page: number }) {
  const inside = within(period, now);
  const list = opts.paidOnly
    ? paidWithin(s, period, now).sort((a, b) => +paidDate(b) - +paidDate(a) || b.number - a.number)
    : s.orders.filter((o) => inside(o.createdAt)).sort((a, b) => +b.createdAt - +a.createdAt || b.number - a.number);
  const pages = Math.max(1, Math.ceil(list.length / ORDERS_PAGE));
  const page = Math.min(Math.max(0, opts.page), pages - 1);
  return { rows: list.slice(page * ORDERS_PAGE, (page + 1) * ORDERS_PAGE), page, pages, total: list.length };
}

function paidByDesign(s: PanelSnapshot, period: Period, now: Date) {
  const counts = new Map<string, number>();
  for (const o of paidWithin(s, period, now)) counts.set(o.templateId, (counts.get(o.templateId) ?? 0) + 1);
  return counts;
}

/** Тип → стили, в которых есть активные дизайны, и сколько оплат */
export function designTypes(s: PanelSnapshot, period: Period, now: Date) {
  const counts = paidByDesign(s, period, now);
  return FORMATS.map((format) => {
    const list = activeDesigns().filter((d) => d.format === format);
    const styles = DESIGN_STYLES.map((style) => {
      const inStyle = list.filter((d) => d.style === style);
      return { style, designs: inStyle.length, paid: inStyle.reduce((n, d) => n + (counts.get(d.id) ?? 0), 0) };
    }).filter((x) => x.designs > 0);
    return { format, paid: styles.reduce((n, x) => n + x.paid, 0), styles };
  });
}

export function topDesigns(s: PanelSnapshot, period: Period, now: Date, format: Format, style: DesignStyle, limit = 10) {
  const counts = paidByDesign(s, period, now);
  return activeDesigns()
    .filter((d) => d.format === format && d.style === style)
    .map((d) => ({ id: d.id, number: d.number, paid: counts.get(d.id) ?? 0 }))
    .sort((a, b) => b.paid - a.paid || a.number - b.number)
    .slice(0, limit);
}

export function musicStats(s: PanelSnapshot, period: Period, now: Date) {
  const inside = within(period, now);
  const list = s.orders.filter((o) => inside(o.createdAt));
  const count = (kind: MusicChoice["kind"]) => list.filter((o) => o.musicKind === kind).length;
  return { list: count("list"), own: count("own"), none: count("none") };
}

export type PartnerRow = {
  partner: Partner;
  /** Первый вход по коду за период */
  scanned: number;
  /** Из них создали заказ за период */
  started: number;
  /** Оплаченные заказы за период */
  paid: number;
  /** За всё время: начислено, выплачено, к выплате */
  earned: number;
  paidOut: number;
  due: number;
  /** Начислено, но партнёр ещё не подтверждён владельцем: к выплате станет после ✅ */
  onHold: number;
  /** Последний скан (первый вход по коду); null — сканов не было */
  lastScanAt: Date | null;
  /** Сколько сообщений об оплате не дошло (партнёр не нажимал /start) */
  undelivered: number;
};

export function partnerRows(s: PanelSnapshot, period: Period, now: Date): PartnerRow[] {
  const inside = within(period, now);
  return s.partners.map((partner) => {
    const source = partnerSource(partner.code);
    const users = s.users.filter((u) => u.source === source);
    const ids = new Set(users.map((u) => u.id));
    const earnings = s.earnings.filter((e) => e.partnerId === partner.id);
    const earned = earnings.reduce((n, e) => n + e.amount, 0);
    const paidOut = s.payouts.filter((p) => p.partnerId === partner.id).reduce((n, p) => n + p.amount, 0);
    return {
      partner,
      scanned: users.filter((u) => inside(u.createdAt)).length,
      started: new Set(s.orders.filter((o) => ids.has(o.userId) && inside(o.createdAt)).map((o) => o.userId)).size,
      paid: earnings.filter((e) => inside(e.createdAt)).length,
      earned,
      paidOut,
      due: partner.status === "active" ? earned - paidOut : 0,
      onHold: partner.status === "pending" ? earned - paidOut : 0,
      lastScanAt: users.reduce<Date | null>((d, u) => (!d || u.createdAt > d ? u.createdAt : d), null),
      undelivered: earnings.filter((e) => !e.delivered).length,
    };
  });
}
