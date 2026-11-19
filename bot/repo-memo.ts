/**
 * Этап 3, п.3 (скорость): кэш «кто этот человек» на время ОДНОГО обновления Telegram.
 * Роль (админ / менеджер / партнёр / оптовик) раньше проверялась 4 раза за обновление — по 3–4 запроса к базе
 * (и каждый раз UPDATE привязки партнёра по username). Теперь — один раз; любая запись сбрасывает кэш,
 * поэтому смена роли в этом же обновлении (стал менеджером, подключил партнёра) видна сразу.
 */
import type { Repo } from "./repo";

const CACHED = new Set(["getUser", "isAdmin", "getManager", "findPartnerForUser", "getWholesaler", "listAdminIds", "staffIds", "activePromotion", "listPromotions"]);
/** Методы-записи: после них кэш чистится (на всякий случай — широкий список префиксов) */
const WRITE = /^(add|remove|bind|update|set|create|use|decide|delete|claim|accept|reject|approve|issue|save|mark|touch|log|record|confirm|release|pay|stop|start|assign|revoke|grant|clear|reset|apply|cancel|upsert|insert)/;

export function memoRepo(repo: Repo): Repo {
  const cache = new Map<string, Promise<unknown>>();
  return new Proxy(repo, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof prop !== "string" || typeof value !== "function") return value;
      if (CACHED.has(prop))
        return (...args: unknown[]) => {
          const key = `${prop}:${JSON.stringify(args)}`;
          let hit = cache.get(key);
          if (!hit) {
            hit = (value as (...a: unknown[]) => Promise<unknown>).apply(target, args);
            // ошибку не кэшируем: следующий вызов спросит базу снова
            hit.catch(() => cache.delete(key));
            cache.set(key, hit);
          }
          return hit;
        };
      if (WRITE.test(prop))
        return (...args: unknown[]) => {
          cache.clear();
          return (value as (...a: unknown[]) => unknown).apply(target, args);
        };
      return value.bind(target);
    },
  });
}
