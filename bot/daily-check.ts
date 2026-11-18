/**
 * Ежедневная самопроверка прода (19.11.2026): раз в сутки после 09:00 по Алматы (cron каждые 10 мин,
 * отметка дня в bot_notices — ровно один раз). Владельцу пишет ТОЛЬКО если что-то не так (по-русски, коротко):
 *  - все дизайны в продаже: /demo/<id> → 200, в странице нет «undefined», «NaN», старых цен 5/6/8 000 ₸,
 *    адресов supabase.co/storage; обложка /covers/thumb/<id>.webp?v= → 200;
 *  - активная музыка и демо-мелодии → 200/206; /catalog и /catalog/invite → 200;
 *  - ошибки бота за сутки (bot_errors) по шагам, топ-3 — если их 3 и больше;
 *  - видео «Сақлаб олиш», зависшие дольше 20 минут.
 */
import type { Deps } from "./flow/types";
import type { HealthIo } from "./health";
import { ON_SALE_IDS } from "@/templates/catalog";
import { getDesign, thumbOf } from "@/templates/registry";
import { demoMusicUrl } from "@/lib/music";
import type { Occasion } from "@/lib/types";

const MIN = 60_000;
const DAY = 24 * 60 * MIN;
/** С какого часа по Алматы (UTC+5) идёт проверка */
export const DAILY_HOUR = 9;
const OCCASIONS: Occasion[] = ["nikoh", "nahorgi", "sunnat", "yubiley"];
/** Ошибок бота за сутки, начиная с которых это проблема (единичные сбои связи у гостей — шум) */
export const ERRORS_ALERT = 3;
const STUCK_MIN = 20;

/** Что не должно появляться на странице приглашения */
export const BAD_TEXT: { re: RegExp; label: string }[] = [
  { re: />[^<]*\bundefined\b[^<]*</, label: "undefined" },
  { re: />[^<]*\bNaN\b[^<]*</, label: "NaN" },
  { re: /\b[568][\s  ]?000[\s  ]?₸/, label: "старая цена" },
  { re: /supabase\.co\/storage/, label: "адрес Supabase Storage" },
];

export function badTextIn(html: string): string[] {
  // скрипты Next (__next_f) содержат служебные строки — проверяем только видимый HTML
  const visible = html.replace(/<script\b[\s\S]*?<\/script>/gi, "").replace(/<style\b[\s\S]*?<\/style>/gi, "");
  return BAD_TEXT.filter((b) => b.re.test(visible) || (b.label === "адрес Supabase Storage" && b.re.test(html))).map((b) => b.label);
}

const kzDay = (d: Date) => new Date(+d + 5 * 60 * MIN).toISOString().slice(0, 10);
const kzHour = (d: Date) => new Date(+d + 5 * 60 * MIN).getUTCHours();

async function get(io: HealthIo, url: string, range = false, body = false) {
  try {
    const res = await io.fetch(url, {
      headers: range ? { range: "bytes=0-1" } : {},
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    const text = body ? await res.text() : (await res.body?.cancel().catch(() => undefined), "");
    return { status: res.status, text };
  } catch {
    return { status: 0, text: "" };
  }
}

/** Параллельно, но не больше n запросов сразу */
async function pool<T, R>(items: T[], n: number, f: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) {
        const k = i++;
        out[k] = await f(items[k]);
      }
    }),
  );
  return out;
}

export type DailyReport = { problems: string[]; checked: number };

