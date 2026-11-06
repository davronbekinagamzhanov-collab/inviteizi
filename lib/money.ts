/**
 * Деньги v2 (часть 7): кому засчитана оплата, заработок менеджера, дни выплат.
 * Только чистые функции над снимком панели (PanelSnapshot уже без владельца, админов и менеджеров).
 * Время — Алматы (UTC+5 круглый год).
 */
import { isPaid } from "./analytics";
import { parsePartnerSource, type PanelOrder, type PanelSnapshot, type Partner, type PayoutSchedule } from "./owner-panel";
import { MANAGER_BONUS, MANAGER_GOAL, MANAGER_PER_ORDER, parseManagerSource, type Manager } from "./roles";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const KZ = 5 * HOUR;

/** Местная дата «2026-11-05» */
export const kzDay = (d: Date) => new Date(+d + KZ).toISOString().slice(0, 10);
/** Местный месяц «2026-11» */
export const kzMonth = (d: Date) => kzDay(d).slice(0, 7);
/** Начало местных суток */
export const kzMidnight = (d: Date) => new Date(Math.floor((+d + KZ) / DAY) * DAY - KZ);
/** Начало местного месяца (key «2026-11») */
export const monthStart = (key: string) => new Date(Date.parse(`${key}-01T00:00:00Z`) - KZ);
/** Предыдущий месяц: «2026-11» → «2026-10» */
export function prevMonth(key: string) {
  const [y, m] = key.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}
/** Следующий месяц: «2026-12» → «2027-01» */
export function nextMonth(key: string) {
  const [y, m] = key.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}

/** День выплаты по графику: каждый день / понедельник / 1-е число (по Алматы) */
export function isPayDay(schedule: PayoutSchedule, now: Date) {
  const local = new Date(+now + KZ);
  if (schedule === "weekly") return local.getUTCDay() === 1;
  if (schedule === "monthly") return local.getUTCDate() === 1;
  return true;
}

/** Ближайший день выплаты (сегодня, если сегодня день выплаты) — «2026-11-09» */
export function nextPayDay(schedule: PayoutSchedule, now: Date) {
  for (let i = 0; i < 32; i++) {
    const d = new Date(+now + i * DAY);
    if (isPayDay(schedule, d)) return kzDay(d);
  }
  return kzDay(now);
}

const paidAt = (o: PanelOrder) => o.paidAt ?? o.updatedAt;

export type Attribution = { partner: Partner | null; manager: Manager | null };

/**
 * Кому засчитана оплата: партнёру (его QR) и/или менеджеру (его партнёр или его «заказ для клиента»).
 * Заказ для клиента — продажа менеджера или владельца, не партнёра.
 */
export function attributionOf(s: PanelSnapshot, managers: Manager[], o: Pick<PanelOrder, "id" | "userId">): Attribution {
  const byId = (id: number | null) => (id === null ? null : managers.find((m) => m.telegramId === id) ?? null);
  const client = s.clientOrders?.find((x) => x.orderId === o.id);
  if (client) {
    const code = parseManagerSource(client.ref);
    return { partner: null, manager: code ? managers.find((m) => m.code === code) ?? null : null };
  }
  const earning = s.earnings.find((e) => e.orderId === o.id);
  const code = parsePartnerSource(s.users.find((u) => u.id === o.userId)?.source ?? null);
  const partner = earning ? s.partners.find((p) => p.id === earning.partnerId) : code ? s.partners.find((p) => p.code === code) : undefined;
  if (!partner || partner.status === "rejected") return { partner: null, manager: null };
  return { partner, manager: byId(partner.managedBy) };
}

/** Оплаченные заказы, засчитанные менеджеру, за [from, to) */
export function managerPaid(s: PanelSnapshot, managers: Manager[], managerId: number, from: Date, to: Date) {
  return s.orders.filter((o) => {
    if (!isPaid(o) || +paidAt(o) < +from || +paidAt(o) >= +to) return false;
    const m = attributionOf(s, managers, o).manager;
    // Снятому менеджеру — только оплаты, пришедшие, пока он работал
    if (m?.telegramId !== managerId) return false;
    return m.active || !m.removedAt || +paidAt(o) < +m.removedAt;
  });
}

/** Заработок менеджера за месяц: 500 ₸ × оплаты + 15 000 ₸ при 30+ */
export const managerEarning = (orders: number) => orders * MANAGER_PER_ORDER + (orders >= MANAGER_GOAL ? MANAGER_BONUS : 0);

export function managerMonth(s: PanelSnapshot, managers: Manager[], managerId: number, key: string) {
  const orders = managerPaid(s, managers, managerId, monthStart(key), monthStart(nextMonth(key))).length;
  return { key, orders, amount: managerEarning(orders) };
}

/** Сколько оплат партнёра ещё не выплачено: начисления после последней выплаты (ставка 0 не считается) */
export function unpaidCount(s: PanelSnapshot, partnerId: number) {
  const last = s.payouts.filter((p) => p.partnerId === partnerId).reduce((d, p) => Math.max(d, +p.createdAt), 0);
  return s.earnings.filter((e) => e.partnerId === partnerId && e.amount > 0 && +e.createdAt > last).length;
}

/** «А***» — только первая буква имени клиента, без логина */
export function maskName(name: string | null | undefined) {
  const first = Array.from((name ?? "").replace(/[^\p{L}]/gu, ""))[0];
  return first ? `${first.toUpperCase()}***` : "***";
}

export const MONTHS_RU = ["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"];
export const MONTHS_RU_GEN = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
/** «5 ноября» */
export const ruDate = (d: Date) => {
  const [, m, day] = kzDay(d).split("-").map(Number);
  return `${day} ${MONTHS_RU_GEN[m - 1]}`;
};
/** «2026-10» → «октябрь» */
export const ruMonth = (key: string) => MONTHS_RU[Number(key.slice(5, 7)) - 1];

/** «1 оплата», «2 оплаты», «5 оплат» */
export function ruPayments(n: number) {
  const d = n % 10;
  const dd = n % 100;
  const w = d === 1 && dd !== 11 ? "оплата" : d >= 2 && d <= 4 && (dd < 12 || dd > 14) ? "оплаты" : "оплат";
  return `${n} ${w}`;
}
