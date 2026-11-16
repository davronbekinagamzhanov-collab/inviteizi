// Версии обложек каталога: короткий хеш содержимого каждого файла public/covers/** → templates/cover-versions.json.
// Адрес обложки получает ?v=<хеш> (lib/cover-version.ts): /covers кэшируется на год, а после замены картинки
// адрес меняется сам — телефон и Telegram берут новую. Запускается перед каждой сборкой (npm run build).
//   node scripts/cover-versions.mjs [--check]  (--check: только проверить, что файл актуален)
import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = "public";
const OUT = "templates/cover-versions.json";

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (/\.(webp|jpg|jpeg|png)$/i.test(e.name)) out.push(p);
  }
  return out;
}

const files = (await walk(path.join(ROOT, "covers"))).sort();
const map = {};
for (const f of files) {
  const url = "/" + path.relative(ROOT, f).split(path.sep).join("/");
  map[url] = createHash("sha256")
    .update(await readFile(f))
    .digest("hex")
    .slice(0, 10);
}
const json = JSON.stringify(map, null, 1) + "\n";
if (process.argv.includes("--check")) {
  const old = await readFile(OUT, "utf8").catch(() => "");
  if (old !== json) {
    console.error(`${OUT} устарел: запустите node scripts/cover-versions.mjs`);
    process.exit(1);
  }
} else {
  await writeFile(OUT, json);
  console.log(`${OUT}: ${files.length} обложек`);
}
