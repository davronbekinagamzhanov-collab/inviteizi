/**
 * Тихие часы 22:00–08:00 (Алматы, UTC+5 круглый год): бот сам никому не пишет, отвечает только на действия.
 * Отложенное уходит после 08:00 (cron каждые 10 минут проверяет час).
 */
const HOUR = 60 * 60_000;
const KZ_OFFSET = 5 * HOUR;
export const QUIET_FROM = 22;
export const QUIET_TO = 8;

/** Час по времени Казахстана (0–23) */
export const kzHour = (now: Date) => new Date(now.getTime() + KZ_OFFSET).getUTCHours();

export function isQuiet(now: Date) {
  const h = kzHour(now);
  return h >= QUIET_FROM || h < QUIET_TO;
}

/** Начало сегодняшнего дня по Казахстану (для «один раз в день») */
export function kzDayStart(now: Date) {
  const local = now.getTime() + KZ_OFFSET;
  return new Date(Math.floor(local / (24 * HOUR)) * 24 * HOUR - KZ_OFFSET);
}
