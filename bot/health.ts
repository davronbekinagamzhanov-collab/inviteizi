/**
 * Проверка здоровья (cron каждые 10 минут, 17.11.2026): владелец узнаёт о поломке первым.
 *
 * Файлы: одна песня с сайта (/audio/…, Range 0-1) и один тестовый файл в Vercel Blob (health/ping.txt).
 *   Не 200/206 два запуска подряд → «⚠️ Файлы не открываются (код N)…», не чаще раза в час.
 *   Снова работают → «✅ Файлы снова работают». Состояние — отметки в bot_notices (без сообщений).
 * База: select 1 не прошёл → «⚠️ База данных не отвечает», не чаще раза в час; ожила → «✅».
 *   Пока базы нет, состояние хранится в Blob (health/db-down.txt), без Blob — в памяти процесса.
 *
 * Важно: cron запускает сама база (pg_cron). Если база полностью лежит, cron не придёт —
 * проверка базы ловит случаи «база жива, но сайт до неё не достаёт» (пул соединений, пароль, сеть).
 */
import type { Deps } from "./flow/types";
import { staff } from "@/texts/bot-ru";
import { env } from "@/lib/env";
import { publicUrl, removeUrls, storageConfigured, uploadFile } from "@/lib/storage";

const N = staff.n;
const MIN = 60_000;
const HOUR = 60 * MIN;
/** Песня для проверки: статика сайта (та же раздача, что у /audio/lib) */
export const HEALTH_SONG = "/audio/originals/inviteizi-sunnat-qutlug-qadam.mp3";
const PING = { bucket: "health" as const, path: "ping.txt" };
const DB_DOWN = { bucket: "health" as const, path: "db-down.txt" };

export type HealthIo = {
  fetch: typeof fetch;
  /** Получатели: OWNER_TELEGRAM_ID, иначе ADMIN_IDS (без базы) */
  recipients: () => number[];
};

export const defaultHealthIo = (): HealthIo => ({
  fetch,
  recipients: () => {
    const owner = env.ownerId();
    if (owner) return [owner];
    try {
      return env.adminIds();
    } catch {
      return [];
    }
  },
});

