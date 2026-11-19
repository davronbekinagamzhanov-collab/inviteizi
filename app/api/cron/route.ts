/** Задания по расписанию: pg_cron каждые 10 минут шлёт POST с x-cron-secret (секрет проверяет база) */
import { createBotDeps } from "@/bot/deps";
import { handleCronRequest } from "@/bot/webhook";
import { checkCronSecret } from "@/lib/cron-auth";
import { handleRenderCallback } from "@/bot/render-callback";
import { env } from "@/lib/env";

export const maxDuration = 60;

/** ?t=render — ответ runner'а видео (Bearer RENDER_CALLBACK_SECRET); один маршрут: лимит 12 функций Vercel Hobby */
export async function POST(req: Request) {
  if (new URL(req.url).searchParams.get("t") === "render") return handleRenderCallback(req, env.renderCallbackSecret(), createBotDeps);
  if (process.env.VERCEL_ENV === "preview") return Response.json({ ok: false }, { status: 404 });
  return handleCronRequest(req, { check: checkCronSecret, getDeps: createBotDeps });
}
