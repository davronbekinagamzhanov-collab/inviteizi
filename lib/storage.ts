/**
 * Хранилище Supabase для сервера. Ключа service_role у сервера нет:
 * подписанные ссылки выдаёт edge-функция storage-gate (по секрету STORAGE_GATE_SECRET).
 * Публичные бакеты: art, previews, music. Приватные: receipts, deploy.
 */
import { env } from "./env";

export type Bucket = "art" | "previews" | "music" | "photos" | "receipts" | "deploy";
const PUBLIC_BUCKETS = new Set<Bucket>(["art", "previews", "music", "photos"]);

const encodePath = (path: string) => path.split("/").map(encodeURIComponent).join("/");

/** Постоянный адрес файла публичного бакета */
export function publicUrl(bucket: Bucket, path: string): string {
  return `${env.supabaseUrl()}/storage/v1/object/public/${bucket}/${encodePath(path)}`;
}

async function gate<T>(body: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${env.supabaseUrl()}/functions/v1/storage-gate`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-gate-secret": env.storageGateSecret() },
    body: JSON.stringify(body),
    cache: "no-store",
    signal,
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string; message?: string };
  if (!res.ok) throw new Error(`storage-gate ${res.status}: ${data.error ?? ""} ${data.message ?? ""}`.trim());
  return data;
}

/**
 * Загрузить файл (перезаписывает, если путь уже есть).
 * Возвращает публичный адрес (art/previews/music) или путь в бакете (receipts/deploy — читать через signedReadUrl).
 */
export async function uploadFile(
  bucket: Bucket,
  path: string,
  bytes: Uint8Array | ArrayBuffer | Blob,
  contentType: string,
  signal?: AbortSignal,
): Promise<string> {
  const { signedUrl } = await gate<{ signedUrl: string }>({ action: "signUpload", bucket, path }, signal);
  const res = await fetch(signedUrl, {
    method: "PUT",
    headers: { "content-type": contentType, "x-upsert": "true", "cache-control": "max-age=3600" },
    body: bytes as BodyInit,
    signal,
  });
  if (!res.ok) throw new Error(`Загрузка ${bucket}/${path}: ${res.status} ${await res.text().catch(() => "")}`);
  return PUBLIC_BUCKETS.has(bucket) ? publicUrl(bucket, path) : path;
}

/** Подписанная ссылка на загрузку прямо с телефона (своя песня из приложения: мимо лимита тела Vercel 4,5 МБ) */
export async function signedUpload(bucket: Bucket, path: string): Promise<{ signedUrl: string; url: string }> {
  const { signedUrl } = await gate<{ signedUrl: string }>({ action: "signUpload", bucket, path });
  return { signedUrl, url: publicUrl(bucket, path) };
}

/** Временная ссылка на чтение (для приватных бакетов: чеки) */
export async function signedReadUrl(bucket: Bucket, path: string, seconds = 3600): Promise<string> {
  const { signedUrl } = await gate<{ signedUrl: string }>({ action: "signRead", bucket, path, expiresIn: seconds });
  return signedUrl;
}

/** Удалить файлы бакета (фото клиента после конца приглашения). Нет файла — не ошибка */
export async function removeFiles(bucket: Bucket, paths: string[]): Promise<void> {
  for (const path of paths) await gate<{ ok: boolean }>({ action: "remove", bucket, path });
}
