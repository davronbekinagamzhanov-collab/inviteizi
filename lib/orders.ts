/**
 * Заказ для страницы /{slug}: что показать гостю (полную версию, НАМУНА или заглушку).
 * Только сервер. Логика выбора режима — чистые функции (тесты: lib/orders.test.ts).
 */
import { cache } from "react";
import { connection } from "next/server";
import type { InvitationData, InvitationEvent, OrderRecord } from "./domain";
import { db } from "./db";
import { demoMusicUrl } from "./music";
import { isPlayableMusicUrl } from "./music-available";

export type PageMode = "full" | "demo" | "expired";

/** Дизайн (templates/registry) здесь не подключается: его берёт страница — так картинка-превью не тянет код всех дизайнов */
export type InvitationPage = {
  order: OrderRecord;
  /** Данные для шаблона: данные заказа + музыка заказа */
  data: InvitationData;
  mode: PageMode;
  expiresAt: Date | null;
};

const DAY = 24 * 60 * 60_000;
/** Ссылка работает до последнего тадбира + столько дней */
export const LINK_DAYS_AFTER_EVENT = 30;
/** Персональная НАМУНА: ровно 24 часа с создания, правки срок не продлевают. */
export const DEMO_HOURS = 24;

/** Последний тадбир + 30 дней, до конца того дня по времени Казахстана (UTC+5). Нет тадбиров — null */
export function computeExpiresAt(events: InvitationEvent[]): Date | null {
  const last = events.map((e) => e.date).filter(Boolean).sort().at(-1);
  if (!last) return null;
  const endOfDay = new Date(`${last}T23:59:59+05:00`);
  if (Number.isNaN(endOfDay.getTime())) return null;
  return new Date(endOfDay.getTime() + LINK_DAYS_AFTER_EVENT * DAY);
}

export function expiresAtOf(order: OrderRecord): Date | null {
  return order.expiresAt ?? computeExpiresAt(order.data.events);
}

/** active → полная; archived или срок прошёл → заглушка; остальное (до оплаты, отказ) → НАМУНА */
export function pageMode(order: OrderRecord, now: Date): PageMode {
  if (order.status === "archived") return "expired";
  const exp = expiresAtOf(order);
  if (exp && now.getTime() > exp.getTime()) return "expired";
  if (order.status !== "active" && now.getTime() >= order.createdAt.getTime() + DAY) return "expired";
  return order.status === "active" ? "full" : "demo";
}

/** Данные шаблона: музыка из списка → её файл; своя → файл в бакете music; без музыки → noMusic */
export function invitationData(order: OrderRecord, listMusicUrl?: string | null): InvitationData {
  const rest = { ...order.data };
  delete rest.musicUrl;
  delete rest.noMusic;
  delete rest.rsvpSlug;
  if (rest.rsvp) rest.rsvpSlug = order.slug;
  const m = order.music;
  if (m.kind === "none") return { ...rest, noMusic: true };
  const url = m.kind === "list" ? listMusicUrl : m.url;
  // Песня больше не играет (была в Supabase Storage — 402 с 16.11.2026, или её файла нет на сайте):
  // гость слышит демо-мелодию своего тадбира, а не тишину и не ошибку в журнале
  const playable = m.kind === "list" ? isPlayableMusicUrl(url) : Boolean(url) && !isDeadStorageUrl(url!);
  if (playable) return { ...rest, musicUrl: url! };
  const fallback = demoMusicUrl(order.occasion);
  return fallback ? { ...rest, musicUrl: fallback } : { ...rest, noMusic: true };
}

/** Своя песня клиента в прежнем Supabase Storage — не открывается (402) */
const isDeadStorageUrl = (url: string) => /\.supabase\.co\/storage\//.test(url);

async function musicFileUrl(musicId: string): Promise<string | null> {
  const [r] = await db()<{ file_url: string }[]>`select file_url from public.music where id = ${musicId}`;
  return r?.file_url ?? null;
}

/** Старый адрес заказа (клиент сменил ссылку) → текущий. Нет такого — null */
export async function currentSlugFor(slug: string): Promise<string | null> {
  if (!/^[a-z0-9-]{1,60}$/.test(slug)) return null;
  const { PgRepo } = await import("@/bot/repo-pg");
  const current = await new PgRepo().resolveSlug(slug);
  return current && current !== slug ? current : null;
}

/** Заказ по адресу. Нет заказа — null (страница отдаёт 404). Один запрос на рендер (cache) */
export const getInvitationBySlug = cache(async (slug: string): Promise<InvitationPage | null> => {
  // Каждый запрос — свежие данные из базы (после оплаты НАМУНА сменяется полной версией), не пререндер
  await connection();
  if (!/^[a-z0-9-]{1,60}$/.test(slug)) return null;
  const { PgRepo } = await import("@/bot/repo-pg");
  const order = await new PgRepo().getOrderBySlug(slug);
  if (!order) return null;
  const listUrl = order.music.kind === "list" ? await musicFileUrl(order.music.musicId) : null;
  return {
    order,
    data: invitationData(order, listUrl),
    mode: pageMode(order, new Date()),
    expiresAt: expiresAtOf(order),
  };
});
