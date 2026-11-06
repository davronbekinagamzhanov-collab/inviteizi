/**
 * Панели менеджера и партнёра в приложении (/app/panel, кнопка «🖥 Панель» в их меню бота). Только чтение.
 * Роль — только по проверенному initData: менеджер (активный) видит свою сеть, партнёр — свои оплаты.
 * Владельцу и клиентам здесь отказ (у владельца — /app/owner). Цифры — те же формулы, что в боте.
 */
import type { Deps } from "../flow/types";
import type { AppUser } from "@/lib/tg-init-data";
import { type PanelOrder, partnerRowsWithin } from "@/lib/owner-panel";
import { isPaid } from "@/lib/analytics";
import { attributionOf, kzMonth, managerEarning, managerMonth } from "@/lib/money";
import { MANAGER_BONUS, MANAGER_GOAL, MANAGER_PER_ORDER } from "@/lib/roles";
import { linkOf, panelData, partnerRowOf, sendPosterTo, SLEEP_AFTER_MS } from "../flow/partners";
import { networkOf, rangeOf } from "../flow/stats";
import { texts as allTexts, txFor } from "../flow/util";

export const ROLE_PERIODS = ["w", "m", "a"] as const;
export type RolePeriod = (typeof ROLE_PERIODS)[number];
const MAX_ROWS = 60;

const periodOf = (x: unknown): RolePeriod => ((ROLE_PERIODS as readonly unknown[]).includes(x) ? (x as RolePeriod) : "m");
const paidAt = (o: PanelOrder) => o.paidAt ?? o.updatedAt;
const initial = (o: PanelOrder) => (o.firstName?.trim()?.[0] ?? o.username?.[0] ?? "•").toUpperCase();

export type PanelPayment = { number: number; paidAt: string; amount: number; initial: string; partner: string | null };

export type ManagerPanel = {
  role: "manager";
  period: RolePeriod;
  label: string;
  cards: { paid: number; revenue: number; partners: number; sleeping: number };
  earn: { month: string; orders: number; amount: number; goal: number; bonus: number; perOrder: number };
  payments: PanelPayment[];
  partners: { id: number; name: string; status: string; rate: number; ratePercent: number | null; scanned: number; paid: number; due: number; sleeping: boolean }[];
};

export type PartnerPanel = {
  role: "partner";
  period: RolePeriod;
  label: string;
  name: string;
  pending: boolean;
  rate: number;
  ratePercent: number | null;
  schedule: string;
  cards: { scanned: number; paid: number; earned: number; paidOut: number; due: number };
  payments: PanelPayment[];
  link: string;
  posterLangs: ("uz" | "ru" | "kk")[];
};

/** Партнёр «спит»: 14 дней без новых сканов (как напоминание в боте) */
const sleepingOf = (now: Date, createdAt: Date, lastScanAt: Date | null) => +now - +(lastScanAt && lastScanAt > createdAt ? lastScanAt : createdAt) >= SLEEP_AFTER_MS;

