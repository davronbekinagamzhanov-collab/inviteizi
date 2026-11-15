/**
 * Ограничение частоты запросов на пользователя (скользящее окно, в памяти процесса).
 * На Vercel у каждого экземпляра функции своя память, поэтому это «мягкий» барьер от спама одним
 * пользователем (подписанные ссылки на 20 МБ, загрузки фото и чеков, частые запросы панели),
 * а не строгий глобальный счётчик. Строгие лимиты денег и промокодов — в PostgreSQL.
 */
export type Limit = { max: number; windowMs: number };

export const LIMITS = {
  /** Любое действие приложения */
  api: { max: 90, windowMs: 60_000 },
  /** Подписанная ссылка на загрузку своей песни (до 20 МБ) */
  musicUpload: { max: 6, windowMs: 10 * 60_000 },
  /** Загрузка фото клиента и чека */
  upload: { max: 20, windowMs: 10 * 60_000 },
} satisfies Record<string, Limit>;

const hits = new Map<string, number[]>();
const MAX_KEYS = 50_000;

/** true — можно; false — превышен лимит (ответить 429) */
export function allow(key: string, limit: Limit, now = Date.now()): boolean {
  const from = now - limit.windowMs;
  const list = (hits.get(key) ?? []).filter((t) => t > from);
  if (list.length >= limit.max) {
    hits.set(key, list);
    return false;
  }
  list.push(now);
  if (!hits.has(key) && hits.size >= MAX_KEYS) hits.delete(hits.keys().next().value!);
  hits.set(key, list);
  return true;
}

/** Только для тестов */
export function resetRateLimits() {
  hits.clear();
}
