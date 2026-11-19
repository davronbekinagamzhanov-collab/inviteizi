// Список аудиофайлов, которые реально лежат в public/audio/** → lib/audio-files.json.
// Список музыки (бот, Mini App) и демо-мелодии показывают только эти файлы (lib/music-available.ts):
// песня без файла (например, бывшая в Supabase Storage, 402) клиенту не предлагается.
// Запускается перед каждой сборкой (npm run build).  node scripts/audio-files.mjs [--check]
import { readdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const ROOT = "public";
const OUT = "lib/audio-files.json";

async function walk(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (/\.(mp3|m4a)$/i.test(e.name)) out.push("/" + path.relative(ROOT, p).split(path.sep).join("/"));
  }
  return out;
}

const files = (await walk(path.join(ROOT, "audio"))).sort();
const text = JSON.stringify(files, null, 2) + "\n";
if (process.argv.includes("--check")) {
  const old = existsSync(OUT) ? await readFile(OUT, "utf8") : "";
  if (old !== text) {
    console.error(`${OUT} устарел: запустите node scripts/audio-files.mjs`);
    process.exit(1);
  }
} else {
  await writeFile(OUT, text);
  console.log(`${OUT}: ${files.length} файлов`);
}
