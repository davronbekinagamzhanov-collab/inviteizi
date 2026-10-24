// Загружает картинки и музыку проекта в хранилище Supabase (через edge-функцию storage-gate):
//   public/covers/* → previews,  public/art/* → art.
// Музыку загружает scripts/music-sync.mjs (по папкам тадбиров, с таблицей music).
// Идемпотентно: файл с тем же размером уже лежит в бакете — пропускается; иначе перезаписывается.
// Запуск: node --env-file=.env.local scripts/upload-assets.mjs [--force]
import "./ts-hooks.mjs";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const { uploadFile, publicUrl } = await import("../lib/storage.ts");

const force = process.argv.includes("--force");
const TYPES = {
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
};
const SOURCES = [
  ["public/covers", "previews"],
  ["public/art", "art"],
];

/** Сеть бывает нестабильной: до 4 попыток с паузой */
async function retry(fn) {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i >= 4) throw e;
      await new Promise((r) => setTimeout(r, 2000 * i));
    }
  }
}

let uploaded = 0;
let skipped = 0;
for (const [dir, bucket] of SOURCES) {
  if (!existsSync(dir)) {
    console.log(`— ${dir}: папки нет, пропуск`);
    continue;
  }
  for (const name of readdirSync(dir)) {
    const file = path.join(dir, name);
    const type = TYPES[path.extname(name).toLowerCase()];
    if (!type || !statSync(file).isFile()) continue;
    const size = statSync(file).size;
    if (!force) {
      const head = await retry(() => fetch(publicUrl(bucket, name), { method: "HEAD" }));
      if (head.ok && Number(head.headers.get("content-length")) === size) {
        skipped++;
        continue;
      }
    }
    const url = await retry(() => uploadFile(bucket, name, readFileSync(file), type));
    uploaded++;
    console.log(`↑ ${bucket}/${name} (${Math.round(size / 1024)} КБ) → ${url}`);
  }
}
console.log(`Готово: загружено ${uploaded}, уже были ${skipped}`);