/** Сама проверка (без отметки дня и без сообщения) */
export async function dailyProblems(deps: Deps, io: HealthIo): Promise<DailyReport> {
  const base = deps.env.publicBaseUrl.replace(/\/+$/, "");
  const problems: string[] = [];
  let checked = 0;
  const list = (title: string, bad: string[]) => {
    if (bad.length) problems.push(`• ${title}: ${bad.length} — ${bad.slice(0, 5).join(", ")}${bad.length > 5 ? " …" : ""}`);
  };

  // Демо всех дизайнов в продаже: открывается и без мусора в тексте
  const demos = await pool([...ON_SALE_IDS], 8, async (id) => ({ id, ...(await get(io, `${base}/demo/${id}`, false, true)) }));
  checked += demos.length;
  list("Демо не открываются", demos.filter((d) => d.status !== 200).map((d) => `${d.id} ${d.status || "нет ответа"}`));
  list(
    "В демо лишнее (undefined/NaN/старая цена/Supabase)",
    demos.filter((d) => d.status === 200).flatMap((d) => badTextIn(d.text).map((b) => `${d.id}: ${b}`)),
  );

  // Обложки каталога
  const covers = await pool([...ON_SALE_IDS], 8, async (id) => {
    const d = getDesign(id);
    const url = d ? `${base}${thumbOf(d.cover)}` : "";
    return { id, status: url ? (await get(io, url, true)).status : 0 };
  });
  checked += covers.length;
  list("Обложки не открываются", covers.filter((c) => c.status !== 200 && c.status !== 206).map((c) => `${c.id} ${c.status || "—"}`));

  // Музыка: активные песни списка и демо-мелодии
  const music = new Set<string>();
  for (const m of await deps.repo.listMusic().catch(() => [])) music.add(new URL(m.fileUrl, base).href);
  for (const o of OCCASIONS) {
    const u = demoMusicUrl(o);
    if (u) music.add(new URL(u, base).href);
  }
  const songs = await pool([...music], 8, async (url) => ({ url, status: (await get(io, url, true)).status }));
  checked += songs.length;
  list(
    "Музыка не открывается",
    songs.filter((x) => x.status !== 200 && x.status !== 206).map((x) => `${x.url.replace(base, "")} ${x.status || "—"}`),
  );

  // Каталог
  for (const path of ["/catalog", "/catalog/invite"]) {
    const r = await get(io, `${base}${path}`, false, true);
    checked++;
    if (r.status !== 200) problems.push(`• ${path}: ${r.status || "нет ответа"}`);
    else {
      const bad = badTextIn(r.text);
      if (bad.length) problems.push(`• ${path}: ${bad.join(", ")}`);
    }
  }

  // Ошибки бота за сутки по шагам
  const now = deps.now();
  const steps = await deps.repo.errorSteps(new Date(+now - DAY)).catch(() => null);
  const total = (steps ?? []).reduce((n, x) => n + x.n, 0);
  if (steps && total >= ERRORS_ALERT)
    problems.push(`• Ошибки бота за сутки (топ-3): ${steps.map((x) => `${x.step} — ${x.n}`).join(", ")}`);

  // Видео, зависшие в очереди
  const stuck = await deps.repo.listRenders({ stuckBefore: new Date(+now - STUCK_MIN * MIN) }).catch(() => []);
  if (stuck.length) {
    const numbers: string[] = [];
    for (const r of stuck.slice(0, 5)) numbers.push(`№${(await deps.repo.getOrder(r.orderId))?.number ?? "?"}`);
    problems.push(`• Видео зависли (> ${STUCK_MIN} мин): ${stuck.length} — ${numbers.join(", ")}`);
  }
  return { problems, checked };
}

/** Из cron: после 09:00 по Алматы, один раз в день; сообщение — только при проблемах */
export async function dailyCheck(deps: Deps, io: HealthIo): Promise<{ ran: boolean; sent: number; problems: string[] }> {
  const repo = deps.repo;
  const now = deps.now();
  if (!repo.lastNoticeAt || !repo.markNotice || kzHour(now) < DAILY_HOUR) return { ran: false, sent: 0, problems: [] };
  const day = kzDay(now);
  // отметка дня ставится ДО проверки: два cron подряд не проверяют дважды
  if (!(await repo.markNotice(`health:daily:${day}`, now))) return { ran: false, sent: 0, problems: [] };
  const { problems, checked } = await dailyProblems(deps, io);
  if (!problems.length) return { ran: true, sent: 0, problems };
  const text = [`⚠️ Утренняя проверка: есть проблемы (проверено ${checked})`, ...problems].join("\n").slice(0, 3900);
  let sent = 0;
  for (const id of io.recipients())
    try {
      await deps.tg.sendMessage(id, text);
      sent++;
    } catch (e) {
      console.error("daily check notify", e instanceof Error ? e.name : "Error");
    }
  return { ran: true, sent, problems };
}
