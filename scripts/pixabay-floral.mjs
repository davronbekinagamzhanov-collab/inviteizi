// Акварельные цветы для стиля «Гулли рамка»: прозрачные иллюстрации Pixabay (ключ PIXABAY_API_KEY из .env.local, не выводится).
//
// 1) Поиск: node --env-file=.env.local scripts/pixabay-floral.mjs search <set> "<english query>" [--n=16]
//    → art-raw/floral/<set>/sheet.jpg — лист кандидатов с номерами на кремовом фоне (видно прозрачность).
//    Берём только isAiGenerated=false, isLowQuality=false, image_type=illustration, colors=transparent.
// 2) Выбор: node --env-file=.env.local scripts/pixabay-floral.mjs pick <set> <k> --name=<file> [--width=1280] [--flip]
//    → public/floral/<file>.webp (с прозрачностью, обрезаны пустые поля), строка автора в public/floral/CREDITS.md.
//
// Правила Pixabay: файлы храним у себя, не больше 100 запросов в минуту. Лицензия — Pixabay Content License.
import sharp from "sharp";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const [cmd, set, ...rest] = process.argv.slice(2);
const opt = (name, def) => rest.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=") ?? def;
const flag = (name) => rest.includes(`--${name}`);
const KEY = process.env.PIXABAY_API_KEY;
if (!KEY) throw new Error("Нет PIXABAY_API_KEY: запускай с --env-file=.env.local");

const dir = `art-raw/floral/${set}`;
mkdirSync(dir, { recursive: true });
const metaPath = `${dir}/candidates.json`;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

async function download(url) {
  for (let i = 0; i < 5; i++) {
    const r = await fetch(url, { headers: { "User-Agent": "InviteIZI/1.0 (design assets)" } });
    if (r.ok) { await pause(600); return Buffer.from(await r.arrayBuffer()); }
    if (r.status !== 429) throw new Error(`Скачивание не удалось: ${r.status}`);
    await pause(3000 * 2 ** i);
  }
  throw new Error("Pixabay: слишком много запросов");
}

if (cmd === "search") {
  const query = rest.find((a) => !a.startsWith("--"));
  const n = Number(opt("n", 16));
  const params = new URLSearchParams({ key: KEY, q: query, image_type: "illustration", colors: "transparent", safesearch: "true", per_page: "60", order: "popular" });
  const json = await (await fetch(`https://pixabay.com/api/?${params}`)).json();
  const hits = json.hits.filter((h) => h.isAiGenerated === false && h.isLowQuality === false).slice(0, n);
  if (!hits.length) { console.log("Нет кандидатов"); process.exit(0); }
  const cell = 300;
  const tiles = [];
  for (const [k, h] of hits.entries()) {
    const buf = await download(h.webformatURL);
    const img = await sharp(buf).resize(cell - 20, cell - 40, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    const label = Buffer.from(`<svg width="${cell}" height="30"><text x="8" y="22" font-size="20" font-family="Arial" fill="#a00">${k} · ${h.imageWidth}×${h.imageHeight}</text></svg>`);
    tiles.push({ input: img, left: (k % 4) * cell + 10, top: Math.floor(k / 4) * cell + 30 }, { input: label, left: (k % 4) * cell, top: Math.floor(k / 4) * cell });
  }
  await sharp({ create: { width: cell * 4, height: cell * Math.ceil(hits.length / 4), channels: 3, background: "#f3ece1" } })
    .composite(tiles).jpeg({ quality: 82 }).toFile(`${dir}/sheet.jpg`);
  const prev = existsSync(metaPath) ? JSON.parse(readFileSync(metaPath, "utf8")) : {};
  writeFileSync(metaPath, JSON.stringify({ ...prev, query, hits: hits.map((h) => ({ id: h.id, pageURL: h.pageURL, user: h.user, large: h.largeImageURL, w: h.imageWidth, h: h.imageHeight, tags: h.tags })) }, null, 2));
  console.log(`Кандидатов: ${hits.length}. Лист: ${dir}/sheet.jpg`);
} else if (cmd === "pick") {
  const k = Number(rest.find((a) => !a.startsWith("--")));
  const name = opt("name", set);
  const width = Number(opt("width", 1280));
  const h = JSON.parse(readFileSync(metaPath, "utf8")).hits[k];
  if (!h) throw new Error(`Нет кандидата ${k}`);
  let img = sharp(await download(h.large)).ensureAlpha().trim({ threshold: 1 });
  if (flag("flip")) img = img.flop();
  mkdirSync("public/floral", { recursive: true });
  const out = `public/floral/${name}.webp`;
  const info = await img.resize({ width, withoutEnlargement: true }).webp({ quality: 82, alphaQuality: 90, effort: 6 }).toFile(out);
  const credits = "public/floral/CREDITS.md";
  if (!existsSync(credits)) writeFileSync(credits, "# Акварельные цветы: авторы и источники\n\nИллюстрации Pixabay (Pixabay Content License: можно менять и использовать в коммерческих целях без указания автора; автора всё равно указываем). Изменения: обрезка пустых полей, уменьшение, WebP с прозрачностью.\n\n");
  appendFileSync(credits, `- \`${name}.webp\` — ${h.user}, ${h.pageURL}${flag("flip") ? " (зеркально)" : ""}\n`);
  console.log(`${out}: ${info.width}×${info.height}, ${(info.size / 1024).toFixed(0)} КБ`);
} else throw new Error("Нужно: search <set> \"<query>\" | pick <set> <k> --name=<file>");
