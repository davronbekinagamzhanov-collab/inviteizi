import type { OrderRecord } from "./domain";

export type PresetPeriod = "today" | "yesterday" | "week" | "month" | "all";
export type Period = PresetPeriod | `date=${string}`;
export const PERIODS: PresetPeriod[] = ["today", "yesterday", "week", "month", "all"];
export type MetricOrder = Pick<OrderRecord, "id" | "userId" | "status" | "occasion" | "format" | "templateId" | "music" | "amount" | "createdAt" | "paidAt" | "updatedAt"> & { number?: number };
export type MetricUser = { id: number; username: string | null; firstName: string | null; createdAt: Date };
export type EventKind = "demo_opened" | "design_favorited" | "design_selected" | "order_created" | "payment_confirmed" | "music_selected";
export type MetricEvent = { kind: EventKind; userId: number; target: string; createdAt: Date };
export type Metric = { id: string; orders: number; paid: number; revenue: number; selected: number; demos: number; favorites: number; conversion: number };
export type AnalyticsInput = { orders: MetricOrder[]; users: MetricUser[]; events: MetricEvent[]; since: Date; music?: { id: string; titleRu: string; titleUz: string }[] };

/** Asia/Almaty calendar dates, strict ISO input, inclusive selected end day. */
export const almatyDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Almaty", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
const shiftDay = (day: string, offset: number) => new Date(Date.parse(`${day}T00:00:00Z`) + offset * 86_400_000).toISOString().slice(0,10);
const dayStart = (day: string) => {
  const utc = Date.parse(`${day}T00:00:00Z`);
  if (!Number.isFinite(utc)) return new Date(NaN);
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Almaty", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(utc));
  const hour = Number(parts.find(p=>p.type==="hour")!.value), minute = Number(parts.find(p=>p.type==="minute")!.value);
  // Almaty has positive offsets; using IANA data also handles its 2024 UTC+6 → UTC+5 change.
  return new Date(utc - (hour*60+minute)*60_000);
};
function validDay(day: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isFinite(+dayStart(day)) && almatyDay(dayStart(day)) === day;
}
export function parsePeriod(value: string): Period | undefined {
  if (PERIODS.includes(value as PresetPeriod)) return value as PresetPeriod;
  const match = /^date=(\d{4}-\d{2}-\d{2})(?:\.\.(\d{4}-\d{2}-\d{2}))?$/.exec(value);
  if (!match || !validDay(match[1]) || (match[2] && (!validDay(match[2]) || match[2] < match[1]))) return;
  return value as Period;
}
export function periodBounds(period: Period, now: Date) {
  if (!parsePeriod(period)) throw new Error("Invalid analytics period");
  const today = almatyDay(now);
  const midnight = +dayStart(today);
  if (period.startsWith("date=")) {
    const [from, to = from] = period.slice(5).split("..");
    return { start: dayStart(from), end: new Date(Math.min(+dayStart(shiftDay(to,1)), +now + 1)) };
  }
  return {
    start: new Date(period === "all" ? 0 : +dayStart(shiftDay(today, -(period === "yesterday" ? 1 : period === "week" ? 6 : period === "month" ? 29 : 0)))),
    end: new Date(period === "yesterday" ? midnight : +now + 1),
  };
}
export const periodStart = (period: Period, now: Date) => periodBounds(period, now).start;
export const almatyDateTime = (d: Date) => d.toLocaleString("ru-RU", { timeZone: "Asia/Almaty", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
export const isPaid = (o: MetricOrder) => o.status === "active" || o.status === "archived";

/** Financial truth is orders, never event counts. No addresses, receipts or invitation texts. */
export function summarize(input: AnalyticsInput, period: Period, now: Date, owner = false) {
  const { start, end } = periodBounds(period, now);
  const inside = (d: Date) => +d >= +start && +d < +end;
  const metric = (id: string): Metric => ({ id, orders: 0, paid: 0, revenue: 0, selected: 0, demos: 0, favorites: 0, conversion: 0 });
  const designMap = new Map<string, Metric>();
  const musicMap = new Map<string, Metric>();
  const row = (map: Map<string, Metric>, id: string) => { if (!map.has(id)) map.set(id, metric(id)); return map.get(id)!; };
  const daily = new Map<string, number>();
  const trendStart = period === "all" ? periodStart("month", now) : start;
  for (let d = Math.max(+trendStart, +periodStart("month", end < now ? new Date(+end - 1) : now)); d < +end; d = +dayStart(shiftDay(almatyDay(new Date(d)),1))) daily.set(almatyDay(new Date(d)), 0);
  const groups = { formats: new Map<string, Metric>(), categories: new Map<string, Metric>() };
  for (const id of ["simple", "scroll", "animated"]) row(groups.formats, id);
  for (const id of ["nikoh", "nahorgi", "sunnat", "yubiley"]) row(groups.categories, id);
  const details: { number?: number; templateId: string; format: MetricOrder["format"]; status: MetricOrder["status"]; amount: number; createdAt: Date; paidAt: Date | null }[] = [];
  let unknownPaidDates = 0;
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
    const paidDate = o.paidAt;
    const confirmed = isPaid(o) && (!paidDate || +paidDate <= +now);
    if (confirmed && !paidDate) unknownPaidDates++;
    if (inside(o.createdAt) || (confirmed && (paidDate ? inside(paidDate) : period === "all"))) details.push({ number: o.number, templateId: o.templateId, format: o.format, status: o.status, amount: o.amount, createdAt: o.createdAt, paidAt: paidDate });
    const musicId = o.music.kind === "list" ? o.music.musicId : o.music.kind;
    if (inside(o.createdAt)) {
      orders++; row(designMap,o.templateId).orders++; row(musicMap,musicId).orders++; format.orders++; category.orders++;
      if (!isPaid(o)) unpaid++;
      if (o.status === "receipt_sent") waiting++;
      if (o.status === "rejected") rejected++;
      if (o.music.kind === "own") ownClients.add(o.userId);
      const mc = musicCategories.get(o.occasion) ?? { id:o.occasion, list:0, own:0, none:0 };
      mc[o.music.kind]++; musicCategories.set(o.occasion, mc);
      if (+o.createdAt >= +input.since) { funnel.orders++; if (confirmed && paidDate) funnel.paid++; }
    }
    if (!confirmed) continue;
    const customer = lifetime.get(o.userId) ?? { paid:0, total:0, last:0, categories:new Map() };
    customer.paid++; customer.total += o.amount; customer.last = Math.max(customer.last,+(paidDate ?? new Date(0)));
    customer.categories.set(o.occasion,(customer.categories.get(o.occasion) ?? 0)+1); lifetime.set(o.userId,customer);
    const purchased = latestPurchasedOrder.get(o.templateId) ?? new Map<number,number>();
    purchased.set(o.userId,Math.max(purchased.get(o.userId) ?? 0,+o.createdAt)); latestPurchasedOrder.set(o.templateId,purchased);
    if (paidDate ? !inside(paidDate) : period !== "all") continue;
    paid++; revenue += o.amount; buyers.add(o.userId);
    for (const r of [row(designMap,o.templateId),row(musicMap,musicId),format,category]) { r.paid++; r.revenue += o.amount; }
    if (paidDate) { const day = almatyDay(paidDate); if (daily.has(day)) daily.set(day,daily.get(day)!+o.amount); }
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
    return { name:user?.username ? `@${user.username}` : user?.firstName ?? "—", paid:customer.paid, total:customer.total, last:customer.last ? new Date(customer.last) : null, categories:[...customer.categories].sort((a,b)=>b[1]-a[1]).map(([id])=>id) };
  }).sort((a,b)=>b.paid-a.paid||b.total-a.total).slice(0,10) : undefined;
  const titles = new Map(input.music?.map(m=>[m.id,m]) ?? []);
  const totalPaid = paid;
  const groupRows = (map: Map<string,Metric>) => [...map.values()].map(({id,orders,paid,revenue})=>({id,orders,paid,revenue,share: paid ? paid / totalPaid * 100 : 0}));
  return {
    period, start, end, unknownPaidDates, details: details.sort((a,b) => +(b.paidAt ?? b.createdAt) - +(a.paidAt ?? a.createdAt)), since: input.since, clients: input.users.length, newUsers: input.users.filter(u => inside(u.createdAt)).length,
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
