import type { Ctx } from "./types";
import { inline, send, price, designName } from "./util";
import { PERIODS, type Period, type Metric } from "@/lib/analytics";
import { activeDesigns, designs } from "@/templates/registry";
import { renderChart, type ChartPoint } from "@/lib/chart";
import { cmdOrders } from "./admin";

const VIEWS = ["general", "designs", "music", "customers", "revenue", "conversion", "orders"] as const;
type View = typeof VIEWS[number];
const date = (d: Date) => d.toLocaleDateString("ru-RU", { timeZone: "Asia/Almaty" });

/** Each callback rechecks access; no report is ever posted into a group. */
export async function dashboard(c: Ctx, view = "general", period = "all") {
  const tx = c.tx.dashboard;
  const owner = await c.deps.repo.isOwner(c.user.id);
  if (c.chatId !== c.user.id || !(await c.deps.repo.canAnalyze(c.user.id)) || (view === "customers" && !owner)) {
    await send(c, tx.denied); return;
  }
  if (!VIEWS.includes(view as View) || !PERIODS.includes(period as Period)) return;
  const v = view as View;
  const p = period as Period;
  const nav = inline([
    ...VIEWS.filter(k => k !== "customers" || owner).map(k => [{ text: tx[k], data: `dash:${k}:${p}` }]),
    PERIODS.map(k => ({ text: tx.periods[k], data: `dash:${v}:${k}` })),
  ]);
  if (v === "orders") {
    if (await c.deps.repo.isAdmin(c.user.id)) await cmdOrders(c);
    await send(c, tx.title, nav); return;
  }
  const s = await c.deps.repo.analytics(c.user.id, p, c.deps.now(), v === "customers");
  const header = `${tx[v]} · ${tx.periods[p]} · Asia/Almaty`;
  const note = `${tx.tracking} ${date(s.since)}. ${tx.cohort}`;
  const chart = async (title: string, points: ChartPoint[], kind: "bars" | "line" = "bars") => {
    const image = await renderChart(title, points, tx.empty, kind);
    await c.deps.tg.sendPhoto(c.chatId, image, { caption: `${title} · ${tx.periods[p]}` });
  };
  const top = (items: Metric[], key: "paid" | "revenue" | "demos" | "selected", title: string) => `${title}\n${items.slice(0,10).map((m,i) => `${i+1}. ${designName(m.id)}: ${key === "revenue" ? price(m[key]) : m[key]}`).join("\n") || tx.empty}`;
  if (v === "general") {
    const keys = ["clients", "newUsers", "orders", "paid", "revenue", "average", "unpaid", "waiting", "rejected", "buyers", "repeat"] as const;
    await send(c, `${header}\n\n${keys.map(k => `${tx.labels[k]}: ${k === "revenue" || k === "average" ? price(Math.round(s[k])) : s[k]}`).join("\n")}\n\n${s.formats.map(f => `${c.tx.format.names[f.id as "simple" | "animated"]}: ${f.paid} · ${price(f.revenue)}`).join("\n")}`, nav);
    await chart(tx.formats, s.formats.map(f => ({ label: c.tx.format.names[f.id as "simple" | "animated"], value: f.paid })));
    await chart(tx.categories, s.categories.map(f => ({ label: c.tx.category[f.id as "nikoh"], value: f.paid })));
  } else if (v === "designs") {
    if (!s.designs.length) {
      await send(c, `${header}\n${note}\n\n${tx.empty}`, nav);
      await chart(tx.designs, []); return;
    }
    // Include zero-demand designs; no synthetic historical views.
    const rows = [...s.designs, ...activeDesigns().filter(d => !s.designs.some(m => m.id === d.id)).map(d => ({ id: d.id, orders: 0, paid: 0, revenue: 0, demos: 0, favorites: 0, selected: 0, conversion: 0 }))];
    const sorted = (key: "paid" | "revenue" | "demos" | "selected", asc = false) => [...rows].sort((a,b) => (a[key]-b[key]) * (asc ? 1 : -1));
    await send(c, `${header}\n${note}\n\n${top(sorted("demos"), "demos", tx.viewed)}\n\n${top(sorted("paid"), "paid", tx.purchased)}\n\n${top(sorted("revenue"), "revenue", tx.profitable)}\n\n${top(sorted("selected", true), "selected", tx.unpopular)}`, nav);
    for (const format of ["animated", "simple"] as const) await send(c, top(sorted("paid").filter(m => designs.find(d => d.id === m.id)?.format === format), "paid", c.tx.format.names[format]));
    for (const r of sorted("selected").slice(0,10)) await send(c, `${designName(r.id)}: ${tx.demos} ${r.demos} · ${tx.favorites} ${r.favorites} · ${tx.selections} ${r.selected} · ${tx.labels.orders} ${r.orders} · ${tx.labels.paid} ${r.paid} · ${price(r.revenue)} · ${r.conversion.toFixed(1)}%`);
    await chart(tx.designs, sorted("paid").slice(0,10).map(m => ({ label: designName(m.id), value: m.paid })));
  } else if (v === "music") {
    const label = (m: typeof s.music[number]) => (m.id === "none" ? tx.none : m.id === "own" ? tx.own : (c.lang === "ru" ? m.titleRu : m.titleUz) ?? m.id).slice(0,80);
    const tracks = s.music.filter(m => m.id !== "none" && m.id !== "own").slice(0,10);
    const list = s.music.filter(m => m.id !== "none" && m.id !== "own").reduce((n,m) => n+m.orders,0);
    const own = s.music.find(m => m.id === "own")?.orders ?? 0;
    const share = (n: number) => list + own ? `${(n/(list+own)*100).toFixed(1)}%` : "—";
    await send(c, `${header}\n\n${s.music.slice(0,12).map(m => `${label(m)}: ${m.orders} / ${tx.labels.paid} ${m.paid}`).join("\n") || tx.empty}\n${tx.ownClients}: ${s.ownMusicClients}\n${tx.musicShare}: ${share(list)} / ${share(own)}\n\n${tx.musicCategories}\n${s.musicCategories.map(m => `${c.tx.category[m.id as "nikoh"]}: ${m.list} / ${m.own} / ${m.none}`).join("\n")}`, nav);
    await chart(tx.music, tracks.map(m => ({ label: label(m), value: m.orders })));
  } else if (v === "customers") {
    await send(c, `${header}\n${tx.lifetime}\n\n${s.customers?.map((u,i) => `${i+1}. ${u.name.slice(0,80)} · ${u.paid} · ${price(u.total)}\n${tx.lastPurchase}: ${date(u.last)}\n${tx.favoriteCategories}: ${u.categories.map(k => c.tx.category[k]).join(", ")}`).join("\n\n") || tx.empty}`, nav);
    await chart(tx.customers, [{ label: tx.labels.newBuyers, value: s.newBuyers }, { label: tx.labels.repeat, value: s.repeat }]);
  } else if (v === "revenue") {
    await send(c, `${header}\n${price(s.revenue)}\n${tx.dailyNote}`, nav);
    await chart(tx.daily, s.daily.map(d => ({ label: d.id.slice(5), value: d.value })), "line");
  } else {
    await send(c, `${header}\n${note}`, nav);
    await chart(tx.conversion, [{ label: tx.demos, value: s.funnel.demos }, { label: tx.selections, value: s.funnel.selections }, { label: tx.labels.orders, value: s.funnel.orders }, { label: tx.labels.paid, value: s.funnel.paid }]);
  }
}
