/** Тип файла песни клиента по пути из Telegram getFile (Telegram отдаёт application/octet-stream) */
const TYPES: Record<string, { ext: string; contentType: string }> = {
  mp3: { ext: "mp3", contentType: "audio/mpeg" },
  m4a: { ext: "m4a", contentType: "audio/mp4" },
  mp4: { ext: "m4a", contentType: "audio/mp4" },
  ogg: { ext: "ogg", contentType: "audio/ogg" },
  oga: { ext: "ogg", contentType: "audio/ogg" },
  opus: { ext: "ogg", contentType: "audio/ogg" },
  wav: { ext: "wav", contentType: "audio/wav" },
  flac: { ext: "flac", contentType: "audio/flac" },
  aac: { ext: "aac", contentType: "audio/aac" },
};

export const MAX_MUSIC_BYTES = 20 * 1024 * 1024;

/** Bound the actual download too: Telegram metadata/Content-Length may be absent. */
export async function readAudioBytes(response: Response): Promise<Uint8Array> {
  const tooBig = () => new Error("Audio exceeds 20 MiB");
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

export function audioFileInfo(filePath: string) {
  const ext = /\.([a-z0-9]+)$/i.exec(filePath)?.[1]?.toLowerCase() ?? "";
  return TYPES[ext] ?? TYPES.mp3;
}
