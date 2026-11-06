/**
 * v2, часть 8: «📤 Выгрузка» владельца — Excel (xlsx) с листами «Оплаты», «Выплаты», «Долги».
 * Фильтры: период [этот месяц] [прошлый месяц] [этот год], партнёр, менеджер.
 * Кнопки: ex:<период>:<партнёр|0>:<менеджер|0|d> — экран; ex:pp:… / ex:pm:… — выбор; ex:dl:… — скачать.
 * Только владелец; права на каждом нажатии.
 */
import { isPaid } from "@/lib/analytics";
import { partnerRows, type PanelOrder, type PanelSnapshot } from "@/lib/owner-panel";
import { attributionOf, kzMonth, managerMonth, monthStart, nextMonth, prevMonth, ruMonth } from "@/lib/money";
import { managerName, type Manager } from "@/lib/roles";
import { buildXlsx, type Cell } from "@/lib/xlsx";
import { getDesign } from "@/templates/registry";
import { staff } from "@/texts/bot-ru";
import type { InlineButton } from "../tg";
import { fmtPhone, panelData } from "./partners";
import { designName, editOrSend, inline, roleOf, texts } from "./util";
import type { Ctx, Deps } from "./types";

const S = staff.st;
type Screen = { text: string; rows: InlineButton[][] };
type Filter = { per: "m0" | "m1" | "y0"; partner: number; manager: string };
const PERS = ["m0", "m1", "y0"] as const;
const PAGE = 8;

function parse(parts: string[]): Filter {
  const [per = "m0", partner = "0", manager = "0"] = parts;
  return {
    per: (PERS as readonly string[]).includes(per) ? (per as Filter["per"]) : "m0",
    partner: Number.isSafeInteger(Number(partner)) ? Number(partner) : 0,
    manager: manager === "d" || /^\d{1,16}$/.test(manager) ? manager : "0",
  };
}
const enc = (f: Filter) => `${f.per}:${f.partner}:${f.manager}`;

function rangeOf(per: Filter["per"], now: Date) {
  const month = kzMonth(now);
  if (per === "m1") {
    const key = prevMonth(month);
    return { from: monthStart(key), to: monthStart(month), label: `${ruMonth(key)} ${key.slice(0, 4)}`, file: key };
  }
  if (per === "y0") {
    const y = month.slice(0, 4);
    return { from: monthStart(`${y}-01`), to: monthStart(`${Number(y) + 1}-01`), label: S.range.y(y), file: y };
  }
  return { from: monthStart(month), to: monthStart(nextMonth(month)), label: `${ruMonth(month)} ${month.slice(0, 4)}`, file: month };
}

/** Подходит ли заказ под фильтр партнёра/менеджера */
function matches(s: PanelSnapshot, managers: Manager[], f: Filter, o: Pick<PanelOrder, "id" | "userId">) {
  if (!f.partner && f.manager === "0") return true;
  const a = attributionOf(s, managers, o);
  if (f.partner && a.partner?.id !== f.partner) return false;
  if (f.manager === "d") return !a.manager;
  if (f.manager !== "0") return a.manager?.telegramId === Number(f.manager);
  return true;
}

const partnerMatches = (f: Filter, managedBy: number | null, id: number) =>
  (!f.partner || f.partner === id) && (f.manager === "0" || (f.manager === "d" ? managedBy === null : managedBy === Number(f.manager)));

async function filterLabels(c: Ctx, f: Filter) {
  const p = f.partner ? await c.deps.repo.getPartner(f.partner) : null;
  const managers = await c.deps.repo.listManagers();
  const m = managers.find((x) => String(x.telegramId) === f.manager);
  return { partner: p ? p.name.slice(0, 40) : S.exAll, manager: f.manager === "d" ? S.exDirect : m ? managerName(m) : S.exAll };
}

