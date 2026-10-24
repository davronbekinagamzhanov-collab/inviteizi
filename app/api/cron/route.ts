/** Задания по расписанию: pg_cron каждые 10 минут шлёт POST с x-cron-secret (секрет проверяет база) */
import { createBotDeps } from "@/bot/deps";
import { handleCronRequest } from "@/bot/webhook";
import { checkCronSecret } from "@/lib/cron-auth";

export const maxDuration = 60;

export async function POST(req: Request) {
  return handleCronRequest(req, { check: checkCronSecret, getDeps: createBotDeps });
}
