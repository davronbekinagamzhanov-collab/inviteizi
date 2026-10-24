/** Команды админа: /orders, /stats, /find. Не-админу — как непонятная команда (решает роутер). */
import type { Ctx } from "./types";
import type { OrderRecord, OrderStatus } from "@/lib/domain";
import { decisionButtons } from "./orders";
import { inline, namesOf, pageUrl, price, send } from "./util";

const ALL: OrderStatus[] = ["draft", "preview", "awaiting_payment", "receipt_sent", "active", "archived", "rejected"];
const RECENT = 10;

const line = (c: Ctx, o: OrderRecord) =>
  c.tx.admin.orderLine(o.number, namesOf(o.data), c.tx.my.statuses[o.status], price(o.amount), pageUrl(c, o.slug));

export async function cmdOrders(c: Ctx) {
  const waiting = await c.deps.repo.listOrdersByStatus(["receipt_sent"]);
  if (!waiting.length) await send(c, c.tx.admin.ordersNone);
  else {
    await send(c, c.tx.admin.ordersWaiting);
    for (const o of waiting) await send(c, line(c, o), inline(decisionButtons(c.tx, o.number)));
  }
  const recent = (await c.deps.repo.listOrdersByStatus(ALL)).slice(0, RECENT);
  if (recent.length) await send(c, [c.tx.admin.ordersRecent, "", ...recent.map((o) => line(c, o))].join("\n\n"));
}

export async function cmdStats(c: Ctx) {
  const s = await c.deps.repo.stats(c.deps.now());
  const r = s.revenue;
  await send(
    c,
    c.tx.admin.stats({
      orders: s.orders,
      revenue: { today: price(r.today), week: price(r.week), month: price(r.month), total: price(r.total) },
      byStatus:
        Object.entries(s.byStatus)
          .map(([k, v]) => `${c.tx.my.statuses[k as OrderStatus]}: ${v}`)
          .join("\n") || "—",
      bySource: s.bySource.map((x) => c.tx.admin.sourceLine(x.source, x.users, x.paid)).join("\n") || "—",
    }),
  );
}

export async function cmdFind(c: Ctx, query: string) {
  if (!query.trim()) {
    await send(c, c.tx.admin.findUsage);
    return;
  }
  const found = (await c.deps.repo.findOrders(query)).slice(0, RECENT);
  if (!found.length) {
    await send(c, c.tx.admin.findNone);
    return;
  }
  for (const o of found) {
    const markup = o.status === "receipt_sent" ? inline(decisionButtons(c.tx, o.number)) : undefined;
    await send(c, line(c, o), markup);
  }
}
