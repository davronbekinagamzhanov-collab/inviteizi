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
import { PHOTO_KEEP_AFTER_EXPIRY_MS } from "./own-photo";
import { eveningReports, flushNotices, payDayNotices } from "./flow/notify";
import { cleanup, nudges, reviewRequests } from "./flow/care";
import { kzHour, QUIET_TO } from "@/lib/quiet-hours";

export type CronResult = {
  adminReminded: number;
  clientReminded: number;
  archived: number;
  rsvpDigests: number;
  photosRemoved: number;
  partnerNotices: number;
  sleeping: number;
  notices: number;
  payDay: number;
  evening: number;
  nudges: number;
  reviews: number;
  cleaned: number;
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

const ALL_STATUSES = ["draft", "preview", "awaiting_payment", "receipt_sent", "active", "archived", "rejected"] as const;

async function removeOldPhotos(deps: Deps, now: Date, r: CronResult) {
  if (!deps.removePhotos) return;
  for (const o of await deps.repo.listOrdersByStatus([...ALL_STATUSES])) {
    const photos = o.data.photos;
    const end = expiresAtOf(o);
    if (!photos?.length || !end || end.getTime() + PHOTO_KEEP_AFTER_EXPIRY_MS > now.getTime()) continue;
    await deps.removePhotos(photos);
    await deps.repo.updateOrder(o.id, { data: { ...o.data, photos: [] } });
    r.photosRemoved++;
  }
}

export async function runCron(deps: Deps): Promise<CronResult> {
  const { repo, tg } = deps;
  const now = deps.now();
  const r: CronResult = { adminReminded: 0, clientReminded: 0, archived: 0, rsvpDigests: 0, photosRemoved: 0, partnerNotices: 0, sleeping: 0, notices: 0, payDay: 0, evening: 0, nudges: 0, reviews: 0, cleaned: 0, errors: 0 };
  const ctx = { deps };

  // ── Админам: чек ждёт > 30 мин — днём (08:00–21:00), дальше каждые 2 часа до 21:00 ──
  const hour = kzHour(now);
  const waiting =
    hour >= QUIET_TO && hour < ADMIN_REMIND_UNTIL_HOUR
      ? (await repo.listOrdersByStatus(["receipt_sent"])).filter(
          (o) =>
            o.receiptAt &&
            +o.receiptAt <= +now - ADMIN_REMIND_AFTER_MIN * MIN &&
            (!o.adminRemindedAt || +o.adminRemindedAt <= +now - ADMIN_REMIND_EVERY_MIN * MIN || +o.adminRemindedAt < +o.receiptAt),
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
          await tg.sendMessage(adminId, `${tx.admin.remind(o.number, minutes)}\n\n${adminCard(deps, o, lang, client)}`, {
            markup: inline(decisionButtons(tx, o.number)),
          });
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
  for (const o of await repo.ordersAbandonedAtPayment(new Date(now.getTime() - CLIENT_REMIND_AFTER_MIN * MIN))) {
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

  // ── Архив ──
  for (const o of await repo.listOrdersByStatus(["active"])) {
    if (o.expiresAt && o.expiresAt <= now && (await repo.transition(o.id, ["active"], "archived"))) r.archived++;
  }

  // ── Фото клиента: через 30 дней после того, как ссылка закрылась ──
  try {
    await removeOldPhotos(deps, now, r);
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
    r.sleeping = await notifySleeping(deps);
  } catch (e) {
    r.errors++;
    console.error("cron partner notices", e instanceof Error ? e.name : "Error");
  }

  // ── v2, часть 7: отложенные на ночь сообщения, отчёты 20:00, выплаты 10:00 ──
  try {
    r.notices = await flushNotices(deps);
    r.payDay = await payDayNotices(deps);
    r.evening = await eveningReports(deps);
  } catch (e) {
    r.errors++;
    console.error("cron notices", e instanceof Error ? e.name : "Error");
  }

  // ── v2, часть 10: напоминания не купившим, отзывы, автоочистка ──
  try {
    r.nudges = await nudges(deps);
    r.reviews = await reviewRequests(deps);
    r.cleaned = await cleanup(deps);
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

  return r;
}
