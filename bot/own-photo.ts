/**
 * Фото клиента для приглашения: Telegram → сжатие в WebP → Storage (бакет photos).
 * Принимаем фото и документ-изображение (JPG, PNG, WEBP, HEIC…) до 10 МБ.
 * Весь путь укладывается в общий лимит функции (как песня клиента).
 */
import { isFileTooBig } from "./errors";

export const PHOTO_MAX_BYTES = 10 * 1024 * 1024;
/** Фото-документом в чате: Telegram отдаёт боту файлы до 20 МБ (камера Pixel/Samsung — 10–20 МБ), сжимаем до 1600 px */
export const PHOTO_CHAT_MAX_BYTES = 20 * 1024 * 1024;
export const PHOTO_MAX_COUNT = 3;
export const PHOTO_BUDGET_MS = 40_000;
/** Длинная сторона после сжатия: телефону больше не нужно */
const MAX_SIDE = 1600;

export class PhotoTooBigError extends Error {
  constructor() {
    super("Photo exceeds 10 MiB");
    this.name = "PhotoTooBigError";
  }
}

export class PhotoFormatError extends Error {
  constructor() {
    super("Unsupported image");
    this.name = "PhotoFormatError";
  }
}

export type PhotoIo = {
  getFileUrl(fileId: string): Promise<string>;
  fetch: typeof fetch;
  upload(bytes: Uint8Array, signal: AbortSignal): Promise<string>;
};

/** HEIC/HEIF (айфон): у sharp нет декодера HEVC — разбираем отдельно */
export function isHeic(bytes: Uint8Array) {
  if (bytes.byteLength < 12) return false;
  const box = Buffer.from(bytes.subarray(4, 12)).toString("latin1");
  return /^ftyp(heic|heix|hevc|hevx|heim|heis|mif1|msf1)$/.test(box);
}

/** Любое изображение → WebP, повёрнутое по EXIF, без метаданных (там бывает GPS) */
/** Фото в хранилище — не больше 600 КБ (трафик Vercel Blob): при необходимости ниже качество, потом размер */
export const PHOTO_STORED_MAX_BYTES = 600 * 1024;
const WEBP_STEPS = [
  { side: MAX_SIDE, quality: 80 },
  { side: MAX_SIDE, quality: 68 },
  { side: 1280, quality: 66 },
  { side: 1024, quality: 60 },
];

export async function toWebp(bytes: Uint8Array): Promise<Uint8Array> {
  let out: Uint8Array = new Uint8Array();
  for (const step of WEBP_STEPS) {
    out = await convert(bytes, (img) => img.webp({ quality: step.quality, effort: 4 }), step.side);
    if (out.byteLength <= PHOTO_STORED_MAX_BYTES) return out;
  }
  return out;
}

/** Чек из приложения → JPEG для Telegram (HEIC и WebP Telegram как фото не показывает) */
export async function toJpeg(bytes: Uint8Array): Promise<Uint8Array> {
  return convert(bytes, (img) => img.jpeg({ quality: 85, mozjpeg: true }));
}

type Sharp = import("sharp").Sharp;
async function convert(bytes: Uint8Array, encode: (img: Sharp) => Sharp, side = MAX_SIDE): Promise<Uint8Array> {
  const { default: sharp } = await import("sharp");
  let input: ReturnType<typeof sharp>;
  if (isHeic(bytes)) {
    const { default: decode } = await import("heic-decode");
    let img: { width: number; height: number; data: Uint8ClampedArray };
    try {
      img = await decode({ buffer: bytes });
    } catch {
      throw new PhotoFormatError();
    }
    input = sharp(Buffer.from(img.data.buffer, img.data.byteOffset, img.data.byteLength), {
      raw: { width: img.width, height: img.height, channels: 4 },
    });
  } else {
    input = sharp(bytes, { failOn: "none" }).rotate();
  }
  try {
    const out = await encode(
      input.resize({ width: side, height: side, fit: "inside", withoutEnlargement: true }),
    ).toBuffer();
    return new Uint8Array(out);
  } catch {
    throw new PhotoFormatError();
  }
}

async function readLimited(res: Response, max: number): Promise<Uint8Array> {
  const declared = Number(res.headers.get("content-length") ?? 0);
  if (declared > max) throw new PhotoTooBigError();
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.byteLength > max) throw new PhotoTooBigError();
  return buf;
}

export async function copyClientPhoto(fileId: string, io: PhotoIo, budgetMs = PHOTO_BUDGET_MS): Promise<string> {
  const signal = AbortSignal.timeout(budgetMs);
  const expired = new Promise<never>((_, reject) => {
    signal.addEventListener("abort", () => reject(signal.reason), { once: true });
  });
  expired.catch(() => {});
  const within = <T>(step: Promise<T>) => Promise.race([step, expired]);

  let source: string;
  try {
    source = await within(io.getFileUrl(fileId));
  } catch (e) {
    if (isFileTooBig(e)) throw new PhotoTooBigError();
    throw e;
  }
  const res = await within(io.fetch(source, { signal }));
  if (!res.ok) throw new Error(`Telegram file download: HTTP ${res.status}`);
  const bytes = await within(readLimited(res, PHOTO_CHAT_MAX_BYTES));
  if (!bytes.byteLength) throw new PhotoFormatError();
  const webp = await within(toWebp(bytes));
  const url = await within(io.upload(webp, signal));
  const check = await within(io.fetch(url, { method: "HEAD", signal, cache: "no-store" }));
  if (!check.ok) throw new Error(`Saved photo is not available: HTTP ${check.status}`);
  return url;
}

/** Наш адрес фото клиента: Vercel Blob (новые) или Supabase Storage (заказы до 17.11.2026) */
export const CLIENT_PHOTO_URL =
  /^https:\/\/(?:[a-z0-9]+\.public\.blob\.vercel-storage\.com|[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public)\/photos\/client\/[a-f0-9]{64}\.webp$/;

/** Путь файла в папке photos по его адресу */
export function photoPath(url: string): string | null {
  const m = /\/(?:storage\/v1\/object\/public\/)?photos\/(client\/[a-f0-9]{64}\.webp)$/.exec(url);
  return m && CLIENT_PHOTO_URL.test(url) ? m[1] : null;
}

/**
 * Фото и своя песня удаляются, когда ссылка закрылась: последний тадбир + 30 дней (или expires_at).
 * Решение 17.11.2026 (задание владельца: «через 30 дней после последнего тадбира»); прежде ждали ещё 30 дней.
 */
export const FILES_KEEP_AFTER_EXPIRY_MS = 0;
