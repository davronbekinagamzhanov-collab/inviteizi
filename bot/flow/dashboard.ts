/**
 * Панель владельца: одно сообщение, которое меняется кнопками.
 * Права проверяются при каждом нажатии; в группах панель не открывается.
 * Формат кнопок: dash:<раздел>:<период>[:<a>[:<b>]]
 */
import type { Ctx, Result } from "./types";
import type { InlineButton } from "../tg";
import { demoUrl, designName, editOrSend, inline, price, send } from "./util";
import { PERIODS, type Period } from "@/lib/analytics";
import { designTypes, musicStats, orderPage, overview, partnerRows, revenueBreakdown, topDesigns, type PanelSnapshot } from "@/lib/owner-panel";
import { DESIGN_STYLES, FORMATS, PRICES, type DesignStyle, type Format } from "@/templates/registry";
import { partnerDetail, partnerList } from "./partners";

const VIEWS = ["general", "revenue", "orders", "designs", "partners", "music"] as const;
type View = (typeof VIEWS)[number];

type Screen = { text: string; rows: InlineButton[][] };

export const canUsePanel = async (c: Ctx) => c.chatId === c.user.id && (await c.deps.repo.isAdmin(c.user.id));

/** 31.10 23:10 по времени Алматы */
const stamp = (d: Date) => {
  const iso = new Date(+d + 5 * 60 * 60_000).toISOString();
  return `${iso.slice(8, 10)}.${iso.slice(5, 7)} ${iso.slice(11, 16)}`;
};

function general(c: Ctx, s: PanelSnapshot, p: Period, now: Date): Screen {
  const a = overview(s, p, now);
  const l = c.tx.panel.labels;
  return {
    text: [`${l.clients}: ${a.clients}`, `${l.created}: ${a.created}`, `${l.paid}: ${a.paid}`, `${l.revenue}: ${price(a.revenue)}`, `${l.average}: ${price(a.average)}`, `${l.waiting}: ${a.waiting}`].join("\n"),
    rows: [],
  };
}

function revenue(c: Ctx, s: PanelSnapshot, p: Period, now: Date): Screen {
  const r = revenueBreakdown(s, p, now);
  const l = c.tx.panel.labels;
  const line = (name: string, x: { paid: number; revenue: number }) => `${name}: ${x.paid} · ${price(x.revenue)}`;
  return {
    text: [
      `${l.revenue}: ${price(r.revenue)}`,
      "",
      c.tx.panel.byFormat,
      ...r.formats.map((f) => line(`${c.tx.format.names[f.id]} (${price(PRICES[f.id])})`, f)),
      "",
      c.tx.panel.byOccasion,
      ...r.occasions.map((o) => line(c.tx.category[o.id], o)),
    ].join("\n"),
    rows: [],
  };
}

function orders(c: Ctx, s: PanelSnapshot, p: Period, now: Date, pageArg: string, filter: string): Screen {
  const paidOnly = filter === "p";
  const page = orderPage(s, p, now, { paidOnly, page: Number(pageArg) || 0 });
  const lines = page.rows.map((o) => {
    const who = (o.username ? `@${o.username}` : o.firstName ?? "—").slice(0, 34);
    return `#${o.number} · ${who} · ${stamp(o.createdAt)}\n${c.tx.category[o.occasion]} · ${c.tx.format.names[o.format]}\n${c.tx.my.statuses[o.status]} · ${price(o.amount)}`;
  });
  const to = (n: number, f = filter) => `dash:orders:${p}:${n}:${f}`;
  const rows: InlineButton[][] = [];
  if (page.pages > 1) {
    rows.push([
      { text: "◀", data: to(Math.max(0, page.page - 1)) },
      { text: `${page.page + 1}/${page.pages}`, data: to(page.page) },
      { text: "▶", data: to(Math.min(page.pages - 1, page.page + 1)) },
    ]);
  }
  rows.push([{ text: paidOnly ? c.tx.panel.showAll : c.tx.panel.showPaid, data: to(0, paidOnly ? "" : "p") }]);
  return { text: lines.join("\n\n") || c.tx.panel.empty, rows };
}

