import { remindPromotions, runBroadcast } from "./broadcast";
import { flushMarketing, withMarketingReady } from "./marketing";
import { checkFiles } from "./health";
import { dailyCheck } from "./daily-check";
/**
 * Задания по расписанию (pg_cron → POST /api/cron каждые 10 минут):
 *  - админам: чек ждёт больше 30 минут — напоминание днём, дальше каждые 2 часа до 21:00;
 *  - v2: отчёты 20:00 (владелец, менеджер, партнёр), выплаты 10:00, отложенные на ночь сообщения (bot/flow/notify.ts);
 *  - клиенту: пропал на оплате больше 3 часов — одно вежливое напоминание;
 *  - архив: прошёл expiresAt (последний тадбир + 30 дней) → archived (ссылка показывает заглушку).
 *  - хозяину: вечером сводка новых ответов гостей (один раз в день и только если они есть).
 *  - фото клиента: удаляются через 30 дней после конца приглашения (expiresAt + 30 дней).
 *  - партнёры: карточки владельцу, отложенные на ночь; «спящие» (14 дней без сканов) — тому, кто привёл.
 * Каждое напоминание — одна попытка: если пользователь заблокировал бота, повторять не будем.
 */
import type { Deps } from "./flow/types";
import { adminCard, decisionButtons } from "./flow/orders";
import { inline, pageUrl, price, txFor } from "./flow/util";
import { creditPartner, flushOwnerNotices, notifySleeping } from "./flow/partners";
import { rsvpTotals } from "@/lib/rsvp";
import { expiresAtOf } from "@/lib/orders";
import { FILES_KEEP_AFTER_EXPIRY_MS } from "./own-photo";
import { errorAlert, eveningReports, flushNotices, payDayNotices } from "./flow/notify";
import { cleanup, nudges, reviewRequests } from "./flow/care";
import { isQuiet, kzHour, QUIET_TO } from "@/lib/quiet-hours";

export type CronResult = {
  adminReminded: number;
  clientReminded: number;
  archived: number;
  rsvpDigests: number;
  photosRemoved: number;
  /** Файлы «Сақлаб олиш», удалённые из Blob автоочисткой */
  keepsakeRemoved?: number;
  musicRemoved: number;
  partnerNotices: number;
  sleeping: number;
  notices: number;
  payDay: number;
  evening: number;
  nudges: number;
  reviews: number;
  cleaned: number;
  errorAlerts: number;
  healthAlerts: number;
  /** Утренняя самопроверка: сколько сообщений ушло владельцу */
  dailyAlerts?: number;
  /** Рассылка об акции: поставлено напоминаний «Охирги кун!» и отправлено сообщений */
  broadcastQueued?: number;
  broadcastSent?: number;
  errors: number;
};

const MIN = 60_000;
export const ADMIN_REMIND_AFTER_MIN = 30;
/** Повтор напоминания о чеке — каждые 2 часа, последнее — до 21:00 */
export const ADMIN_REMIND_EVERY_MIN = 120;
export const ADMIN_REMIND_UNTIL_HOUR = 21;
export const CLIENT_REMIND_AFTER_MIN = 3 * 60;
export const RSVP_DIGEST_HOUR = 20;
const DAY = 24 * 60 * MIN;
const TZ_OFFSET = 5 * 60 * MIN; // Казахстан: UTC+5 круглый год

/** Сводка новых ответов: метка ставится до отправки, поэтому повтора не будет даже при сбое */
async function sendRsvpDigests(deps: Deps, now: Date, r: CronResult) {
  const local = now.getTime() + TZ_OFFSET;
  if (Math.floor(local / (60 * MIN)) % 24 < RSVP_DIGEST_HOUR) return;
  const dayStart = new Date(Math.floor(local / DAY) * DAY - TZ_OFFSET);
  for (const o of await deps.repo.rsvpDigestDue(dayStart)) {
    if (!(await deps.repo.claimRsvpDigest(o.id, dayStart, now))) continue;
    const fresh = (await deps.repo.listRsvp(o.id)).filter((a) => !o.since || a.updatedAt > o.since);
    if (!fresh.length) continue;
    const total = rsvpTotals(fresh);
    const tx = txFor((await deps.repo.getUser(o.userId))?.lang);
    const coming = fresh.filter((a) => a.attending).length;
    try {
      await deps.tg.sendMessage(o.userId, tx.rsvp.digest(total.replies, coming, total.people, total.declined), {
        markup: inline([[{ text: tx.rsvp.answers, data: `rsvp:${o.number}` }]]),
      });
      r.rsvpDigests++;
    } catch (e) {
      r.errors++;
      console.error("cron rsvp digest", e instanceof Error ? e.name : "Error");
    }
  }
}

const ALL_STATUSES = [
  "draft",
  "preview",
  "awaiting_payment",
  "receipt_sent",
  "active",
  "archived",
  "rejected",
] as const;

