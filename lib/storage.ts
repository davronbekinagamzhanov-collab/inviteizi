/**
 * Хранилище Supabase для сервера. Ключа service_role у сервера нет:
 * подписанные ссылки выдаёт edge-функция storage-gate (по секрету STORAGE_GATE_SECRET).
 * Публичные бакеты: art, previews, music. Приватные: receipts, deploy.
 */
import { env } from "./env";

export type Bucket = "art" | "previews" | "music" | "receipts" | "deploy";
const PUBLIC_BUCKETS = new Set<Bucket>(["art", "previews", "music"]);

const encodePath = (path: string) => path.split("/").map(encodeURIComponent).join("/");

/** Постоянный адрес файла публичного бакета */
export function publicUrl(bucket: Bucket, path: string): string {
  return `${env.supabaseUrl()}/storage/v1/object/public/${bucket}/${encodePath(path)}`;
}

async function gate<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${env.supabaseUrl()}/functions/v1/storage-gate`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-gate-secret": env.storageGateSecret() },
    body: JSON.stringify(body),
    cache: "no-store",
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
): Promise<string> {
  const { signedUrl } = await gate<{ signedUrl: string }>({ action: "signUpload", bucket, path });
  const res = await fetch(signedUrl, {
    method: "PUT",
    headers: { "content-type": contentType, "x-upsert": "true", "cache-control": "max-age=3600" },
    body: bytes as BodyInit,
  });
  if (!res.ok) throw new Error(`Загрузка ${bucket}/${path}: ${res.status} ${await res.text().catch(() => "")}`);
  return PUBLIC_BUCKETS.has(bucket) ? publicUrl(bucket, path) : path;
}

/** Временная ссылка на чтение (для приватных бакетов: чеки) */
export async function signedReadUrl(bucket: Bucket, path: string, seconds = 3600): Promise<string> {
  const { signedUrl } = await gate<{ signedUrl: string }>({ action: "signRead", bucket, path, expiresIn: seconds });
  return signedUrl;
}
