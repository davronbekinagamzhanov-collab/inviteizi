import type { Ctx } from "./types";
import { inline, send, price, designName } from "./util";
import { PERIODS, parsePeriod, almatyDateTime, type PresetPeriod } from "@/lib/analytics";
import { activeDesigns, designs, type Format } from "@/templates/registry";
import { renderChart, type ChartPoint } from "@/lib/chart";
import { visualDescription } from "@/texts/design-visuals";

const VIEWS = ["general", "designs", "music", "customers", "revenue", "conversion", "orders"] as const;
type View = typeof VIEWS[number];
const date = almatyDateTime;
export function dashboardPeriod(args: string) {
  const parts = args.trim().split(/\s+/);
  return !args.trim() ? "all" : parts.length <= 2 ? `date=${parts.join("..")}` : "invalid";
}

/** Each callback rechecks access; no report is ever posted into a group. */
export async function dashboard(c: Ctx, view = "general", period = "all", page = 0) {
  const tx = c.tx.dashboard;
  const owner = await c.deps.repo.isOwner(c.user.id);
  if (c.chatId !== c.user.id || !(await c.deps.repo.canAnalyze(c.user.id)) || (view === "customers" && !owner)) {
    await send(c, tx.denied); return;
  }
  if (view === "dates") { await send(c, tx.dateHelp); return; }
  const p = parsePeriod(period);
  if (!p) { await send(c, `${tx.invalidDates}\n${tx.dateHelp}`); return; }
  if (!VIEWS.includes(view as View) || !Number.isSafeInteger(page) || page < 0) return;
  const v = view as View;
  const nav = inline([
    ...VIEWS.filter(k => k !== "customers" || owner).map(k => [{ text: tx[k], data: `dash:${k}:${p}` }]),
    ...[PERIODS.slice(0,2), PERIODS.slice(2,4), PERIODS.slice(4)].map(row => row.map(k => ({ text: tx.periods[k], data: `dash:${v}:${k}` }))),
    [{ text: tx.dateFilter, data: "dash:dates:all" }],
  ]);
  const s = await c.deps.repo.analytics(c.user.id, p, c.deps.now(), v === "customers");
  const periodLabel = p.startsWith("date=") ? p.slice(5).replace("..", " — ") : tx.periods[p as PresetPeriod];
  const header = `${tx[v]} · ${periodLabel} · Asia/Almaty`;
  const designLabel = (id: string, savedFormat?: Format) => {
    const d = designs.find(d => d.id === id);
    const format = savedFormat ?? d?.format;
    return d && format ? `№${d.number} — ${designName(id)} — ${format[0].toUpperCase()+format.slice(1)} — ${visualDescription(id, c.lang)}` : designName(id);
  };
  // Telegram limits text to 4096 characters. Keep each report block readable on phones.
  const report = async (body: string) => {
    let chunk = "";
    for (const line of body.split("\n")) {
      if (chunk.length + line.length > 3500) { await send(c, chunk); chunk = ""; }
      chunk += line + "\n";
    }
    if (chunk) await send(c, chunk, nav);
  };
  if (v === "orders") {
    const rows = s.details.slice(page * 10, (page + 1) * 10);
    await report(`${header}\n${tx.detailsNote}\n\n${rows.map(o => `${o.number == null ? "—" : `#${o.number}`} · ${designLabel(o.templateId,o.format)}\n${c.tx.my.statuses[o.status]} · ${price(o.amount)}\n${tx.createdAt}: ${date(o.createdAt)}\n${o.status === "active" || o.status === "archived" ? `${tx.paidAt}: ${o.paidAt ? date(o.paidAt) : tx.noPaidDate}` : ""}`).join("\n\n") || tx.empty}`);
    if (page || (page + 1) * 10 < s.details.length) await send(c, `${page + 1} / ${Math.max(1, Math.ceil(s.details.length / 10))}`, inline([[
      ...(page ? [{ text: tx.previous, data: `dash:orders:${p}:${page - 1}` }] : []),
      ...((page + 1) * 10 < s.details.length ? [{ text: tx.next, data: `dash:orders:${p}:${page + 1}` }] : []),
    ]]));
    return;
  }
  const note = `${tx.tracking} ${date(s.since)}. ${tx.cohort}`;
  const chart = async (title: string, points: ChartPoint[], kind: "bars" | "line" = "bars") => {
    if (!points.some(p => p.value > 0)) return;
    const image = await renderChart(title, points, tx.empty, kind);
    await c.deps.tg.sendPhoto(c.chatId, image, { caption: `${title} · ${periodLabel}` });
  };
  if (v === "general") {
    const keys = ["clients", "newUsers", "orders", "paid", "revenue", "average", "unpaid", "waiting", "rejected", "buyers", "repeat"] as const;
    await report(`${header}\n\n${keys.map(k => `${tx.labels[k]}: ${k === "revenue" || k === "average" ? price(Math.round(s[k])) : s[k]}`).join("\n")}\n\n${tx.categories} · ${tx.salesColumns}\n${s.categories.map(f => `${tx.salesCategories[f.id as "nikoh"]}: ${f.paid} · ${price(f.revenue)}`).join("\n")}\n\n${tx.formats} · ${tx.salesColumns} · ${tx.share}\n${s.formats.map(f => `${f.id[0].toUpperCase()+f.id.slice(1)} / ${c.tx.format.names[f.id as Format]}: ${f.paid} · ${price(f.revenue)} · ${f.share.toFixed(1)}%`).join("\n")}\n\n${tx.financialNote}\n${tx.unknownDates}: ${s.unknownPaidDates}\n\n${tx.activity}\n${tx.demos}: ${s.funnel.demos}\n${tx.favorites}: ${s.designs.reduce((n,d) => n+d.favorites,0)}\n${tx.selections}: ${s.funnel.selections}\n${note}`);
    await chart(tx.formats, s.formats.map(f => ({ label: c.tx.format.names[f.id as Format], value: f.paid })));
    await chart(tx.categories, s.categories.map(f => ({ label: c.tx.category[f.id as "nikoh"], value: f.paid })));
  } else if (v === "designs") {
    // Display the whole active catalog, including zero-demand designs and historical IDs.
    const rows = [...s.designs, ...activeDesigns().filter(d => !s.designs.some(m => m.id === d.id)).map(d => ({ id: d.id, orders: 0, paid: 0, revenue: 0, demos: 0, favorites: 0, selected: 0, conversion: 0 }))]
      .sort((a,b) => b.paid-a.paid || b.revenue-a.revenue || (designs.find(d=>d.id===a.id)?.number ?? Infinity)-(designs.find(d=>d.id===b.id)?.number ?? Infinity));
    await report(`${header}\n${note}\n${tx.designPageNote}\n\n${rows.slice(page*10,(page+1)*10).map(r => `${designLabel(r.id)}\n${tx.labels.paid}: ${r.paid} · ${tx.labels.revenue}: ${price(r.revenue)}\n${tx.labels.orders}: ${r.orders}\n${tx.demos}: ${r.demos} · ${tx.favorites}: ${r.favorites} · ${tx.selections}: ${r.selected}\n${tx.designConversion}: ${r.conversion.toFixed(1)}%`).join("\n\n") || tx.empty}`);
    if (page || (page+1)*10 < rows.length) await send(c, `${page+1} / ${Math.max(1,Math.ceil(rows.length/10))}`, inline([[
      ...(page ? [{text:tx.previous,data:`dash:designs:${p}:${page-1}`}] : []),
      ...((page+1)*10 < rows.length ? [{text:tx.next,data:`dash:designs:${p}:${page+1}`}] : []),
    ]]));
    await chart(tx.purchased, rows.slice(0,10).map(m => ({label:`№${designs.find(d=>d.id===m.id)?.number ?? m.id}`,value:m.paid})));
  } else if (v === "music") {
    const label = (m: typeof s.music[number]) => (m.id === "none" ? tx.none : m.id === "own" ? tx.own : (c.lang === "ru" ? m.titleRu : m.titleUz) ?? m.id).slice(0,80);
    const tracks = s.music.filter(m => m.id !== "none" && m.id !== "own").slice(0,10);
    const list = s.music.filter(m => m.id !== "none" && m.id !== "own").reduce((n,m) => n+m.orders,0);
    const own = s.music.find(m => m.id === "own")?.orders ?? 0;
    const share = (n: number) => list + own ? `${(n/(list+own)*100).toFixed(1)}%` : "—";
    await send(c, `${header}\n\n${s.music.slice(0,12).map(m => `${label(m)}: ${tx.labels.orders} ${m.orders} · ${tx.labels.paid} ${m.paid} · ${price(m.revenue)}`).join("\n") || tx.empty}\n${tx.ownClients}: ${s.ownMusicClients}\n${tx.musicShare}: ${share(list)} / ${share(own)}\n\n${tx.musicCategories}\n${s.musicCategories.map(m => `${c.tx.category[m.id as "nikoh"]}: ${m.list} / ${m.own} / ${m.none}`).join("\n")}`, nav);
    await chart(tx.music, tracks.map(m => ({ label: label(m), value: m.orders })));
  } else if (v === "customers") {
    await send(c, `${header}\n${tx.lifetime}\n\n${s.customers?.map((u,i) => `${i+1}. ${u.name.slice(0,80)} · ${u.paid} · ${price(u.total)}\n${tx.lastPurchase}: ${u.last ? date(u.last) : tx.noPaidDate}\n${tx.favoriteCategories}: ${u.categories.map(k => c.tx.category[k]).join(", ")}`).join("\n\n") || tx.empty}`, nav);
    await chart(tx.customers, [{ label: tx.labels.newBuyers, value: s.newBuyers }, { label: tx.labels.repeat, value: s.repeat }]);
  } else if (v === "revenue") {
    await send(c, `${header}\n${price(s.revenue)}\n${tx.trendNote}`, nav);
    await chart(tx.daily, s.daily.map(d => ({ label: d.id.slice(5), value: d.value })), "line");
  } else {
    await send(c, `${header}\n${note}`, nav);
    await chart(tx.conversion, [{ label: tx.demos, value: s.funnel.demos }, { label: tx.selections, value: s.funnel.selections }, { label: tx.labels.orders, value: s.funnel.orders }, { label: tx.labels.paid, value: s.funnel.paid }]);
  }
}
