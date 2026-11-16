// «Наш список» музыки: public/music/<папка тадбира>/*.mp3 → хранилище (бакет music) + таблица music.
// Папки: nikoh, nahorgi-osh, sunnat, yubiley. Владелец просто кладёт mp3 в нужную папку и запускает:
//   node --env-file=.env.local scripts/music-sync.mjs [--dry]
// Что делает (повторный запуск ничего не дублирует):
//  1) имя файла → латиница kebab-case («Janob Rasul - To'y-to'y.mp3» → janob-rasul-toy-toy.mp3), файл переименовывается;
//  2) файлы больше 20 МБ и не mp3 — пропускает с предупреждением;
//  3) загружает файл в хранилище, если его там нет или размер другой;
//  4) строка в music: название (texts/music-titles.ts, иначе из имени файла), тадбир, «исполнитель», порядок;
//  5) временные мелодии (сделанные кодом) скрываются, если у тадбира есть настоящие файлы;
//     треки, файлов которых больше нет, скрываются (is_active = false), а не удаляются.
// 17.11.2026: Supabase Storage больше не используется (с 16.11 отвечает 402). Песни библиотеки лежат на сайте: public/audio/lib/<тадбир>/<имя>.mp3, адреса — SQL supabase/release/music-local-urls.sql.
console.error("Скрипт отключён: Supabase Storage больше не используется. Песни библиотеки лежат на сайте: public/audio/lib/<тадбир>/<имя>.mp3, адреса — SQL supabase/release/music-local-urls.sql.");
process.exit(1);

import "./ts-hooks.mjs";
import { readdirSync, renameSync, statSync, existsSync } from "node:fs";
import path from "node:path";

const { MUSIC_FOLDERS, trackId, trackPath, trackFileName } = await import("../lib/music.ts");
const { musicTitles, titleFromFile } = await import("../texts/music-titles.ts");
const { uploadFile, publicUrl } = await import("../lib/storage.ts");
const { db, closeDb } = await import("../lib/db.ts");

const DRY = process.argv.includes("--dry");
const MAX = 20 * 1024 * 1024;
const ROOT = "public/music";

const rows = [];
for (const [occasion, folder] of Object.entries(MUSIC_FOLDERS)) {
  const dir = path.join(ROOT, folder);
  if (!existsSync(dir)) continue;
  for (const file of readdirSync(dir)) {
    const full = path.join(dir, file);
    if (!statSync(full).isFile()) continue;
    if (!/\.mp3$/i.test(file)) {
      console.warn(`⚠ ${folder}/${file}: не mp3 — пропущен`);
      continue;
    }
    const size = statSync(full).size;
    if (size > MAX) {
      console.warn(`⚠ ${folder}/${file}: больше 20 МБ — пропущен`);
      continue;
    }
    const original = file.replace(/\.mp3$/i, "");
    let name = trackFileName(file);
    if (name !== original) {
      if (existsSync(path.join(dir, `${name}.mp3`))) name = `${name}-2`;
      if (!DRY) renameSync(full, path.join(dir, `${name}.mp3`));
      console.log(`↻ ${folder}/${file} → ${name}.mp3`);
    }
    const title = musicTitles[name] ?? titleFromFile(original);
    rows.push({ occasion, name, size, title, file: path.join(dir, `${name}.mp3`) });
  }
}

// Порядок в списке: мелодия демо, мелодии без слов, песни исполнителей, временные мелодии
const rank = (r) => (r.title.demo ? 0 : r.title.generated ? 3 : r.title.artist ? 2 : 1);
rows.sort((a, b) => a.occasion.localeCompare(b.occasion) || rank(a) - rank(b) || a.name.localeCompare(b.name));
const hasReal = new Set(rows.filter((r) => !r.title.generated).map((r) => r.occasion));

if (DRY) {
  for (const r of rows) console.log(`${r.occasion.padEnd(8)} ${r.name.padEnd(40)} ${r.title.uz}${r.title.artist ? " [исполнитель]" : ""}${r.title.generated ? " [временная]" : ""}`);
  process.exit(0);
}

const sql = db();
const ids = [];
let sort = 0;
for (const r of rows) {
  const storagePath = trackPath(r.occasion, r.name);
  const url = publicUrl("music", storagePath);
  const head = await fetch(url, { method: "HEAD" });
  if (!head.ok || Number(head.headers.get("content-length")) !== r.size) {
    const { readFileSync } = await import("node:fs");
    await uploadFile("music", storagePath, new Uint8Array(readFileSync(r.file)), "audio/mpeg");
    console.log(`⬆ ${storagePath} (${Math.round(r.size / 1024)} КБ)`);
  }
  const id = trackId(r.occasion, r.name);
  ids.push(id);
  const active = !(r.title.generated && hasReal.has(r.occasion));
  await sql`
    insert into public.music (id, title_uz, title_ru, file_url, sort, is_active, occasion, is_artist, is_generated)
    values (${id}, ${r.title.uz}, ${r.title.ru}, ${url}, ${sort++}, ${active}, ${r.occasion}, ${Boolean(r.title.artist)}, ${Boolean(r.title.generated)})
    on conflict (id) do update set
      title_uz = excluded.title_uz, title_ru = excluded.title_ru, file_url = excluded.file_url, sort = excluded.sort,
      is_active = excluded.is_active, occasion = excluded.occasion, is_artist = excluded.is_artist, is_generated = excluded.is_generated`;
}
// файлов больше нет — скрыть (заказы, выбравшие трек, продолжают ссылаться на него)
await sql`update public.music set is_active = false where occasion is not null and not (id = any(${ids}))`;

const summary = await sql`
  select occasion, count(*) filter (where is_active) as active, count(*) filter (where is_active and is_artist) as artists
  from public.music where occasion is not null group by occasion order by occasion`;
for (const s of summary) console.log(`${s.occasion}: в списке ${s.active} (из них песен исполнителей ${s.artists})`);
await closeDb();