async function probe(io: HealthIo, url: string): Promise<number> {
  try {
    const res = await io.fetch(url, {
      headers: { range: "bytes=0-1" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    await res.body?.cancel().catch(() => {});
    return res.status;
  } catch {
    return 0; // сеть/таймаут
  }
}
const okStatus = (s: number) => s === 200 || s === 206;

/** Коды проблем с файлами; пусто — всё работает */
export async function fileProblems(deps: Deps, io: HealthIo): Promise<string[]> {
  const out: string[] = [];
  // Раз в час мимо кэша CDN (новый адрес ?h=), остальное время — из кэша: операций Blob почти не тратим
  const hour = Math.floor(+deps.now() / HOUR);
  const song = await probe(io, `${deps.env.publicBaseUrl.replace(/\/+$/, "")}${HEALTH_SONG}?h=${hour}`);
  if (!okStatus(song)) out.push(`музыка ${song || "нет ответа"}`);
  if (!storageConfigured()) {
    out.push("фото/своя песня: хранилище Blob не подключено");
    return out;
  }
  try {
    const url = `${publicUrl(PING.bucket, PING.path)}?h=${hour}`;
    let blob = await probe(io, url);
    if (blob === 404) {
      // Первый запуск: тестового файла ещё нет — кладём и проверяем снова
      await uploadFile(PING.bucket, PING.path, new TextEncoder().encode("ok"), "text/plain");
      blob = await probe(io, url);
    }
    if (!okStatus(blob)) out.push(`фото/своя песня ${blob || "нет ответа"}`);
  } catch (e) {
    out.push(`фото/своя песня: ${e instanceof Error ? e.name : "ошибка"}`);
  }
  return out;
}

async function tell(deps: Deps, io: HealthIo, text: string) {
  let sent = 0;
  for (const id of io.recipients())
    try {
      await deps.tg.sendMessage(id, text);
      sent++;
    } catch (e) {
      console.error("health notify", e instanceof Error ? e.name : "Error");
    }
  return sent;
}

/** Файлы: два сбоя подряд → сообщение (раз в час), восстановление → сообщение */
export async function checkFiles(deps: Deps, io: HealthIo = defaultHealthIo()) {
  const repo = deps.repo;
  if (!repo.lastNoticeAt || !repo.markNotice) return { problems: [] as string[], sent: 0 };
  const now = deps.now();
  const slot = Math.floor(+now / (10 * MIN));
  const problems = await fileProblems(deps, io);
  const lastFail = await repo.lastNoticeAt("health:files:fail:");
  const lastAlert = await repo.lastNoticeAt("health:files:alert:");
  const lastOk = await repo.lastNoticeAt("health:files:ok:");
  let sent = 0;
  if (problems.length) {
    // Предыдущий запуск (10 мин назад, с запасом на задержку cron) тоже не открыл файлы
    const failedBefore = !!lastFail && +lastFail >= +now - 25 * MIN && +lastFail < +now;
    await repo.markNotice(`health:files:fail:${slot}:`, now);
    if (failedBefore && (!lastAlert || +lastAlert <= +now - HOUR)) {
      sent = await tell(deps, io, N.filesDown(problems.join(", ")));
      if (sent) await repo.markNotice(`health:files:alert:${slot}:`, now);
    }
  } else if (lastAlert && (!lastOk || +lastOk < +lastAlert)) {
    sent = await tell(deps, io, N.filesUp);
    if (sent) await repo.markNotice(`health:files:ok:${slot}:`, now);
  }
  return { problems, sent };
}

/** Где помнить «база лежит» и когда писали последний раз (базы нет — в Blob, без Blob — в памяти) */
export type DbDownStore = { get(): Promise<Date | null>; set(at: Date): Promise<void>; clear(): Promise<void> };

let memoryDown: Date | null = null;
export const memoryDbStore = (): DbDownStore => ({
  get: async () => memoryDown,
  set: async (at) => void (memoryDown = at),
  clear: async () => void (memoryDown = null),
});

/** Отметка в Blob: содержимое — время последнего сообщения; нет Blob — память процесса */
export function blobDbStore(io: HealthIo): DbDownStore {
  const memory = memoryDbStore();
  if (!storageConfigured()) return memory;
  const url = () => publicUrl(DB_DOWN.bucket, DB_DOWN.path);
  return {
    async get() {
      try {
        const res = await io.fetch(url() + "?t=" + Date.now(), {
          cache: "no-store",
          signal: AbortSignal.timeout(5000),
        });
        if (res.status === 404) return await memory.get();
        const at = new Date((await res.text()).trim());
        return Number.isNaN(+at) ? await memory.get() : at;
      } catch {
        return memory.get();
      }
    },
    async set(at) {
      await memory.set(at);
      await uploadFile(DB_DOWN.bucket, DB_DOWN.path, new TextEncoder().encode(at.toISOString()), "text/plain").catch(
        () => undefined,
      );
    },
    async clear() {
      await memory.clear();
      await removeUrls([url()]).catch(() => undefined);
    },
  };
}

/**
 * База: true — отвечает. Сбой → владельцу «⚠️ База данных не отвечает» (раз в час);
 * после сбоя ожила → «✅ База данных снова работает».
 */
export async function checkDatabase(deps: Deps, io: HealthIo = defaultHealthIo(), store = blobDbStore(io)) {
  const now = deps.now();
  try {
    await deps.repo.ping?.();
  } catch (e) {
    const code = (e as { code?: string } | null)?.code ?? (e instanceof Error ? e.name : "ошибка");
    const last = await store.get();
    if (!last || +last <= +now - HOUR) {
      if (await tell(deps, io, N.dbDown(String(code).slice(0, 40)))) await store.set(now);
    }
    return false;
  }
  if (await store.get()) {
    await tell(deps, io, N.dbUp);
    await store.clear();
  }
  return true;
}