function designs(c: Ctx, s: PanelSnapshot, p: Period, now: Date, formatArg: string, styleArg: string): Screen {
  const tx = c.tx.panel;
  const types = designTypes(s, p, now);
  const format = FORMATS.find((f) => f === formatArg) as Format | undefined;
  const style = DESIGN_STYLES.find((x) => x === styleArg) as DesignStyle | undefined;
  if (format && style) {
    const top = topDesigns(s, p, now, format, style);
    return {
      text: `${c.tx.format.names[format]} · ${tx.styles[style]}\n\n${top.map((d, i) => `${i + 1}. №${d.number} ${designName(d.id)} — ${d.paid}`).join("\n") || tx.empty}`,
      rows: [
        // Демо без метки аналитики: просмотр владельца не считается интересом клиента
        ...top.map((d) => [{ text: `👁 №${d.number} ${designName(d.id)}`.slice(0, 60), webApp: demoUrl({ deps: c.deps }, d.id) }]),
        [{ text: c.tx.back, data: `dash:designs:${p}:${format}` }],
      ],
    };
  }
  if (format) {
    const type = types.find((t) => t.format === format)!;
    return {
      text: `${c.tx.format.names[format]}\n\n${type.styles.map((x) => `${tx.styles[x.style]} — ${x.paid}`).join("\n")}`,
      rows: [
        ...type.styles.map((x) => [{ text: `${tx.styles[x.style]} — ${x.paid}`, data: `dash:designs:${p}:${format}:${x.style}` }]),
        [{ text: c.tx.back, data: `dash:designs:${p}` }],
      ],
    };
  }
  return {
    text: types.map((t) => `${c.tx.format.names[t.format]}: ${t.paid}\n${t.styles.map((x) => `  ${tx.styles[x.style]} — ${x.paid}`).join("\n")}`).join("\n\n"),
    rows: types.map((t) => [{ text: `${c.tx.format.names[t.format]} — ${t.paid}`, data: `dash:designs:${p}:${t.format}` }]),
  };
}

function music(c: Ctx, s: PanelSnapshot, p: Period, now: Date): Screen {
  const m = musicStats(s, p, now);
  const tx = c.tx.panel;
  return { text: `${tx.musicList}: ${m.list}\n${tx.musicOwn}: ${m.own}\n${tx.musicNone}: ${m.none}`, rows: [] };
}

/** Показать раздел. Команда шлёт новое сообщение, кнопка меняет то же самое */
export async function dashboard(c: Ctx, viewArg = "general", periodArg = "all", a = "", b = ""): Promise<Result | void> {
  const tx = c.tx.panel;
  if (!(await canUsePanel(c))) {
    await send(c, c.tx.dashboard.denied);
    return;
  }
  if (!VIEWS.includes(viewArg as View) || !PERIODS.includes(periodArg as Period)) return;
  const v = viewArg as View;
  const p = periodArg as Period;
  const now = c.deps.now();
  const s = await c.deps.repo.panelSnapshot();
  const screen =
    v === "general" ? general(c, s, p, now)
    : v === "revenue" ? revenue(c, s, p, now)
    : v === "orders" ? orders(c, s, p, now, a, b)
    : v === "designs" ? designs(c, s, p, now, a, b)
    : v === "music" ? music(c, s, p, now)
    : a ? partnerDetail(c, s, partnerRows(s, p, now), p, a) : partnerList(c, s, partnerRows(s, p, now), p, b);
  const periods = PERIODS.map((k) => ({ text: `${k === p ? "✓ " : ""}${tx.periods[k]}`, data: `dash:${v}:${k}` }));
  const nav = VIEWS.map((k) => ({ text: `${k === v ? "• " : ""}${tx.views[k]}`, data: `dash:${k}:${p}` }));
  const markup = inline([periods, ...screen.rows, nav.slice(0, 2), nav.slice(2, 4), nav.slice(4, 6)]);
  const text = `${tx.title} · ${tx.periods[p]}\n${tx.views[v]}\n\n${screen.text}`;
  if (c.u.kind === "callback") await editOrSend(c, text, markup);
  else await send(c, text, markup);
}
