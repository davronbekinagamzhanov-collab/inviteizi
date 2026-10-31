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
export const isPaid = (o: Pick<MetricOrder, "status">) => o.status === "active" || o.status === "archived";

/** Financial truth is orders, never event counts. No addresses, receipts or invitation texts. */
export function summarize(input: AnalyticsInput, period: Period, now: Date, owner = false) {
  const start = periodStart(period, now);
  const inside = (d: Date) => +d >= +start && +d <= +now;
  const metric = (id: string): Metric => ({ id, orders: 0, paid: 0, revenue: 0, selected: 0, demos: 0, favorites: 0, conversion: 0 });
  const designMap = new Map<string, Metric>();
  const musicMap = new Map<string, Metric>();
  const row = (map: Map<string, Metric>, id: string) => { if (!map.has(id)) map.set(id, metric(id)); return map.get(id)!; };
  const daily = new Map<string, number>();
  const trendStart = period === "all" ? periodStart("month", now) : start;
  for (let d = +trendStart; d <= +now; d += 86_400_000) daily.set(almatyDay(new Date(d)), 0);
  const groups = { formats: new Map<string, Metric>(), categories: new Map<string, Metric>() };
  const musicCategories = new Map<string, { id: string; list: number; own: number; none: number }>();
  const lifetime = new Map<number, { paid: number; total: number; last: number; categories: Map<OrderRecord["occasion"], number> }>();
  const latestPurchasedOrder = new Map<string, Map<number, number>>();
  const selectedClients = new Map<string, Map<number, number>>();
  const buyers = new Set<number>(), ownClients = new Set<number>();
  let orders = 0, paid = 0, revenue = 0, unpaid = 0, waiting = 0, rejected = 0;
  const funnel = { demos: 0, selections: 0, orders: 0, paid: 0 };

  // Linear passes: no array copy per purchase or scan of all orders for each customer/event.
  for (const o of input.orders) {
    if (+o.createdAt > +now) continue;
    const format = row(groups.formats, o.format), category = row(groups.categories, o.occasion);
    const paidDate = o.paidAt ?? o.updatedAt;
    const confirmed = isPaid(o) && +paidDate <= +now;
    const musicId = o.music.kind === "list" ? o.music.musicId : o.music.kind;
    if (inside(o.createdAt)) {
      orders++; row(designMap,o.templateId).orders++; row(musicMap,musicId).orders++; format.orders++; category.orders++;
      if (!isPaid(o)) unpaid++;
      if (o.status === "receipt_sent") waiting++;
      if (o.status === "rejected") rejected++;
      if (o.music.kind === "own") ownClients.add(o.userId);
      const mc = musicCategories.get(o.occasion) ?? { id:o.occasion, list:0, own:0, none:0 };
      mc[o.music.kind]++; musicCategories.set(o.occasion, mc);
      if (+o.createdAt >= +input.since) { funnel.orders++; if (confirmed) funnel.paid++; }
    }
    if (!confirmed) continue;
    const customer = lifetime.get(o.userId) ?? { paid:0, total:0, last:0, categories:new Map() };
    customer.paid++; customer.total += o.amount; customer.last = Math.max(customer.last,+paidDate);
    customer.categories.set(o.occasion,(customer.categories.get(o.occasion) ?? 0)+1); lifetime.set(o.userId,customer);
    const purchased = latestPurchasedOrder.get(o.templateId) ?? new Map<number,number>();
    purchased.set(o.userId,Math.max(purchased.get(o.userId) ?? 0,+o.createdAt)); latestPurchasedOrder.set(o.templateId,purchased);
    if (!inside(paidDate)) continue;
    paid++; revenue += o.amount; buyers.add(o.userId);
    for (const r of [row(designMap,o.templateId),row(musicMap,musicId),format,category]) { r.paid++; r.revenue += o.amount; }
    const day = almatyDay(paidDate); if (daily.has(day)) daily.set(day,daily.get(day)!+o.amount);
  }
  for (const e of input.events) {
    if (!inside(e.createdAt) || +e.createdAt < +input.since) continue;
    if (e.kind !== "demo_opened" && e.kind !== "design_selected" && e.kind !== "design_favorited") continue;
    const r = row(designMap,e.target);
    if (e.kind === "demo_opened") { r.demos++; funnel.demos++; }
    if (e.kind === "design_favorited") r.favorites++;
    if (e.kind === "design_selected") {
      r.selected++; funnel.selections++;
      const clients = selectedClients.get(e.target) ?? new Map<number,number>();
      clients.set(e.userId,Math.min(clients.get(e.userId) ?? Infinity,+e.createdAt)); selectedClients.set(e.target,clients);
    }
  }
  for (const [id,clients] of selectedClients) {
    const purchased = latestPurchasedOrder.get(id);
    let converted=0;
    for (const [user,date] of clients) if ((purchased?.get(user) ?? -Infinity) >= date) converted++;
    row(designMap,id).conversion=converted/clients.size*100;
  }
  const repeat = [...buyers].filter(id => lifetime.get(id)!.paid > 1).length;
  const users = new Map(input.users.map(u => [u.id,u]));
  const customers = owner ? [...buyers].map(id => {
    const customer=lifetime.get(id)!, user=users.get(id);
    return { name:user?.username ? `@${user.username}` : user?.firstName ?? "—", paid:customer.paid, total:customer.total, last:new Date(customer.last), categories:[...customer.categories].sort((a,b)=>b[1]-a[1]).map(([id])=>id) };
  }).sort((a,b)=>b.paid-a.paid||b.total-a.total).slice(0,10) : undefined;
  const titles = new Map(input.music?.map(m=>[m.id,m]) ?? []);
  const groupRows = (map: Map<string,Metric>) => [...map.values()].map(({id,orders,paid,revenue})=>({id,orders,paid,revenue}));
  return {
    period, since: input.since, clients: input.users.length, newUsers: input.users.filter(u => inside(u.createdAt)).length,
    orders, paid, revenue, average: paid ? revenue / paid : 0,
    unpaid, waiting, rejected, buyers: buyers.size, repeat, newBuyers: buyers.size - repeat,
    formats: groupRows(groups.formats), categories: groupRows(groups.categories),
    designs: [...designMap.values()].sort((a, b) => b.paid - a.paid || b.selected - a.selected),
    music: [...musicMap.values()].sort((a,b)=>b.orders-a.orders).map(m=>({...m,titleRu:titles.get(m.id)?.titleRu,titleUz:titles.get(m.id)?.titleUz})),
    ownMusicClients: ownClients.size,
    musicCategories: [...musicCategories.values()],
    daily: [...daily].map(([id, value]) => ({ id, value })),
    funnel,
    customers,
  };
}
export type Analytics = ReturnType<typeof summarize>;
