/**
 * HTTP-обработчики без привязки к Next: app/api/bot и app/api/cron только передают сюда запрос.
 * Так их можно проверить тестами с FakeTg и MemoryRepo.
 */
import { checkDatabase } from "./health";
import { timingSafeEqual } from "node:crypto";
import type { Update } from "grammy/types";
import type { Deps } from "./flow/types";
import { handle } from "./flow";
import { normalizeUpdate } from "./update";
import { runCron } from "./cron";

function sameSecret(got: string | null, want: string) {
  if (!got || !want) return false;
  const a = Buffer.from(got);
  const b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}

const json = (body: unknown, status = 200) => Response.json(body, { status });

/** Telegram → POST /api/bot. Заголовок X-Telegram-Bot-Api-Secret-Token = TELEGRAM_WEBHOOK_SECRET, иначе 401 */
export async function handleWebhookRequest(req: Request, opts: { secret: string; getDeps: () => Deps }): Promise<Response> {
  if (!sameSecret(req.headers.get("x-telegram-bot-api-secret-token"), opts.secret)) return json({ ok: false }, 401);
  let update: Update;
  let u;
  try {
    update = (await req.json()) as Update;
    if (!update || typeof update !== "object" || !Number.isSafeInteger(update.update_id)) return json({ok:false},400);
    u = normalizeUpdate(update);
  } catch {
    return json({ ok: false }, 400);
  }
  if (!u) return json({ ok: true });
  try {
    if (!(await handle(opts.getDeps(), u))) return json({ok:false},503);
  } catch (e) {
    // Do not acknowledge an update lost before processing. No tokens or identifiers in logs.
    console.error("bot handle failed", e instanceof Error ? e.name : "Error");
    return json({ok:false},503);
  }
  return json({ ok: true });
}

/** pg_cron → POST /api/cron с x-cron-secret (проверка — в базе, см. lib/cron-auth.ts) */
export async function handleCronRequest(
  req: Request,
  opts: { check: (secret: string) => Promise<boolean>; getDeps: () => Deps },
): Promise<Response> {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || !(await opts.check(secret))) return json({ ok: false }, 401);
  const deps = opts.getDeps();
  // База не отвечает — владельцу сообщение (раз в час), остальные задания без базы бессмысленны
  if (deps.health && !(await checkDatabase(deps, deps.health))) return json({ ok: false, db: false }, 503);
  const result = await runCron(deps);
  return json({ ok: true, ...result });
}
