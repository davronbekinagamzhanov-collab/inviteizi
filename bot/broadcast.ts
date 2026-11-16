/**
 * Рассылка об акции (17.11.2026). Промокоды рассылку не делают.
 *
 * Кому: все, кто нажимал /start, кроме админов, менеджеров, партнёров и оптовиков; клиенты по ссылке партнёра —
 * только если в акции включено «клиентам по ссылке партнёра». Не шлём отключившим «🔕» и заблокировавшим бота
 * (ответ 403 помечает пользователя — больше не шлём).
 * Сколько: не больше 2 сообщений на акцию (рассылка + «Охирги кун!» за 24 ч), рассылки — не чаще раза в 3 дня.
 * Как: очередь bot_notices с арендой (ключ promo:<акция>:<пользователь>:<start|last> — каждое сообщение один раз),
 * не больше 25 сообщений в секунду, при 429 — повтор после retry_after.
 */
import type { Lang, Promotion } from "@/lib/domain";
import { PARTNER_CODE } from "@/lib/marketing/config";
import { discounted } from "@/lib/pricing-math";
import { salesCopy, strike } from "@/texts/sales";
import { activeDesigns, PRICES, type Format } from "@/templates/registry";
import { classifyError, isUnreachable, retryAfterSec } from "./errors";
import { isRunning, promotionCovers } from "./pricing";
import type { Deps } from "./flow/types";
import { coverUrl, price } from "./flow/util";
import type { InlineButton } from "./tg";

export const BROADCAST_GAP_MS = 3 * 86_400_000;
export const REMIND_BEFORE_MS = 86_400_000;
export const PER_SECOND = 25;
const LEASE_MS = 120_000;
const MAX_ATTEMPTS = 5;

export type BroadcastKind = "start" | "last";
export const broadcastKey = (promotionId: string, userId: number, kind: BroadcastKind) =>
  `promo:${promotionId}:${userId}:${kind}`;
const parseKey = (key: string) => {
  const m = /^promo:([0-9a-f-]{36}):(\d+):(start|last)$/.exec(key);
  return m ? { promotionId: m[1], userId: Number(m[2]), kind: m[3] as BroadcastKind } : null;
};

/** Получатели рассылки этой акции */
export async function audience(deps: Pick<Deps, "repo">, p: Promotion) {
  const users = await deps.repo.listBroadcastUsers();
  const staff = new Set(await deps.repo.staffIds());
  const wholesale = new Set((await deps.repo.listWholesalers()).map((w) => w.userId));
  const partners = (await deps.repo.panelSnapshot()).partners.filter((x) => x.status !== "rejected");
  const partnerIds = new Set(partners.map((x) => x.telegramId).filter((x): x is number => typeof x === "number"));
  const partnerNames = new Set(partners.map((x) => x.username?.toLowerCase()).filter(Boolean));
  return users.filter(
    (u) =>
      !staff.has(u.id) &&
      !wholesale.has(u.id) &&
      !partnerIds.has(u.id) &&
      !(u.username && partnerNames.has(u.username.toLowerCase())) &&
      (p.forPartnerClients || !PARTNER_CODE.test(u.source ?? "")),
  );
}

/** Картинка: лучший VIP-дизайн акции (иначе первый подходящий) */
function coverOf(deps: Pick<Deps, "env">, p: Promotion) {
  const list = activeDesigns().filter((d) => promotionCovers(p, d.occasion, d.format));
  const best = list.find((d) => d.id.startsWith("vip-")) ?? list[0];
  return best ? coverUrl({ deps: deps as Deps }, best.id) : null;
}

/** Сообщение рассылки на языке получателя */
export function broadcastMessage(
  deps: Pick<Deps, "env">,
  p: Promotion,
  lang: Lang | null,
  kind: BroadcastKind,
  now: Date,
) {
  const t = salesCopy(lang);
  const formats = (["animated", "scroll", "simple"] as Format[]).filter((f) => !p.formats || p.formats.includes(f));
  const left = Math.max(0, +p.endsAt - +now);
  const lines = [
    ...(kind === "last" ? [t.bcLast] : []),
    `🎉 «${p.name}» · ${p.percent >= 100 ? t.free : t.off(p.percent)}`,
    "",
    ...formats.map((f) => {
      const after = discounted(PRICES[f], p.percent);
      return `${t.bcFormats[f]}: ${strike(price(PRICES[f]))} → ${after === 0 ? t.free : price(after)}`;
    }),
    "",
    t.bcLeft(Math.floor(left / 86_400_000), Math.floor((left % 86_400_000) / 3_600_000)),
  ];
  const app = deps.env.miniAppUrl;
  const rows: InlineButton[][] = [
    [app ? { text: t.bcChoose, webApp: app } : { text: t.bcChoose, data: "m:create" }],
    [{ text: t.bcOff, data: "bo:off" }],
  ];
  return { photo: coverOf(deps, p), caption: lines.join("\n"), markup: { inline: rows } };
}

export type StartResult =
  | { ok: true; queued: number; recipients: number }
  | { error: "notFound" | "ended" | "disabled" | "already" | "tooSoon" };

