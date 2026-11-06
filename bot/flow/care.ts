/**
 * v2, часть 10: забота о клиенте.
 *  - Напоминания не купившим: через 1, 7, 14, 28 дней после последнего действия, только 11:00–19:00,
 *    всего не больше 4, тексты тёплые и разные. [▶️ Давом этиш] [👁 Каталог] [🔕 Бошқа юборманг].
 *    Не шлём: оплатил (или чек на проверке), отписался, заблокировал бота (403), сотрудники и партнёры.
 *    Каждое напоминание — свой ключ в очереди: повтор cron второго не пришлёт.
 *  - Отзыв через день после последнего тадбира: ⭐1–5, текст по желанию; 4–5 ⭐ — просьба поделиться ботом.
 *  - Автоочистка: неоплаченные заказы без изменений 30 дней и их фото/песни. Оплаченное — никогда.
 */
import { isPaid } from "@/lib/analytics";
import { kzDay } from "@/lib/money";
import { isQuiet, kzHour } from "@/lib/quiet-hours";
import type { OrderRecord } from "@/lib/domain";
import { isUnreachable } from "../errors";
import type { InlineButton } from "../tg";
import { panelData } from "./partners";
import { editOrSend, inline, namesOf, txFor } from "./util";
import type { Ctx, Deps } from "./types";

const DAY = 86_400_000;
/** Через сколько дней после последнего действия — 1-е, 2-е, 3-е, 4-е напоминание */
export const NUDGE_DAYS = [1, 7, 14, 28];
export const NUDGE_FROM = 11;
export const NUDGE_TO = 19;
/** Неоплаченный заказ, созданный раньше, и клиент не заходил в бот столько дней — удаляется */
export const STALE_DAYS = 30;
/** Отзыв просим не позже недели после тадбира (старые заказы при выкладке не трогаем) */
const REVIEW_WINDOW_DAYS = 7;

const OPEN = new Set(["draft", "preview", "awaiting_payment", "rejected"]);

/** Отправить с ключом; заблокировал бота — отключаем ему напоминания. true — отправлено */
async function sendOnce(deps: Deps, key: string, chatId: number, text: string, markup: { inline: InlineButton[][] }) {
  const now = deps.now();
  if (!(await deps.repo.queueNotice({ key, chatId, text, markup, dueAt: now }))) return false;
  if (!(await deps.repo.claimNotice(key, now))) return false;
  try {
    await deps.tg.sendMessage(chatId, text, { markup });
    return true;
  } catch (e) {
    if (isUnreachable(e)) await deps.repo.setNudge(chatId, { off: true });
    console.error("care send", e instanceof Error ? e.name : "Error");
    return false;
  }
}

// ── Напоминания ──

export async function nudges(deps: Deps) {
  const now = deps.now();
  const h = kzHour(now);
  if (h < NUDGE_FROM || h >= NUDGE_TO) return 0;
  const s = await panelData(deps);
  const partnerIds = new Set(s.partners.map((p) => p.telegramId).filter((x): x is number => x !== null));
  const byUser = new Map<number, typeof s.orders>();
  for (const o of s.orders) byUser.set(o.userId, [...(byUser.get(o.userId) ?? []), o]);
  let sent = 0;
  for (const [userId, orders] of byUser) {
    // Оплатил или чек на проверке — не напоминаем; партнёр — тоже
    if (partnerIds.has(userId) || orders.some((o) => isPaid(o) || o.status === "receipt_sent")) continue;
    const open = orders.filter((o) => OPEN.has(o.status)).sort((a, b) => +b.updatedAt - +a.updatedAt);
    if (!open.length) continue;
    // Тадбир уже прошёл — напоминать незачем
    const full = await deps.repo.getOrder(open[0].id);
    const last = full ? lastEventDate(full) : undefined;
    if (last && last < kzDay(now)) continue;
    const user = await deps.repo.getUser(userId);
    if (!user || user.nudgeOff) continue;
    const k = user.nudgeCount ?? 0;
    if (k >= NUDGE_DAYS.length) continue;
    // От последнего действия самого клиента (служебные отметки заказа не считаются)
    const anchor = Math.max(+open.reduce((d, o) => (o.createdAt > d ? o.createdAt : d), open[0].createdAt), +user.lastSeenAt);
    if (+now - anchor < NUDGE_DAYS[k] * DAY) continue;
    const tx = txFor(user.lang);
    const cont: InlineButton = deps.env.miniAppUrl ? { text: tx.care.cont, webApp: deps.env.miniAppUrl } : { text: tx.care.cont, data: `edit:${open[0].number}` };
    const markup = inline([[cont, { text: tx.care.catalog, url: `${deps.env.publicBaseUrl}/catalog` }], [{ text: tx.care.stop, data: "care:stop" }]]);
    if (await sendOnce(deps, `nudge:${userId}:${k}`, userId, tx.care.nudges[k], markup)) sent++;
    // Счётчик растёт, даже если ключ уже был (повтор после сбоя): больше 4 не будет никогда
    await deps.repo.setNudge(userId, { count: k + 1 });
  }
  return sent;
}

/** «🔕 Бошқа юборманг» */
export async function stopNudges(c: Ctx) {
  await c.deps.repo.setNudge(c.user.id, { off: true });
  await c.deps.tg.editMessageReplyMarkup(c.chatId, c.u.messageId, null).catch(() => undefined);
  if (c.u.kind === "callback") {
    await c.deps.tg.answerCallbackQuery(c.u.callbackId, { text: c.tx.care.stopped });
    c.answered = true;
  }
}

// ── Отзывы ──

