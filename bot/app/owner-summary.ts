/**
 * Этап 3 (19.11.2026): главный экран владельца «коротко → Подробнее».
 *  - today: всегда за сегодня (по Алматы): новые люди в боте, заказы, оплачено (шт. и ₸), ждут проверки оплаты;
 *  - detail: по дням (30 дней), по тадбирам, по форматам, по источникам (сам / партнёр / менеджер / акция),
 *    воронка «зашли → открыли образцы → НАМУНА → оплатили» за выбранный период.
 * Цифры — те же правила, что в ownerPanel: оплаты по дате оплаты, 0 ₸ не продажа, сотрудники не считаются.
 */
import { isPaid } from "@/lib/analytics";
import { attributionOf, kzMidnight } from "@/lib/money";
import type { PanelOrder, PanelSnapshot } from "@/lib/owner-panel";
import type { Manager } from "@/lib/roles";
import type { Format, Occasion } from "@/lib/domain";

const DAY = 86_400_000;
const paidAt = (o: PanelOrder) => o.paidAt ?? o.updatedAt;
const sale = (o: PanelOrder) => isPaid(o) && o.amount > 0;

export type SourceId = "own" | "partner" | "manager" | "promotion";
export type GroupRow<T extends string> = { id: T; orders: number; paid: number; revenue: number };

export type OwnerToday = { newUsers: number; orders: number; paid: number; revenue: number; waiting: number };
export type OwnerDetail = {
  days: { day: string; users: number; orders: number; paid: number; revenue: number }[];
  occasions: GroupRow<Occasion>[];
  formats: GroupRow<Format>[];
  sources: GroupRow<SourceId>[];
  funnel: { users: number; viewers: number | null; namuna: number; payers: number };
};

const kzDay = (d: Date) => new Date(+d + 5 * 3_600_000).toISOString().slice(0, 10);

export function ownerToday(s: PanelSnapshot, now: Date, waiting: number): OwnerToday {
  const from = kzMidnight(now),
    to = new Date(+from + DAY);
  const inside = (d: Date) => +d >= +from && +d < +to;
  const paid = s.orders.filter((o) => sale(o) && inside(paidAt(o)));
  return {
    newUsers: s.users.filter((u) => inside(u.createdAt)).length,
    orders: s.orders.filter((o) => inside(o.createdAt)).length,
    paid: paid.length,
    revenue: paid.reduce((n, o) => n + o.amount, 0),
    waiting,
  };
}

function sourceOf(s: PanelSnapshot, managers: Manager[], o: PanelOrder): SourceId {
  if (o.promotion) return "promotion";
  const a = attributionOf(s, managers, o);
  if (a.partner) return "partner";
  if (a.manager) return "manager";
  return "own";
}

export function ownerDetail(
  s: PanelSnapshot,
  managers: Manager[],
  now: Date,
  range: { from: Date; to: Date },
  viewers: number[] | null,
  days = 30,
): OwnerDetail {
  const inside = (d: Date) => +d >= +range.from && +d < +range.to;
  const group = <T extends string>(key: (o: PanelOrder) => T, ids: readonly T[]): GroupRow<T>[] => {
    const rows = new Map<T, GroupRow<T>>(ids.map((id) => [id, { id, orders: 0, paid: 0, revenue: 0 }]));
    for (const o of s.orders) {
      const r = rows.get(key(o)) ?? { id: key(o), orders: 0, paid: 0, revenue: 0 };
      if (inside(o.createdAt)) r.orders++;
      if (sale(o) && inside(paidAt(o))) {
        r.paid++;
        r.revenue += o.amount;
      }
      rows.set(key(o), r);
    }
    return [...rows.values()].filter((r) => r.orders || r.paid);
  };

  // по дням: последние N дней по Алматы, новые сверху; дни без движения тоже видны (нули)
  const today = kzMidnight(now);
  const byDay = new Map<string, OwnerDetail["days"][number]>();
  for (let i = 0; i < days; i++) {
    const day = kzDay(new Date(+today - i * DAY));
    byDay.set(day, { day, users: 0, orders: 0, paid: 0, revenue: 0 });
  }
  for (const u of s.users) {
    const r = byDay.get(kzDay(u.createdAt));
    if (r) r.users++;
  }
  for (const o of s.orders) {
    const r = byDay.get(kzDay(o.createdAt));
    if (r) r.orders++;
    if (sale(o)) {
      const p = byDay.get(kzDay(paidAt(o)));
      if (p) {
        p.paid++;
        p.revenue += o.amount;
      }
    }
  }

  const userIds = new Set(s.users.map((u) => u.id));
  const created = s.orders.filter((o) => inside(o.createdAt));
  return {
    days: [...byDay.values()],
    occasions: group((o) => o.occasion, ["nikoh", "nahorgi", "sunnat", "yubiley"] as Occasion[]),
    formats: group((o) => o.format, ["animated", "scroll", "simple"] as Format[]),
    sources: group((o) => sourceOf(s, managers, o), ["own", "partner", "manager", "promotion"] as SourceId[]),
    funnel: {
      users: s.users.filter((u) => inside(u.createdAt)).length,
      // сотрудники и партнёры убраны из снимка — считаем только тех, кто в нём есть
      viewers: viewers ? viewers.filter((id) => userIds.has(id)).length : null,
      namuna: new Set(created.map((o) => o.userId)).size,
      payers: new Set(created.filter(sale).map((o) => o.userId)).size,
    },
  };
}
