import type { OrderRecord } from "./domain";

export type Period = "today" | "week" | "month" | "all";
export const PERIODS: Period[] = ["today", "week", "month", "all"];
export type MetricOrder = Pick<OrderRecord, "id" | "userId" | "status" | "occasion" | "format" | "templateId" | "music" | "amount" | "createdAt" | "paidAt" | "updatedAt">;
export type MetricUser = { id: number; username: string | null; firstName: string | null; createdAt: Date };
export type EventKind = "demo_opened" | "design_favorited" | "design_selected" | "order_created" | "payment_confirmed" | "music_selected";
export type MetricEvent = { kind: EventKind; userId: number; target: string; createdAt: Date };
export type Metric = { id: string; orders: number; paid: number; revenue: number; selected: number; demos: number; favorites: number; conversion: number };
export type AnalyticsInput = { orders: MetricOrder[]; users: MetricUser[]; events: MetricEvent[]; since: Date; music?: { id: string; titleRu: string; titleUz: string }[] };

/** Calendar days in Asia/Almaty (UTC+5); today plus the preceding 6/29 days. */
export function periodStart(period: Period, now: Date): Date {
  const midnight = Math.floor((+now + 18_000_000) / 86_400_000) * 86_400_000 - 18_000_000;
  return new Date(period === "all" ? 0 : midnight - (period === "week" ? 6 : period === "month" ? 29 : 0) * 86_400_000);
}
export const almatyDay = (d: Date) => new Date(+d + 18_000_000).toISOString().slice(0, 10);
export const isPaid = (o: MetricOrder) => o.status === "active" || o.status === "archived";

/** Financial truth is orders, never event counts. No addresses, receipts or invitation texts. */
export function summarize(input: AnalyticsInput, period: Period, now: Date, owner = false) {
  const start = periodStart(period, now);
  const inside = (d: Date) => +d >= +start && +d <= +now;
  const orders = input.orders.filter(o => inside(o.createdAt));
  const paid = input.orders.filter(o => isPaid(o) && inside(o.paidAt ?? o.updatedAt));
  const events = input.events.filter(e => inside(e.createdAt));
  const revenue = paid.reduce((sum, o) => sum + o.amount, 0);
  const lifetime = new Map<number, MetricOrder[]>();
  for (const o of input.orders.filter(isPaid)) lifetime.set(o.userId, [...(lifetime.get(o.userId) ?? []), o]);
  const buyers = new Set(paid.map(o => o.userId));
  const repeat = [...buyers].filter(id => (lifetime.get(id)?.length ?? 0) > 1).length;
  const metric = (id: string): Metric => ({ id, orders: 0, paid: 0, revenue: 0, selected: 0, demos: 0, favorites: 0, conversion: 0 });
  const designMap = new Map<string, Metric>();
  const musicMap = new Map<string, Metric>();
  const row = (map: Map<string, Metric>, id: string) => { if (!map.has(id)) map.set(id, metric(id)); return map.get(id)!; };
  for (const o of orders) { row(designMap, o.templateId).orders++; row(musicMap, o.music.kind === "list" ? o.music.musicId : o.music.kind).orders++; }
  for (const o of paid) {
    for (const r of [row(designMap, o.templateId), row(musicMap, o.music.kind === "list" ? o.music.musicId : o.music.kind)]) { r.paid++; r.revenue += o.amount; }
  }
  for (const e of events) {
    if (!["demo_opened", "design_selected", "design_favorited"].includes(e.kind)) continue;
    const r = row(designMap, e.target);
    if (e.kind === "demo_opened") r.demos++;
    if (e.kind === "design_selected") r.selected++;
    if (e.kind === "design_favorited") r.favorites++;
  }
  // Cohort: unique clients selecting in this period, who subsequently purchased this design.
  // Repeated selections do not inflate the denominator; historical sales cannot inflate it.
  for (const r of designMap.values()) {
    const selected = events.filter(e => e.kind === "design_selected" && e.target === r.id);
    const choosers = new Set(selected.map(e => e.userId));
    const converted = [...choosers].filter(id => input.orders.some(o => o.userId === id && o.templateId === r.id && isPaid(o) && +(o.paidAt ?? o.updatedAt) <= +now && selected.some(e => e.userId === id && +o.createdAt >= +e.createdAt)));
    r.conversion = choosers.size ? converted.length / choosers.size * 100 : 0;
  }
  const by = (key: "format" | "occasion") => [...new Set(input.orders.map(o => o[key]))].map(id => ({ id, orders: orders.filter(o => o[key] === id).length, paid: paid.filter(o => o[key] === id).length, revenue: paid.filter(o => o[key] === id).reduce((s, o) => s + o.amount, 0) }));
  const daily = new Map<string, number>();
  // Charts stay readable on a phone: all-time daily trend is the last 30 days.
  const trendStart = period === "all" ? periodStart("month", now) : start;
  for (let d = +trendStart; d <= +now; d += 86_400_000) daily.set(almatyDay(new Date(d)), 0);
  for (const o of paid) { const day = almatyDay(o.paidAt ?? o.updatedAt); if (daily.has(day)) daily.set(day, daily.get(day)! + o.amount); }
  const customers = owner ? [...buyers].map(id => {
    const os = lifetime.get(id)!;
    const u = input.users.find(u => u.id === id);
    const categories = [...new Set(os.map(o => o.occasion))].sort((a, b) => os.filter(o => o.occasion === b).length - os.filter(o => o.occasion === a).length);
    return { name: u?.username ? `@${u.username}` : u?.firstName ?? "—", paid: os.length, total: os.reduce((s, o) => s + o.amount, 0), last: new Date(Math.max(...os.map(o => +(o.paidAt ?? o.updatedAt)))), categories };
  }).sort((a, b) => b.paid - a.paid || b.total - a.total).slice(0, 10) : undefined;
  const trackedOrders = orders.filter(o => +o.createdAt >= +input.since);
  return {
    period, since: input.since, clients: input.users.length, newUsers: input.users.filter(u => inside(u.createdAt)).length,
    orders: orders.length, paid: paid.length, revenue, average: paid.length ? revenue / paid.length : 0,
    unpaid: orders.filter(o => !isPaid(o)).length, waiting: orders.filter(o => o.status === "receipt_sent").length,
    rejected: orders.filter(o => o.status === "rejected").length, buyers: buyers.size, repeat, newBuyers: buyers.size - repeat,
    formats: by("format"), categories: by("occasion"),
    designs: [...designMap.values()].sort((a, b) => b.paid - a.paid || b.selected - a.selected),
    music: [...musicMap.values()].sort((a, b) => b.orders - a.orders).map(m => ({ ...m, titleRu: input.music?.find(t => t.id === m.id)?.titleRu, titleUz: input.music?.find(t => t.id === m.id)?.titleUz })),
    ownMusicClients: new Set(orders.filter(o => o.music.kind === "own").map(o => o.userId)).size,
    musicCategories: by("occasion").map(c => ({ id: c.id, list: orders.filter(o => o.occasion === c.id && o.music.kind === "list").length, own: orders.filter(o => o.occasion === c.id && o.music.kind === "own").length, none: orders.filter(o => o.occasion === c.id && o.music.kind === "none").length })),
    daily: [...daily].map(([id, value]) => ({ id, value })),
    funnel: { demos: events.filter(e => e.kind === "demo_opened").length, selections: events.filter(e => e.kind === "design_selected").length, orders: trackedOrders.length, paid: trackedOrders.filter(isPaid).length },
    customers,
  };
}
export type Analytics = ReturnType<typeof summarize>;