export async function rolePanel(deps: Deps, u: AppUser, periodArg: unknown): Promise<ManagerPanel | PartnerPanel | { error: "forbidden" }> {
  // Владелец/админ — своя панель; здесь не показываем сеть «за менеджера»
  if (await deps.repo.isAdmin(u.id)) return { error: "forbidden" };
  const period = periodOf(periodArg);
  const now = deps.now();
  const r = rangeOf(period, now);
  const inside = (d: Date) => +d >= +r.from && +d < +r.to;
  const manager = await deps.repo.getManager(u.id);
  if (manager?.active) {
    const full = await panelData(deps);
    const managers = await deps.repo.listManagers();
    const net = networkOf(full, managers, u.id);
    const paid = net.orders.filter((o) => isPaid(o) && inside(paidAt(o))).sort((a, b) => +paidAt(b) - +paidAt(a));
    const rows = partnerRowsWithin(net, inside);
    const month = kzMonth(now);
    const cur = managerMonth(full, managers, u.id, month);
    const partners = rows
      .map((x) => ({ id: x.partner.id, name: x.partner.name, status: x.partner.status, rate: x.partner.rate, ratePercent: x.partner.ratePercent ?? null, scanned: x.scanned, paid: x.paid, due: x.due + x.onHold, sleeping: x.partner.status !== "rejected" && sleepingOf(now, x.partner.createdAt, x.lastScanAt) }))
      .sort((a, b) => b.paid - a.paid || b.scanned - a.scanned || a.name.localeCompare(b.name));
    return {
      role: "manager",
      period,
      label: r.label,
      cards: { paid: paid.length, revenue: paid.reduce((n, o) => n + o.amount, 0), partners: partners.length, sleeping: partners.filter((p) => p.sleeping).length },
      earn: { month, orders: cur.orders, amount: managerEarning(cur.orders), goal: MANAGER_GOAL, bonus: MANAGER_BONUS, perOrder: MANAGER_PER_ORDER },
      payments: paid.slice(0, MAX_ROWS).map((o) => ({ number: o.number, paidAt: paidAt(o).toISOString(), amount: o.amount, initial: initial(o), partner: attributionOf(full, managers, o).partner?.name ?? null })),
      partners,
    };
  }
  const p = await deps.repo.findPartnerForUser(u.id, u.username ?? null);
  if (!p || p.status === "rejected") return { error: "forbidden" };
  const s = await panelData(deps);
  const row = partnerRowsWithin(s, inside).find((x) => x.partner.id === p.id);
  const all = await partnerRowOf(deps, p);
  const mine = new Set(s.earnings.filter((e) => e.partnerId === p.id).map((e) => e.orderId));
  const paid = s.orders.filter((o) => mine.has(o.id) && isPaid(o) && inside(paidAt(o))).sort((a, b) => +paidAt(b) - +paidAt(a));
  const lang = (await deps.repo.getUser(u.id))?.lang ?? "uz";
  return {
    role: "partner",
    period,
    label: r.label,
    name: p.name,
    pending: p.status === "pending",
    rate: p.rate,
    ratePercent: p.ratePercent ?? null,
    schedule: txFor(lang).role.schedule[p.schedule] ?? p.schedule,
    cards: { scanned: row?.scanned ?? 0, paid: row?.paid ?? 0, earned: all?.earned ?? 0, paidOut: all?.paidOut ?? 0, due: all ? all.due + all.onHold : 0 },
    // Партнёру — только номер, первая буква клиента и сумма: ни имён, ни ссылок, ни телефонов
    payments: paid.slice(0, MAX_ROWS).map((o) => ({ number: o.number, paidAt: paidAt(o).toISOString(), amount: o.amount, initial: initial(o), partner: null })),
    link: await linkOf(deps, p),
    posterLangs: deps.env.kazakhEnabled ? ["uz", "ru", "kk"] : ["uz", "ru"],
  };
}

const POSTER_COOLDOWN_MS = 60_000;
const posterAt = new Map<number, number>();

/** «Постер» в панели партнёра: PDF + PNG + ссылка приходят в чат с ботом */
export async function partnerPoster(deps: Deps, u: AppUser, langArg: unknown) {
  if (await deps.repo.isAdmin(u.id)) return { error: "forbidden" as const };
  const p = await deps.repo.findPartnerForUser(u.id, u.username ?? null);
  if (!p || p.status === "rejected") return { error: "forbidden" as const };
  // Постер тяжёлый (PNG + PDF) и шлёт 3 сообщения: не чаще раза в минуту на партнёра
  const now = +deps.now();
  if (now - (posterAt.get(p.id) ?? 0) < POSTER_COOLDOWN_MS) return { error: "tooOften" as const };
  posterAt.set(p.id, now);
  const lang = langArg === "ru" ? "ru" : langArg === "kk" && deps.env.kazakhEnabled ? "kk" : "uz";
  const userLang = (await deps.repo.getUser(u.id))?.lang ?? "uz";
  await sendPosterTo(deps, u.id, p, lang, allTexts[userLang]);
  return { ok: true as const };
}