/** Поставить рассылку (start) или напоминание (last) в очередь — один раз на акцию */
export async function startBroadcast(deps: Deps, id: string, kind: BroadcastKind): Promise<StartResult> {
  const now = deps.now();
  const p = (await deps.repo.listPromotions()).find((x) => x.id === id);
  if (!p) return { error: "notFound" };
  if (p.stoppedAt || +p.endsAt <= +now) return { error: "ended" };
  if (kind === "start" ? p.broadcast === false : p.remind === false) return { error: "disabled" };
  if (kind === "start" ? p.broadcastAt : p.remindAt) return { error: "already" };
  if (!(await deps.repo.markPromotionBroadcast(id, kind, now, BROADCAST_GAP_MS)))
    return { error: kind === "start" ? "tooSoon" : "already" };
  const users = await audience(deps, p);
  // Акция ещё не началась — сообщения уйдут в момент начала
  const dueAt = new Date(Math.max(+now, +p.startsAt));
  const queued = await deps.repo.enqueueBroadcast(
    users.map((u) => ({ key: broadcastKey(id, u.id, kind), chatId: u.id, dueAt })),
  );
  return { ok: true, queued, recipients: users.length };
}

/** Напоминание «Охирги кун!» за 24 ч до конца (cron) */
export async function remindPromotions(deps: Deps) {
  const now = deps.now();
  let n = 0;
  for (const p of await deps.repo.listPromotions()) {
    if (!p.remind || p.remindAt || !isRunning(p, now) || +p.endsAt - +now > REMIND_BEFORE_MS) continue;
    const r = await startBroadcast(deps, p.id, "last");
    if ("ok" in r) n += r.queued;
  }
  return n;
}

export type RunResult = { sent: number; blocked: number; failed: number; retried: number };

/**
 * Отправить созревшие сообщения: партиями по 25 в секунду, пока есть время.
 * sleep — пауза между партиями (в тестах — без реального ожидания).
 */
export async function runBroadcast(
  deps: Deps,
  opts: { budgetMs?: number; sleep?: (ms: number) => Promise<void>; clock?: () => number } = {},
): Promise<RunResult> {
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const clock = opts.clock ?? Date.now;
  const started = clock();
  const budget = opts.budgetMs ?? 40_000;
  const r: RunResult = { sent: 0, blocked: 0, failed: 0, retried: 0 };
  const promotions = new Map((await deps.repo.listPromotions()).map((p) => [p.id, p]));
  while (clock() - started < budget) {
    const batchStart = clock();
    const jobs = await deps.repo.claimBroadcast(deps.now(), PER_SECOND, LEASE_MS);
    if (!jobs.length) break;
    let flood: Date | null = null;
    for (const job of jobs) {
      const now = deps.now();
      if (flood) {
        // Telegram попросил подождать — остальные этой партии тоже позже
        await deps.repo.failBroadcast(job.key, job.token, { retryAt: flood, code: "flood" }, now);
        r.retried++;
        continue;
      }
      const k = parseKey(job.key);
      const p = k ? promotions.get(k.promotionId) : undefined;
      if (!k || !p || p.stoppedAt || +p.endsAt <= +now) {
        await deps.repo.failBroadcast(job.key, job.token, { code: "ended" }, now);
        r.failed++;
        continue;
      }
      if (!(await deps.repo.markBroadcastSending(job.key, job.token, now))) continue;
      const user = await deps.repo.getUser(job.chatId);
      const msg = broadcastMessage(deps, p, user?.lang ?? null, k.kind, now);
      try {
        if (msg.photo) await deps.tg.sendPhoto(job.chatId, msg.photo, { caption: msg.caption, markup: msg.markup });
        else await deps.tg.sendMessage(job.chatId, msg.caption, { markup: msg.markup });
        await deps.repo.ackBroadcast(job.key, job.token, deps.now());
        r.sent++;
      } catch (e) {
        const wait = retryAfterSec(e);
        if (wait !== null) {
          flood = new Date(+now + wait * 1000);
          await deps.repo.failBroadcast(job.key, job.token, { retryAt: flood, code: "flood" }, now);
          r.retried++;
        } else if (isUnreachable(e)) {
          // Заблокировал бота — помечаем и больше не пишем
          await deps.repo.setBroadcastOff(job.chatId, true, true);
          await deps.repo.failBroadcast(job.key, job.token, { code: "blocked" }, now);
          r.blocked++;
        } else if (classifyError(e) === "transient" && job.attempts < MAX_ATTEMPTS) {
          await deps.repo.failBroadcast(job.key, job.token, { retryAt: new Date(+now + 60_000), code: "retry" }, now);
          r.retried++;
        } else {
          console.error("broadcast", e instanceof Error ? e.name : "Error");
          await deps.repo.failBroadcast(job.key, job.token, { code: "error" }, now);
          r.failed++;
        }
      }
    }
    // Партия неполная — очередь пуста, ждать нечего
    if (flood || jobs.length < PER_SECOND) break;
    // Не больше 25 сообщений в секунду
    const spent = clock() - batchStart;
    if (spent < 1000) await sleep(1000 - spent);
  }
  return r;
}
