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

export function audioFileInfo(filePath: string) {
  const ext = /\.([a-z0-9]+)$/i.exec(filePath)?.[1]?.toLowerCase() ?? "";
  return TYPES[ext] ?? TYPES.mp3;
}