/**
 * Автоочистка (17.11.2026): когда ссылка закрылась (последний тадбир + 30 дней или expires_at),
 * из Storage удаляются фото клиента и его своя песня. Заказ, сумма и статистика остаются.
 * Файл, который ещё нужен другому заказу (та же песня или то же фото), не трогаем.
 */
async function removeExpiredFiles(deps: Deps, now: Date, r: CronResult) {
  if (!deps.removePhotos && !deps.removeMusic) return;
  const all = await deps.repo.listOrdersByStatus([...ALL_STATUSES]);
  const ownUrl = (o: (typeof all)[number]) => (o.music.kind === "own" ? (o.music.url ?? null) : null);
  const due = (o: (typeof all)[number]) => {
    const end = expiresAtOf(o);
    return !!end && end.getTime() + FILES_KEEP_AFTER_EXPIRY_MS <= now.getTime();
  };
  const used = new Set(
    all.filter((o) => !due(o)).flatMap((o) => [...(o.data.photos ?? []), ...(ownUrl(o) ? [ownUrl(o)!] : [])]),
  );
  // Файлы «Сақлаб олиш» (фото, PDF, видео в Blob) — тем же сроком; строка остаётся без адреса
  const renders = await deps.repo.listRenders({ withUrl: true }).catch(() => []);
  const dueIds = new Set(all.filter(due).map((o) => o.id));
  const expiredRenders = renders.filter((x) => dueIds.has(x.orderId));
  if (expiredRenders.length) {
    await deps.removePhotos?.(expiredRenders.map((x) => x.url!));
    for (const x of expiredRenders) await deps.repo.saveRender(x.orderId, x.kind, { url: null, telegramFileId: null });
    r.keepsakeRemoved = (r.keepsakeRemoved ?? 0) + expiredRenders.length;
  }
  for (const o of all) {
    const photos = o.data.photos ?? [],
      music = ownUrl(o);
    if ((!photos.length && !music) || !due(o)) continue;
    const freePhotos = photos.filter((u) => !used.has(u));
    if (freePhotos.length) await deps.removePhotos?.(freePhotos);
    if (music && !used.has(music)) await deps.removeMusic?.([music]);
    await deps.repo.updateOrder(o.id, {
      data: { ...o.data, photos: [] },
      ...(music && o.music.kind === "own"
        ? { music: { kind: "own" as const, fileId: o.music.fileId, title: o.music.title } }
        : {}),
    });
    if (photos.length) r.photosRemoved++;
    if (music) r.musicRemoved++;
  }
}

const CRON_EVERY_MIN = 10;

