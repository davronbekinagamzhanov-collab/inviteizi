/** Задания по расписанию: pg_cron каждые 10 минут шлёт POST с x-cron-secret (секрет проверяет база) */
import { createBotDeps } from "@/bot/deps";
import { handleCronRequest } from "@/bot/webhook";
import { checkCronSecret } from "@/lib/cron-auth";

export const maxDuration = 60;

export async function POST(req: Request) {
  if(process.env.VERCEL_ENV==="preview")return Response.json({ok:false},{status:404});
  return handleCronRequest(req, { check: checkCronSecret, getDeps: createBotDeps });
}
