/**
 * Проверка заголовка x-cron-secret у /api/cron.
 * Секрет хранится только в базе (vault, создан миграцией cron) — в env его нет.
 * Сравнение делает функция public.check_cron_secret (выполнять может только inviteizi_server).
 */
import { db } from "./db";

export async function checkCronSecret(secret: string): Promise<boolean> {
  if (typeof secret !== "string" || secret.length === 0 || secret.length > 200) return false;
  try {
    const [r] = await db()<{ ok: boolean }[]>`select public.check_cron_secret(${secret}) as ok`;
    return r?.ok === true;
  } catch (e) {
    console.error("checkCronSecret: нет доступа к базе", e instanceof Error ? e.name : "Error");
    return false;
  }
}
