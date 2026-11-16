/**
 * Своя песня клиента (17.11.2026, Vercel Blob): только mp3 и m4a, до 12 МБ.
 * Сжимать на сервере нельзя, поэтому лимит меньше прежних 20 МБ (трафик хранилища).
 * Тип — по пути из Telegram getFile (Telegram отдаёт application/octet-stream).
 */
const TYPES: Record<string, { ext: "mp3" | "m4a"; contentType: string }> = {
  mp3: { ext: "mp3", contentType: "audio/mpeg" },
  m4a: { ext: "m4a", contentType: "audio/mp4" },
  mp4: { ext: "m4a", contentType: "audio/mp4" },
};
/** Разрешённые форматы своей песни → Content-Type в хранилище */
export const OWN_MUSIC_TYPES = { mp3: "audio/mpeg", m4a: "audio/mp4" } as const;

export const MAX_MUSIC_BYTES = 12 * 1024 * 1024;

/** mp3/m4a по имени файла или типу; иначе null (ogg, wav, flac, голосовые — не принимаем) */
export function ownAudioFormat(
  fileName: string | null | undefined,
  mimeType: string | null | undefined,
): "mp3" | "m4a" | null {
  const ext = /\.([a-z0-9]+)$/i.exec(fileName ?? "")?.[1]?.toLowerCase();
  if (ext) return TYPES[ext]?.ext ?? null;
  const mime = (mimeType ?? "").toLowerCase();
  if (/^audio\/(mpeg|mp3)$/.test(mime)) return "mp3";
  if (/^audio\/(mp4|x-m4a|m4a)$/.test(mime)) return "m4a";
  return null;
}

/** Bound the actual download too: Telegram metadata/Content-Length may be absent. */
export async function readAudioBytes(response: Response): Promise<Uint8Array> {
  const tooBig = () => new Error("Audio exceeds 12 MiB");
  if (Number(response.headers.get("content-length")) > MAX_MUSIC_BYTES) {
    await response.body?.cancel().catch(() => {});
    throw tooBig();
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Missing audio body");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_MUSIC_BYTES) {
        await reader.cancel().catch(() => {});
        throw tooBig();
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}

/** Тип по пути Telegram. Без расширения — mp3 (так Telegram отдаёт музыку из каналов); чужой формат — null */
export function audioFileInfo(filePath: string) {
  const ext = /\.([a-z0-9]+)$/i.exec(filePath)?.[1]?.toLowerCase() ?? "";
  if (!ext) return TYPES.mp3;
  return TYPES[ext] ?? null;
}
