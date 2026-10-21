// Генерация черновиков картин через Pollinations.
// Промпты берутся из art-prompts.md (раздел «## <id> — …», следующая строка — промпт).
// Запуск: node scripts/gen-art.mjs [id ...]   → art-raw/<id>-<seed>.jpg
// Пауза между запросами — GAP_MS.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";

const SEEDS = (process.env.SEEDS ?? "11,2026,777").split(",").map(Number);
// Сейчас бесплатный лимит — 1 картинка в 45 с с одного IP (раньше было 15 с)
const GAP_MS = 50_000;

const md = readFileSync("art-prompts.md", "utf8");
const prompts = {};
for (const m of md.matchAll(/^## ([a-z0-9-]+) — .*\n(.+)$/gm)) prompts[m[1]] = m[2].trim();

const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(prompts);
mkdirSync("art-raw", { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let last = 0;

for (const id of ids) {
  if (!prompts[id]) throw new Error(`Нет промпта для ${id}`);
  for (const seed of SEEDS) {
    const out = `art-raw/${id}-${seed}.jpg`;
    if (existsSync(out)) continue;
    const url =
      `https://image.pollinations.ai/prompt/${encodeURIComponent(prompts[id])}` +
      `?width=1080&height=1920&model=flux&nologo=true&seed=${seed}`;

    for (let attempt = 1; attempt <= 3; attempt++) {
      const wait = last + GAP_MS - Date.now();
      if (wait > 0) await sleep(wait);
      last = Date.now();
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(180_000) });
        const type = res.headers.get("content-type") ?? "";
        if (!res.ok || !type.startsWith("image/")) throw new Error(`${res.status} ${type}`);
        writeFileSync(out, Buffer.from(await res.arrayBuffer()));
        console.log("ok", out);
        break;
      } catch (e) {
        console.log("ошибка", out, `попытка ${attempt}:`, e.message);
      }
    }
  }
}
