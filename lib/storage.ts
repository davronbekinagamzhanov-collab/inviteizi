/**
 * Файлы клиентов (фото, своя песня) — Vercel Blob, публичное хранилище (17.11.2026).
 * Supabase Storage с 16.11 отвечает 402 (бесплатный трафик исчерпан) — новые файлы туда не пишем.
 * Старые адреса …supabase.co/storage/… в заказах читаются как есть; удаляются «по возможности» (legacy).
 *
 * Имена файлов непредсказуемые (HMAC/sha256 или 128 бит случайности) и без данных клиента,
 * поэтому публичное хранилище безопасно. Чеки сюда не попадают: они уходят владельцу в Telegram.
 * Токен: BLOB_READ_WRITE_TOKEN (Vercel → Storage → Blob → Connect to project). Нет токена — понятная ошибка.
 */
import { del, head, put } from "@vercel/blob";
import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";
import { env } from "./env";

export type Bucket = "music" | "photos" | "health";

/** Год в кэше: имя файла меняется вместе с содержимым */
const YEAR = 31_536_000;

export class StorageUnavailableError extends Error {
  constructor(reason: string) {
    super(`Файлы временно недоступны: ${reason}`);
    this.name = "StorageUnavailableError";
  }
}

function token(): string {
  const t = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!t) throw new StorageUnavailableError("не подключено хранилище Vercel Blob (BLOB_READ_WRITE_TOKEN)");
  return t;
}

/** Хранилище подключено (для проверок здоровья и понятных ответов) */
export const storageConfigured = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());

/** Адрес публичного хранилища: из токена vercel_blob_rw_<storeId>_<секрет> (или BLOB_PUBLIC_BASE_URL) */
export function blobBaseUrl(): string {
  const fixed = process.env.BLOB_PUBLIC_BASE_URL?.trim().replace(/\/+$/, "");
  if (fixed) return fixed;
  const m = /^vercel_blob_rw_([A-Za-z0-9]+)_/.exec(token());
  if (!m) throw new StorageUnavailableError("неверный формат BLOB_READ_WRITE_TOKEN");
  return `https://${m[1].toLowerCase()}.public.blob.vercel-storage.com`;
}

const pathname = (bucket: Bucket, path: string) => `${bucket}/${path.replace(/^\/+/, "")}`;

/** Постоянный адрес файла */
export function publicUrl(bucket: Bucket, path: string): string {
  return `${blobBaseUrl()}/${pathname(bucket, path).split("/").map(encodeURIComponent).join("/")}`;
}

/** Адрес из нашего Blob-хранилища (любой store-id Vercel Blob; путь — только наши папки) */
export const BLOB_URL =
  /^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\/(music|photos|health)\/[A-Za-z0-9._/-]+$/;
/** Старый адрес Supabase Storage (заказы до 17.11.2026) */
export const LEGACY_URL = /^https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\/(music|photos)\/(.+)$/;

/**
 * Адрес из НАШЕГО хранилища: Blob этого проекта (по токену) или наш старый Supabase.
 * Чужой store Vercel Blob с похожим адресом не принимается.
 */
export function isOurFileUrl(url: string): boolean {
  if (BLOB_URL.test(url)) {
    if (!storageConfigured()) return false;
    try {
      return url.startsWith(blobBaseUrl() + "/");
    } catch {
      return false;
    }
  }
  return LEGACY_URL.test(url) && url.startsWith(env.supabaseUrl() + "/storage/v1/object/public/");
}

/** Загрузить файл (перезаписывает тот же путь). Возвращает публичный адрес */
export async function uploadFile(
  bucket: Bucket,
  path: string,
  bytes: Uint8Array | ArrayBuffer | Blob,
  contentType: string,
  signal?: AbortSignal,
): Promise<string> {
  const body = bytes instanceof Blob ? bytes : Buffer.from(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
  const r = await put(pathname(bucket, path), body, {
    access: "public",
    token: token(),
    contentType,
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: YEAR,
    abortSignal: signal,
  });
  return r.url;
}

/**
 * Загрузка прямо с телефона (своя песня из приложения: мимо лимита тела Vercel 4,5 МБ).
 * Сервер выдаёт одноразовый клиентский токен только на этот путь, размер и типы; телефон грузит сам.
 */
export async function signedUpload(
  bucket: Bucket,
  path: string,
  limits: { maxBytes: number; contentTypes: string[] },
): Promise<{ clientToken: string; pathname: string; url: string }> {
  const name = pathname(bucket, path);
  const clientToken = await generateClientTokenFromReadWriteToken({
    token: token(),
    pathname: name,
    maximumSizeInBytes: limits.maxBytes,
    allowedContentTypes: limits.contentTypes,
    addRandomSuffix: false,
    allowOverwrite: false,
    cacheControlMaxAge: YEAR,
    validUntil: Date.now() + 15 * 60_000,
  });
  return { clientToken, pathname: name, url: publicUrl(bucket, path) };
}

/** Файл есть в хранилище (для проверки здоровья): код ответа */
export async function blobExists(bucket: Bucket, path: string): Promise<boolean> {
  try {
    await head(pathname(bucket, path), { token: token() });
    return true;
  } catch (e) {
    if (e instanceof Error && e.name === "BlobNotFoundError") return false;
    throw e;
  }
}

/** Удалить файлы по адресам. Blob — сразу; старые Supabase — по возможности (хранилище Supabase заблокировано) */
export async function removeUrls(urls: string[]): Promise<void> {
  const blob = urls.filter((u) => BLOB_URL.test(u));
  if (blob.length) await del(blob, { token: token() });
  const legacy = urls.map((u) => LEGACY_URL.exec(u)).filter((m): m is RegExpExecArray => Boolean(m));
  for (const [, bucket, path] of legacy)
    try {
      await legacyRemove(bucket, decodeURIComponent(path));
    } catch (e) {
      // Supabase Storage отвечает 402: файл останется там, ссылка в заказе всё равно очищается
      console.error("storage legacy remove", e instanceof Error ? e.message.slice(0, 80) : "Error");
    }
}

async function legacyRemove(bucket: string, path: string) {
  const res = await fetch(`${env.supabaseUrl()}/functions/v1/storage-gate`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-gate-secret": env.storageGateSecret() },
    body: JSON.stringify({ action: "remove", bucket, path }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`storage-gate ${res.status}`);
}
