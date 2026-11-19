/**
 * Ответ гостя на приглашение. Без регистрации; от спама: проверка адреса сайта, лимит размера,
 * скрытое поле-ловушка, лимиты на заказ и на IP (в базе только хеш IP).
 */
import { createHmac } from "node:crypto";
import type { OrderRecord } from "./domain";

export const RSVP_MAX_NAME = 60;
export const RSVP_MAX_GUESTS = 20;
/** Всего ответов на один заказ */
export const RSVP_ORDER_LIMIT = 500;
/** Новых ответов с одного IP на один заказ за час */
export const RSVP_IP_HOUR_LIMIT = 20;
/** «Тилагингиз (ихтиёрий)» — пожелание гостя (этап 3) */
export const RSVP_MAX_WISH = 300;
// 300 кириллических знаков пожелания ≈ 600 байт UTF-8 + имя и служебные поля
const MAX_BODY = 2048;

export type RsvpInput = {
  orderId: string;
  visitorKey: string;
  name: string;
  guests: number;
  attending: boolean;
  ipHash: string;
  /** Пожелание гостя; null — без пожелания */
  wish?: string | null;
};
export type RsvpRecord = { name: string; guests: number; attending: boolean; updatedAt: Date; wish?: string | null };
export type RsvpRepo = {
  getOrderBySlug(slug: string): Promise<OrderRecord | null>;
  saveRsvp(input: RsvpInput): Promise<"ok" | "limited">;
};

/** Без управляющих и невидимых символов (в том числе смены направления текста) */
export function cleanName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const v = raw.replace(/[\p{Cc}\p{Cf}]/gu, " ").replace(/\s+/g, " ").trim();
  if (!/\p{L}/u.test(v) || [...v].length > RSVP_MAX_NAME) return null;
  return v;
}

/** Ссылки и контакты в пожелании не нужны: это канал спама (сайты, @каналы, домены) */
const LINK = /(https?:\/\/|www\.|t\.me\/|telegram\.me|wa\.me|@[a-z0-9_]{4,}|\b[a-z0-9-]+\.(com|ru|uz|kz|net|org|me|io|app|link|xyz|site|online|shop|info|biz|pro|club|store|top|tk)\b)/i;

/**
 * Пожелание: пусто → null; ≤ 300 знаков; без ссылок; «!!!!!!» и «ааааа» сжимаются до трёх знаков.
 * "long" / "link" — ошибка для гостя (форма подскажет), иначе — чистый текст.
 */
export function cleanWish(raw: unknown): string | null | "long" | "link" {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== "string") return "long";
  const v = raw
    .replace(/[\p{Cc}\p{Cf}]/gu, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/(.)\1{3,}/gu, "$1$1$1")
    .trim();
  if (!v) return null;
  if ([...v].length > RSVP_MAX_WISH) return "long";
  if (LINK.test(v)) return "link";
  return v;
}

export function parseRsvp(body: unknown) {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const name = cleanName(b.name);
  if (!name || typeof b.attending !== "boolean" || typeof b.slug !== "string" || !/^[a-z0-9-]{1,60}$/.test(b.slug)) return null;
  if (typeof b.visitorKey !== "string" || !/^[A-Za-z0-9-]{16,64}$/.test(b.visitorKey)) return null;
  const guests = b.attending ? b.guests : 0;
  if (!Number.isInteger(guests) || (guests as number) < (b.attending ? 1 : 0) || (guests as number) > RSVP_MAX_GUESTS) return null;
  const wish = cleanWish(b.wish);
  return { slug: b.slug, visitorKey: b.visitorKey, name, guests: guests as number, attending: b.attending, trap: b.website, wish };
}

export const ipHash = (ip: string, secret: string) => createHmac("sha256", secret).update(ip).digest("hex").slice(0, 32);

const clientIp = (r: Request) => (r.headers.get("x-vercel-forwarded-for") ?? r.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();

export async function handleRsvpRequest(request: Request, deps: { repo: RsvpRepo; secret: string; isOpen: (o: OrderRecord) => boolean }) {
  const reply = (status: number) => new Response(null, { status, headers: { "Cache-Control": "no-store" } });
  if (request.headers.get("origin") !== new URL(request.url).origin) return reply(400);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return reply(400);
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY) return reply(400);
  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY) return reply(400);
    body = JSON.parse(text);
  } catch {
    return reply(400);
  }
  const input = parseRsvp(body);
  if (!input) return reply(400);
  // Пожелание длиннее 300 знаков или со ссылкой — 422: форма покажет понятную подсказку, ответ не сохраняется
  if (input.wish === "long" || input.wish === "link")
    return new Response(JSON.stringify({ error: input.wish === "link" ? "wishLink" : "wishLong" }), {
      status: 422,
      headers: { "Cache-Control": "no-store", "content-type": "application/json" },
    });
  // Ловушка для роботов: притворяемся, что всё сохранилось
  if (input.trap) return reply(204);
  const order = await deps.repo.getOrderBySlug(input.slug);
  // Один ответ на все случаи: снаружи не узнать, какие заказы существуют
  if (!order || !order.data.rsvp || !deps.isOpen(order)) return reply(404);
  const saved = await deps.repo.saveRsvp({
    orderId: order.id,
    visitorKey: input.visitorKey,
    name: input.name,
    guests: input.guests,
    attending: input.attending,
    ipHash: ipHash(clientIp(request), deps.secret),
    wish: input.wish,
  });
  return reply(saved === "ok" ? 204 : 429);
}

export function rsvpTotals(list: RsvpRecord[]) {
  const coming = list.filter((r) => r.attending);
  return { replies: list.length, people: coming.reduce((n, r) => n + r.guests, 0), declined: list.length - coming.length };
}
