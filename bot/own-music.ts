/**
 * Песня клиента: Telegram → Storage → проверка, что файл открывается.
 * Весь путь укладывается в общий лимит: функция живёт 60 с, и если её оборвёт платформа,
 * клиент не получит ответа, а Telegram будет повторять тот же update.
 */
import { isFileTooBig } from "./errors";
import { audioFileInfo, MAX_MUSIC_BYTES, OWN_MUSIC_TYPES, readAudioBytes } from "./audio-type";

export const OWN_MUSIC_MAX = MAX_MUSIC_BYTES;
export { OWN_MUSIC_TYPES };

export const MUSIC_BUDGET_MS = 40_000;

export class MusicTooBigError extends Error {
  constructor() {
    super("Audio exceeds 12 MiB");
    this.name = "MusicTooBigError";
  }
}

/** Не mp3/m4a (ogg, wav, flac…) */
export class MusicFormatError extends Error {
  constructor() {
    super("Only mp3/m4a");
    this.name = "MusicFormatError";
  }
}

export type MusicIo = {
  getFileUrl(fileId: string): Promise<string>;
  fetch: typeof fetch;
  upload(ext: string, bytes: Uint8Array, contentType: string, signal: AbortSignal): Promise<string>;
};

export async function copyOwnMusic(fileId: string, io: MusicIo, budgetMs = MUSIC_BUDGET_MS): Promise<string> {
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
    if (isFileTooBig(e)) throw new MusicTooBigError();
    throw e;
  }
  const res = await within(io.fetch(source, { signal }));
  if (!res.ok) throw new Error(`Telegram file download: HTTP ${res.status}`);
  const info = audioFileInfo(source);
  if (!info) {
    await res.body?.cancel().catch(() => {});
    throw new MusicFormatError();
  }
  const { ext, contentType } = info;
  let bytes: Uint8Array;
  try {
    bytes = await within(readAudioBytes(res));
  } catch (e) {
    if (e instanceof Error && /exceeds/.test(e.message)) throw new MusicTooBigError();
    throw e;
  }
  if (!bytes.byteLength) throw new Error("Empty audio file");
  const url = await within(io.upload(ext, bytes, contentType, signal));
  // «Сохранено» клиент увидит, только если гости смогут открыть этот адрес
  const check = await within(io.fetch(url, { method: "HEAD", signal, cache: "no-store" }));
  if (!check.ok) throw new Error(`Saved audio is not available: HTTP ${check.status}`);
  return url;
}

/**
 * Адрес своей песни → путь «own/<id>.<ext>». Чужой адрес — null.
 * Новые — Vercel Blob (…public.blob.vercel-storage.com/music/own/…), старые — Supabase Storage.
 */
export function ownMusicPath(url: string): string | null {
  const m =
    /^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\/music\/(own\/[a-f0-9]{16,64}\.[a-z0-9]{2,5})$/.exec(
      url,
    ) ??
    /^https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\/music\/(own\/[a-f0-9]{16,64}\.[a-z0-9]{2,5})$/.exec(
      url,
    );
  return m ? m[1] : null;
}
