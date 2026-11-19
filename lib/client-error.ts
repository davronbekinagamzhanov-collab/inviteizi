/**
 * Ошибки звука с настоящих телефонов (17.11.2026; маршрут /api/demo-event?t=audio) → bot_errors. Без данных клиента: имя ошибки, состояние <audio>,
 * адрес файла музыки (без параметров), где открыто (iframe Mini App / Telegram / браузер), дизайн, user-agent.
 * Не больше 20 записей в час с одного адреса; тело ≤ 2 КБ.
 */
import { PgRepo } from "@/bot/repo-pg";
import { allow } from "@/lib/rate-limit";

const LIMIT = { max: 20, windowMs: 3_600_000 };
const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : null);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

export async function handleClientError(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!allow(`client-error:${ip}`, LIMIT)) return new Response(null, { status: 429 });
  const raw = await req.text();
  if (raw.length > 2048) return new Response(null, { status: 413 });
  let b: Record<string, unknown>;
  try {
    b = JSON.parse(raw);
  } catch {
    return new Response(null, { status: 400 });
  }
  const name = str(b.name, 40);
  if (!name || !/^[A-Za-z]+$/.test(name)) return new Response(null, { status: 400 });
  // Только адрес музыки: /audio/…, своя песня в Vercel Blob (…/music/…) или старый Supabase Storage
  const src = str(b.src, 160);
  const safeSrc =
    src &&
    /^(\/audio\/|\/music\/|https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\/music\/|https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\/music\/)/.test(
      src,
    )
      ? src
      : null;
  const where = ["iframe", "telegram", "browser"].includes(String(b.where)) ? String(b.where) : "unknown";
  const design = str(b.design, 40);
  try {
    await new PgRepo().logBotError({
      step: "audio",
      updateKind: "client",
      errorName: name,
      errorCode: `${num(b.networkState) ?? "-"}/${num(b.readyState) ?? "-"}/${num(b.errorCode) ?? "-"}`,
      message: JSON.stringify({
        src: safeSrc,
        where,
        design: design && /^[a-z0-9-]+$/.test(design) ? design : null,
        ua: str(b.ua, 200),
      }),
      stack: null,
      outcome: "ack",
    });
  } catch (e) {
    console.error("client-error", e instanceof Error ? e.name : "Error");
  }
  return new Response(null, { status: 204 });
}
