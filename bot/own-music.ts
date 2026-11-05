/**
 * Песня клиента: Telegram → Storage → проверка, что файл открывается.
 * Весь путь укладывается в общий лимит: функция живёт 60 с, и если её оборвёт платформа,
 * клиент не получит ответа, а Telegram будет повторять тот же update.
 */
import { isFileTooBig } from "./errors";
import { audioFileInfo, readAudioBytes } from "./audio-type";

export const MUSIC_BUDGET_MS = 40_000;

export class MusicTooBigError extends Error {
  constructor() {
    super("Audio exceeds 20 MiB");
    this.name = "MusicTooBigError";
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
  const within = <T,>(step: Promise<T>) => Promise.race([step, expired]);

  let source: string;
  try {
    source = await within(io.getFileUrl(fileId));
  } catch (e) {
    if (isFileTooBig(e)) throw new MusicTooBigError();
    throw e;
  }
  const res = await within(io.fetch(source, { signal }));
  if (!res.ok) throw new Error(`Telegram file download: HTTP ${res.status}`);
  const { ext, contentType } = audioFileInfo(source);
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

/** Публичный адрес своей песни → путь в бакете music («own/<id>.mp3»). Чужой адрес — null */
export function ownMusicPath(url: string): string | null {
  const m = /\/storage\/v1\/object\/public\/music\/(own\/[a-f0-9]{16,64}\.[a-z0-9]{2,5})$/.exec(url);
  return m ? m[1] : null;
}