/** Экран выгрузки (arg — часть кнопки после «ex:») */
export async function exportScreen(c: Ctx, arg: string): Promise<Screen> {
  const parts = arg ? arg.split(":") : [];
  const back: InlineButton[] = [{ text: staff.back, data: "pn:home" }];
  if (parts[0] === "pp" || parts[0] === "pm") {
    const f = parse(parts.slice(1, 4));
    const ret: InlineButton[] = [{ text: staff.back, data: `ex:${enc(f)}` }];
    if (parts[0] === "pm") {
      const managers = await c.deps.repo.listManagers();
      return {
        text: `${S.exTitle}\n\n${S.exPick}`,
        rows: [
          [{ text: S.exAll, data: `ex:${enc({ ...f, manager: "0", partner: 0 })}` }],
          [{ text: S.exDirect, data: `ex:${enc({ ...f, manager: "d", partner: 0 })}` }],
          ...managers.slice(0, 20).map((m) => [{ text: managerName(m).slice(0, 40), data: `ex:${enc({ ...f, manager: String(m.telegramId), partner: 0 })}` }]),
          ret,
        ],
      };
    }
    const s = await panelData(c.deps);
    const list = s.partners.filter((p) => partnerMatches({ ...f, partner: 0 }, p.managedBy, p.id)).sort((a, b) => a.name.localeCompare(b.name));
    const pages = Math.max(1, Math.ceil(list.length / PAGE));
    const page = Math.min(Math.max(0, Number(parts[4]) || 0), pages - 1);
    const nav: InlineButton[][] =
      pages > 1
        ? [[
            { text: "◀", data: `ex:pp:${enc(f)}:${Math.max(0, page - 1)}` },
            { text: `${page + 1}/${pages}`, data: `ex:pp:${enc(f)}:${page}` },
            { text: "▶", data: `ex:pp:${enc(f)}:${Math.min(pages - 1, page + 1)}` },
          ]]
        : [];
    return {
      text: `${S.exTitle}\n\n${S.exPick}`,
      rows: [
        [{ text: S.exAll, data: `ex:${enc({ ...f, partner: 0 })}` }],
        ...list.slice(page * PAGE, (page + 1) * PAGE).map((p) => [{ text: p.name.slice(0, 40), data: `ex:${enc({ ...f, partner: p.id })}` }]),
        ...nav,
        ret,
      ],
    };
  }
  const f = parse(parts);
  const now = c.deps.now();
  const labels = await filterLabels(c, f);
  const per = (x: Filter["per"]) => {
    const r = rangeOf(x, now);
    return { text: `${x === f.per ? "• " : ""}${r.label}`, data: `ex:${enc({ ...f, per: x })}` };
  };
  return {
    text: [S.exTitle, "", S.exFilter(rangeOf(f.per, now).label, labels.partner, labels.manager), "", S.exHint].join("\n"),
    rows: [
      PERS.map(per),
      [{ text: S.exPartner(labels.partner).slice(0, 60), data: `ex:pp:${enc(f)}:0` }],
      [{ text: S.exManager(labels.manager).slice(0, 60), data: `ex:pm:${enc(f)}` }],
      [{ text: S.exDownload, data: `ex:dl:${enc(f)}` }],
      back,
    ],
  };
}

/** «05.11.2026 14:30» по Алматы */
const stamp = (d: Date) => {
  const iso = new Date(+d + 5 * 3_600_000).toISOString();
  return `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)} ${iso.slice(11, 16)}`;
};