const lastEventDate = (o: OrderRecord) => o.data.events.map((e) => e.date).sort().at(-1);

export async function reviewRequests(deps: Deps) {
  const now = deps.now();
  if (isQuiet(now) || kzHour(now) < NUDGE_FROM) return 0;
  const staff = new Set(await deps.repo.staffIds());
  const today = kzDay(now);
  let sent = 0;
  for (const o of await deps.repo.listOrdersByStatus(["active", "archived"])) {
    if (staff.has(o.userId)) continue;
    const last = lastEventDate(o);
    if (!last) continue;
    const days = Math.round((Date.parse(today) - Date.parse(last)) / DAY);
    if (days < 1 || days > REVIEW_WINDOW_DAYS) continue;
    const user = await deps.repo.getUser(o.userId);
    const tx = txFor(user?.lang);
    const stars = tx.care.stars.map((t, i) => ({ text: t, data: `rv:${o.number}:${i + 1}` }));
    if (await sendOnce(deps, `review:${o.id}`, o.userId, tx.care.reviewAsk(namesOf(o.data)), inline([stars.slice(0, 3), stars.slice(3)]))) sent++;
  }
  return sent;
}

/** rv:<номер>:<звёзды> — оценка; дальше ждём текст по желанию */
export async function rate(c: Ctx, nArg: string, starsArg: string) {
  const o = await c.deps.repo.getOrderByNumber(Number(nArg));
  const stars = Number(starsArg);
  if (!o || o.userId !== c.user.id || !Number.isInteger(stars) || stars < 1 || stars > 5) {
    if (c.u.kind === "callback") {
      await c.deps.tg.answerCallbackQuery(c.u.callbackId, { text: c.tx.oldButton });
      c.answered = true;
    }
    return;
  }
  await c.deps.repo.saveReview({ orderId: o.id, userId: c.user.id, stars });
  c.s.reviewFor = o.id;
  c.s.reviewStars = stars;
  await editOrSend(c, `${c.tx.care.stars[stars - 1]}\n\n${c.tx.care.reviewText}`, inline([[{ text: c.tx.care.reviewSkip, data: `rv:${o.number}:skip` }]]));
}

/** Конец отзыва: спасибо; 4–5 ⭐ — просьба поделиться ботом */
async function finishReview(c: Ctx, edit: boolean) {
  const stars = c.s.reviewStars ?? 0;
  delete c.s.reviewFor;
  delete c.s.reviewStars;
  const bot = `https://t.me/${await c.deps.tg.botUsername()}`;
  const share = `https://t.me/share/url?url=${encodeURIComponent(bot)}&text=${encodeURIComponent(c.tx.care.shareText)}`;
  const text = stars >= 4 ? c.tx.care.shareAsk : c.tx.care.reviewThanks;
  const markup = inline(stars >= 4 ? [[{ text: c.tx.care.shareButton, url: share }]] : []);
  if (edit) await editOrSend(c, text, markup);
  else await c.deps.tg.sendMessage(c.chatId, text, markup.inline.length ? { markup } : undefined);
}

/** rv:<номер>:skip — без текста */
export async function skipReviewText(c: Ctx) {
  if (!c.s.reviewFor) {
    await c.deps.tg.editMessageReplyMarkup(c.chatId, c.u.messageId, null).catch(() => undefined);
    return;
  }
  await finishReview(c, true);
}

/** Текст отзыва (первое сообщение после оценки). true — сообщение забрано */
export async function reviewText(c: Ctx): Promise<boolean> {
  if (c.u.kind !== "text" || !c.s.reviewFor) return false;
  const text = c.u.text.replace(/[\p{Cc}\p{Cf}]/gu, " ").trim().slice(0, 600);
  if (!text) return false;
  await c.deps.repo.saveReview({ orderId: c.s.reviewFor, userId: c.user.id, text });
  await finishReview(c, false);
  return true;
}

// ── Автоочистка ──

export async function cleanup(deps: Deps) {
  const now = deps.now();
  const before = new Date(+now - STALE_DAYS * DAY);
  const removed = await deps.repo.deleteStaleDrafts(before);
  // Анкета без заказа (фото и песня уже загружены, но заказ не оформлен) — тоже очищается
  for (const u of await deps.repo.staleDraftStates(before)) {
    const st = u.state as { data?: { photos?: string[] }; music?: { kind?: string; url?: string } };
    removed.push({ photos: st.data?.photos ?? [], music: st.music?.kind === "own" ? (st.music.url ?? null) : null });
    await deps.repo.saveStep(u.id, "idle", {});
  }
  if (!removed.length) return 0;
  await removeUnusedMedia(deps, removed);
  return removed.length;
}

/** Удалить из хранилища фото и песни удалённых заказов. Файл мог достаться и другому заказу (та же песня, то же фото) — такие не трогаем */
export async function removeUnusedMedia(deps: Deps, removed: { photos: string[]; music: string | null }[]) {
  const left = await deps.repo.listOrdersByStatus(["draft", "preview", "awaiting_payment", "receipt_sent", "active", "archived", "rejected"]);
  const used = new Set(left.flatMap((o) => [...(o.data.photos ?? []), ...(o.music.kind === "own" && o.music.url ? [o.music.url] : [])]));
  const photos = [...new Set(removed.flatMap((r) => r.photos))].filter((u) => !used.has(u));
  const music = [...new Set(removed.map((r) => r.music).filter((u): u is string => Boolean(u)))].filter((u) => !used.has(u));
  if (photos.length) await deps.removePhotos?.(photos);
  if (music.length) await deps.removeMusic?.(music);
}