export async function runCron(input: Deps): Promise<CronResult> {
  const deps = await withMarketingReady(input);
  const { repo, tg } = deps;
  const now = deps.now();
  const r: CronResult = {
    adminReminded: 0,
    clientReminded: 0,
    archived: 0,
    rsvpDigests: 0,
    photosRemoved: 0,
    musicRemoved: 0,
    partnerNotices: 0,
    sleeping: 0,
    notices: 0,
    payDay: 0,
    evening: 0,
    nudges: 0,
    reviews: 0,
    cleaned: 0,
    errorAlerts: 0,
    healthAlerts: 0,
    errors: 0,
  };
  const ctx = { deps };

  // ── Здоровье файлов: песня с сайта и тестовый файл Blob; два сбоя подряд — владельцу ──
  if (deps.health)
    try {
      r.healthAlerts = (await checkFiles(deps, deps.health)).sent;
    } catch (e) {
      r.errors++;
      console.error("cron health", e instanceof Error ? e.name : "Error");
    }

  // ── Админам: чек ждёт > 30 мин — днём (08:00–21:00), дальше каждые 2 часа до 21:00 ──
  const hour = kzHour(now);
  const waiting =
    hour >= QUIET_TO && hour < ADMIN_REMIND_UNTIL_HOUR
      ? (await repo.listOrdersByStatus(["receipt_sent"])).filter(
          (o) =>
            o.receiptAt &&
            +o.receiptAt <= +now - ADMIN_REMIND_AFTER_MIN * MIN &&
            (!o.adminRemindedAt ||
              +o.adminRemindedAt <= +now - ADMIN_REMIND_EVERY_MIN * MIN ||
              +o.adminRemindedAt < +o.receiptAt),
        )
      : [];
  if (waiting.length) {
    const admins = await repo.listAdminIds();
    for (const o of waiting) {
      const client = await repo.getUser(o.userId);
      const minutes = Math.round((now.getTime() - (o.receiptAt ?? now).getTime()) / MIN);
      for (const adminId of admins) {
        const lang = (await repo.getUser(adminId))?.lang ?? "uz";
        const tx = txFor(lang);
        try {
          await tg.sendMessage(
            adminId,
            `${tx.admin.remind(o.number, minutes)}\n\n${adminCard(deps, o, lang, client)}`,
            {
              markup: inline(decisionButtons(tx, o.number)),
            },
          );
        } catch (e) {
          r.errors++;
          console.error("cron admin remind", e instanceof Error ? e.name : "Error");
        }
      }
      await repo.updateOrder(o.id, { adminRemindedAt: now });
      r.adminReminded++;
    }
  }

  // ── Клиенту: пропал на оплате ──
  // Тихие часы: ночью клиенту не пишем — напоминание уйдёт утром (метку не ставим)
  for (const o of isQuiet(now)
    ? []
    : await repo.ordersAbandonedAtPayment(new Date(now.getTime() - CLIENT_REMIND_AFTER_MIN * MIN))) {
    const tx = txFor((await repo.getUser(o.userId))?.lang);
    try {
      await tg.sendMessage(o.userId, tx.pay.reminder(pageUrl(ctx, o.slug)), {
        markup: inline([[{ text: tx.order.pay(price(o.amount)), data: `pay:${o.number}` }]]),
      });
      r.clientReminded++;
    } catch (e) {
      r.errors++;
      console.error("cron client remind", e instanceof Error ? e.name : "Error");
    }
    await repo.updateOrder(o.id, { paymentRemindedAt: now });
  }

  // Тяжёлые суточные задания (архив, удаление фото, «спящие», автоочистка, отзывы) — раз в час, в первом запуске часа:
  // pg_cron зовёт каждые 10 минут, а этим заданиям точность до часа не нужна (экономия функций Vercel и базы)
  const hourly = now.getUTCMinutes() < CRON_EVERY_MIN;

  // ── Архив ──
  for (const o of hourly ? await repo.listOrdersByStatus(["active"]) : []) {
    if (o.expiresAt && o.expiresAt <= now && (await repo.transition(o.id, ["active"], "archived"))) r.archived++;
  }

  // ── Фото клиента: через 30 дней после того, как ссылка закрылась ──
  try {
    if (hourly) await removeExpiredFiles(deps, now, r);
  } catch (e) {
    r.errors++;
    console.error("cron photos", e instanceof Error ? e.name : "Error");
  }

  // ── Партнёры: оплаты, которые не начислились сразу (сбой в момент подтверждения) ──
  try {
    for (const o of await repo.uncreditedPartnerOrders()) await creditPartner(deps, o);
  } catch (e) {
    r.errors++;
    console.error("cron partners", e instanceof Error ? e.name : "Error");
  }

  // ── Партнёры: карточки владельцу после тихих часов, «спящие» ──
  try {
    r.partnerNotices = await flushOwnerNotices(deps);
    if (hourly) r.sleeping = await notifySleeping(deps);
  } catch (e) {
    r.errors++;
    console.error("cron partner notices", e instanceof Error ? e.name : "Error");
  }

  // ── v2, часть 7: отложенные на ночь сообщения, отчёты 20:00, выплаты 10:00 ──
  try {
    if (deps.env.marketing?.delivery && deps.repo.marketing) {
      await deps.repo.marketing.releaseExpired(now);
      await deps.repo.marketing.queueDeliveryAlert(now);
      r.notices = await flushMarketing(deps);
    } else r.notices = await flushNotices(deps);
    r.payDay = await payDayNotices(deps);
    r.evening = await eveningReports(deps);
    r.errorAlerts = await errorAlert(deps);
  } catch (e) {
    r.errors++;
    console.error("cron notices", e instanceof Error ? e.name : "Error");
  }

  // ── Рассылка об акции: «Охирги кун!» за 24 ч и отправка очереди (25 в секунду) ──
  try {
    r.broadcastQueued = await remindPromotions(deps);
    r.broadcastSent = (await runBroadcast(deps, { budgetMs: 20_000 })).sent;
  } catch (e) {
    r.errors++;
    console.error("cron broadcast", e instanceof Error ? e.name : "Error");
  }

  // ── v2, часть 10: напоминания не купившим, отзывы, автоочистка ──
  try {
    r.nudges = await nudges(deps);
    if (hourly) {
      r.reviews = await reviewRequests(deps);
      r.cleaned = await cleanup(deps);
    }
  } catch (e) {
    r.errors++;
    console.error("cron care", e instanceof Error ? e.name : "Error");
  }

  // ── Хозяину: вечерняя сводка ответов гостей ──
  try {
    await sendRsvpDigests(deps, now, r);
  } catch (e) {
    r.errors++;
    console.error("cron rsvp digest", e instanceof Error ? e.name : "Error");
  }

  // ── Утренняя самопроверка прода (после 09:00 по Алматы, раз в день; сообщение — только при проблемах).
  //    Последней: остальные задания cron не ждут ~100 запросов проверки ──
  if (deps.health)
    try {
      r.dailyAlerts = (await dailyCheck(deps, deps.health)).sent;
    } catch (e) {
      r.errors++;
      console.error("cron daily check", e instanceof Error ? e.name : "Error");
    }

  return r;
}
