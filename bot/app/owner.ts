/**
 * Панель владельца в приложении (/app/owner): только чтение, только ADMIN_IDS (по проверенному initData).
 * Цифры — те же формулы, что в «📊 Статистика» бота (bot/flow/stats.ts) на том же снимке panelData:
 * оплаты по дате оплаты, НАМУНА и воронка — по дате создания. Подтверждение чеков и выплаты остаются в боте.
 */
import { isPaid } from "@/lib/analytics";
import { attributionOf } from "@/lib/money";
import { partnerRowsWithin, type PanelOrder } from "@/lib/owner-panel";
import { managerName } from "@/lib/roles";
import { activeDesigns } from "@/templates/registry";
import { staff } from "@/texts/bot-ru";
import type { Deps } from "../flow/types";
import { panelDataWithStaff, SLEEP_AFTER_MS, staffOrdersWithin } from "../flow/partners";
import { rangeOf } from "../flow/stats";
import { sendExport } from "../flow/export";
import { designName } from "../flow/util";

export const OWNER_PERIODS = ["d", "w", "m", "y"] as const;
export type OwnerPeriod = (typeof OWNER_PERIODS)[number];
const MAX_ORDERS = 500;

export const STATUS_RU: Record<string, string> = {
  draft: "анкета",
  preview: "НАМУНА",
  awaiting_payment: "на оплате",
  receipt_sent: "чек на проверке",
  active: "оплачен",
  archived: "в архиве",
  rejected: "чек отклонён",
};

export type OwnerOrder = {
  number: number;
  createdAt: string;
  paidAt: string | null;
  amount: number;
  design: string;
  partner: string | null;
  partnerId: number | null;
  client: string;
  names: string | null;
  status: string;
  paid: boolean;
  url: string | null;
};
export type OwnerPanel = {
  period: OwnerPeriod;
  label: string;
  /** Тестовые заказы сотрудников за период: в цифры не идут, строкой под карточками */
  testOrders: number;
  cards: { paid: number; revenue: number; namuna: number; conversion: number | null; makers: number; payers: number; due: number };
  orders: OwnerOrder[];
  ordersTotal: number;
  partners: {
    id: number;
    name: string;
    rate: string;
    status: string;
    manager: string | null;
    scanned: number;
    paid: number;
    earned: number;
    paidOut: number;
    due: number;
    onHold: number;
    sleeping: boolean;
  }[];
  designs: { id: string; number: number; name: string; samples: number; paid: number }[];
  funnel: { clients: number; makers: number; payers: number; stuck: { step: string; label: string; count: number }[] };
};

export async function isOwnerUser(deps: Deps, userId: number) {
  return deps.repo.isAdmin(userId);
}

const paidAt = (o: PanelOrder) => o.paidAt ?? o.updatedAt;

export async function ownerPanel(deps: Deps, userId: number, periodArg: unknown): Promise<OwnerPanel | { error: "forbidden" }> {
  if (!(await isOwnerUser(deps, userId))) return { error: "forbidden" };
  const period: OwnerPeriod = (OWNER_PERIODS as readonly unknown[]).includes(periodArg) ? (periodArg as OwnerPeriod) : "d";
  const now = deps.now();
  const r = rangeOf(period, now);
  const inside = (d: Date) => +d >= +r.from && +d < +r.to;
  const { s, staffOrders } = await panelDataWithStaff(deps);
  const managers = await deps.repo.listManagers();
  const testOrders = staffOrdersWithin(staffOrders, r.from, r.to);

  const paid = s.orders.filter((o) => isPaid(o) && inside(paidAt(o)));
  const created = s.orders.filter((o) => inside(o.createdAt));
  const makers = new Set(created.map((o) => o.userId));
  const payers = new Set(created.filter((o) => isPaid(o)).map((o) => o.userId));
  const stuck = created.filter((o) => !isPaid(o));
  const allRows = partnerRowsWithin(s, inside);

  // Заказы периода: созданные в периоде или оплаченные в нём, новые сверху
  const listed = s.orders
    .filter((o) => inside(o.createdAt) || (isPaid(o) && inside(paidAt(o))))
    .sort((a, b) => +b.createdAt - +a.createdAt || b.number - a.number);
  const orders: OwnerOrder[] = listed.slice(0, MAX_ORDERS).map((o) => {
    const a = attributionOf(s, managers, o);
    return {
      number: o.number,
      createdAt: o.createdAt.toISOString(),
      paidAt: isPaid(o) ? paidAt(o).toISOString() : null,
      amount: o.amount,
      design: designName(o.templateId),
      partner: a.partner?.name ?? (a.manager ? managerName(a.manager) : null),
      partnerId: a.partner?.id ?? null,
      client: o.firstName || (o.username ? `@${o.username}` : `id ${o.userId}`),
      names: o.names ?? null,
      status: o.status,
      paid: isPaid(o),
      url: o.slug ? `${deps.env.publicBaseUrl}/${o.slug}` : null,
    };
  });

  const designs = activeDesigns()
    .map((d) => ({ id: d.id, number: d.number, name: designName(d.id), samples: created.filter((o) => o.templateId === d.id).length, paid: paid.filter((o) => o.templateId === d.id).length }))
    .filter((x) => x.samples || x.paid)
    .sort((a, b) => b.paid - a.paid || b.samples - a.samples || a.number - b.number);

  return {
    period,
    label: r.label,
    testOrders,
    cards: {
      paid: paid.length,
      revenue: paid.reduce((n, o) => n + o.amount, 0),
      namuna: stuck.length,
      conversion: makers.size ? Math.round((payers.size / makers.size) * 100) : null,
      makers: makers.size,
      payers: payers.size,
      due: allRows.reduce((n, x) => n + x.due, 0),
    },
    orders,
    ordersTotal: listed.length,
    partners: allRows
      .filter((x) => x.partner.status !== "rejected")
      .sort((a, b) => b.paid - a.paid || b.due - a.due || a.partner.id - b.partner.id)
      .map((x) => {
        const p = x.partner;
        const m = managers.find((mm) => mm.telegramId === p.managedBy);
        const last = x.lastScanAt && x.lastScanAt > p.createdAt ? x.lastScanAt : p.createdAt;
        return {
          id: p.id,
          name: p.name,
          rate: p.ratePercent != null ? `${p.ratePercent}%` : `${p.rate.toLocaleString("ru-RU").replace(/ /g, " ")} ₸`,
          status: p.status,
          manager: m ? managerName(m) : null,
          scanned: x.scanned,
          paid: x.paid,
          earned: x.earned,
          paidOut: x.paidOut,
          due: x.due,
          onHold: x.onHold,
          sleeping: +now - +last >= SLEEP_AFTER_MS,
        };
      }),
    designs,
    funnel: {
      clients: s.users.filter((u) => inside(u.createdAt)).length,
      makers: makers.size,
      payers: payers.size,
      stuck: Object.keys(staff.n.steps)
        .map((step) => ({ step, label: staff.n.steps[step], count: stuck.filter((o) => o.status === step).length }))
        .filter((x) => x.count > 0),
    },
  };
}

/** «📤 Excel» — та же выгрузка, что в боте; файл приходит владельцу в чат с ботом */
export async function ownerExport(deps: Deps, userId: number, periodArg: unknown) {
  if (!(await isOwnerUser(deps, userId))) return { error: "forbidden" as const };
  await sendExport(deps, userId, periodArg === "y" ? "y0" : "m0");
  return { ok: true as const };
}