/** Листы выгрузки: оплаты, выплаты, долги — чистая функция над снимком */
export function exportSheets(s: PanelSnapshot, managers: Manager[], f: Filter, now: Date) {
  const r = rangeOf(f.per, now);
  const inside = (d: Date) => +d >= +r.from && +d < +r.to;
  const ru = texts.ru;
  const mName = (id: number | null | undefined) => {
    const m = managers.find((x) => x.telegramId === id);
    return m ? managerName(m) : "";
  };
  const paid = s.orders
    .filter((o) => isPaid(o) && inside(o.paidAt ?? o.updatedAt) && matches(s, managers, f, o))
    .sort((a, b) => +(a.paidAt ?? a.updatedAt) - +(b.paidAt ?? b.updatedAt));
  const payments: Cell[][] = [
    ["№", "Дата оплаты", "Сумма, ₸", "Формат", "Тадбир", "Дизайн", "Партнёр", "Менеджер", "Партнёру, ₸", "Клиент"],
    ...paid.map((o) => {
      const a = attributionOf(s, managers, o);
      const earning = s.earnings.find((e) => e.orderId === o.id);
      return [
        o.number,
        stamp(o.paidAt ?? o.updatedAt),
        o.amount,
        ru.format.names[o.format],
        ru.category[o.occasion].replace(/^\S+\s/, ""),
        `№${getDesign(o.templateId)?.number ?? ""} ${designName(o.templateId)}`,
        a.partner?.name ?? "",
        a.manager ? managerName(a.manager) : "",
        earning?.amount ?? null,
        o.username ? `@${o.username}` : (o.firstName ?? ""),
      ];
    }),
  ];
  if (paid.length) payments.push(["Итого", "", paid.reduce((n, o) => n + o.amount, 0), "", "", "", "", "", paid.reduce((n, o) => n + (s.earnings.find((e) => e.orderId === o.id)?.amount ?? 0), 0), ""]);

  const partnerPayouts = s.payouts
    .filter((x) => inside(x.createdAt))
    .map((x) => ({ x, p: s.partners.find((p) => p.id === x.partnerId) }))
    .filter(({ p }) => p && partnerMatches(f, p.managedBy, p.id));
  const mgrPayouts = (s.managerPayouts ?? []).filter((x) => inside(x.createdAt) && !f.partner && (f.manager === "0" || f.manager === String(x.managerId)));
  const payouts: Cell[][] = [
    ["Дата", "Кому", "Кто", "Сумма, ₸", "Kaspi", "Менеджер / месяц"],
    ...[
      ...partnerPayouts.map(({ x, p }) => ({ at: x.createdAt, row: [stamp(x.createdAt), p!.name, "партнёр", x.amount, p!.kaspi ? fmtPhone(p!.kaspi) : "", mName(p!.managedBy)] as Cell[] })),
      ...mgrPayouts.map((x) => ({ at: x.createdAt, row: [stamp(x.createdAt), mName(x.managerId), "менеджер", x.amount, "", `${ruMonth(x.month)} ${x.month.slice(0, 4)} (${x.orders} оплат)`] as Cell[] })),
    ]
      .sort((a, b) => +a.at - +b.at)
      .map((x) => x.row),
  ];

  const debts: Cell[][] = [["Кому", "Менеджер", "Статус", "Начислено, ₸", "Выплачено, ₸", "К выплате, ₸", "Ждёт подтверждения, ₸", "Kaspi"]];
  for (const row of partnerRows(s, "all", now)) {
    const p = row.partner;
    if (!partnerMatches(f, p.managedBy, p.id) || (!row.earned && !row.paidOut)) continue;
    debts.push([p.name, mName(p.managedBy), staff.pt.status[p.status].replace(/^\S+\s/, ""), row.earned, row.paidOut, row.due, row.onHold || null, p.kaspi ? fmtPhone(p.kaspi) : ""]);
  }
  if (!f.partner) {
    for (const m of managers) {
      if (f.manager !== "0" && f.manager !== String(m.telegramId)) continue;
      // Невыплаченные закрытые месяцы (до текущего)
      for (let key = prevMonth(kzMonth(now)), i = 0; i < 12; key = prevMonth(key), i++) {
        if ((s.managerPayouts ?? []).some((x) => x.managerId === m.telegramId && x.month === key)) continue;
        const e = managerMonth(s, managers, m.telegramId, key);
        if (e.amount > 0) debts.push([`${managerName(m)} · ${ruMonth(key)} ${key.slice(0, 4)}`, managerName(m), "менеджер", e.amount, 0, e.amount, null, ""]);
      }
    }
  }
  return { label: r.label, file: r.file, sheets: [{ name: "Оплаты", rows: payments }, { name: "Выплаты", rows: payouts }, { name: "Долги", rows: debts }] };
}

/** Скачать выгрузку в чат (бот и «📤 Excel» в панели приложения). Права проверяет вызывающий */
export async function sendExport(deps: Deps, chatId: number, per = "m0", partner = "0", manager = "0") {
  const f = parse([per, partner, manager]);
  const x = exportSheets(await panelData(deps), await deps.repo.listManagers(), f, deps.now());
  await deps.tg.sendDocument(chatId, buildXlsx(x.sheets), { fileName: `inviteizi-${x.file}.xlsx`, caption: S.exReady(x.label) });
}

/** ex:… — экраны и скачивание */
export async function exportAction(c: Ctx, arg: string) {
  if ((await roleOf(c)) !== "owner" || c.chatId !== c.user.id) {
    if (c.u.kind === "callback") {
      await c.deps.tg.answerCallbackQuery(c.u.callbackId, { text: c.tx.oldButton });
      c.answered = true;
    }
    return;
  }
  if (arg.startsWith("dl:")) {
    await sendExport(c.deps, c.chatId, ...(arg.slice(3).split(":") as [string?, string?, string?]));
    if (c.u.kind === "callback") {
      await c.deps.tg.answerCallbackQuery(c.u.callbackId, { text: "📥" });
      c.answered = true;
    }
    return;
  }
  const screen = await exportScreen(c, arg);
  await editOrSend(c, screen.text, inline(screen.rows));
}
