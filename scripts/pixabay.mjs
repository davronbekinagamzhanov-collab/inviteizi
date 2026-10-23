// Фото для дизайнов с Pixabay (ключ PIXABAY_API_KEY из .env.local, на экран не выводится).
//
// 1) Поиск кандидатов:
//    node --env-file=.env.local scripts/pixabay.mjs search <id> "<english query>" [--n=12] [--orientation=vertical|horizontal|all]
//    → art-raw/<id>/cand-<k>.jpg (превью) и art-raw/<id>/sheet.jpg — один лист со всеми кандидатами и номерами.
//      Берём только настоящие фото: isAiGenerated=false, isLowQuality=false.
// 2) Выбор:
//    node --env-file=.env.local scripts/pixabay.mjs pick <id> <k> [--blur=3] [--width=1080] [--name=<id>]
//    → public/art/<name>.webp (≤ 300 КБ, размытие «запечено»), строка автора в public/art/CREDITS.md.
//
// Правила Pixabay: файлы скачиваем к себе (не ссылкой), не больше 100 запросов в минуту, без массовых выкачиваний.
import sharp from "sharp";
import { mkdirSync, readFileSync, writeFileSync, existsSync, statSync } from "node:fs";

const [cmd, id, ...rest] = process.argv.slice(2);
const opt = (name, def) => rest.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=") ?? def;
const KEY = process.env.PIXABAY_API_KEY;
if (!KEY) throw new Error("Нет PIXABAY_API_KEY: запускай с --env-file=.env.local");
if (!cmd || !id) throw new Error("Нужно: search <id> \"<query>\" | pick <id> <k>");

const dir = `art-raw/${id}`;
mkdirSync(dir, { recursive: true });
const metaPath = `${dir}/candidates.json`;

const pause = (ms) => new Promise((res) => setTimeout(res, ms));

// CDN Pixabay ограничивает частоту: качаем по одному, с паузой и повтором при 429
async function download(url) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const r = await fetch(url, { headers: { "User-Agent": "InviteIZI/1.0 (design assets)" } });
    if (r.ok) {
      await pause(700);
      return Buffer.from(await r.arrayBuffer());
    }
    if (r.status !== 429) throw new Error(`Скачивание не удалось: ${r.status}`);
    await pause(3000 * 2 ** attempt);
  }
  throw new Error("Pixabay: слишком много запросов, попробуй через минуту");
}

if (cmd === "search") {
  const query = rest.find((a) => !a.startsWith("--"));
  if (!query) throw new Error("Нужен запрос по-английски");
  const n = Number(opt("n", "12"));
  const params = new URLSearchParams({
    key: KEY,
    q: query,
    image_type: "photo",
    orientation: opt("orientation", "vertical"),
    safesearch: "true",
    per_page: "60",
    order: "popular",
  });
  const r = await fetch(`https://pixabay.com/api/?${params}`);
  if (!r.ok) throw new Error(`Pixabay ответил ${r.status}`);
  const json = await r.json();
  const hits = json.hits.filter((h) => h.isAiGenerated === false && h.isLowQuality === false).slice(0, n);
  if (!hits.length) {
    console.log("Ничего не найдено (после фильтра AI/низкое качество). Попробуй другой запрос.");
    process.exit(0);
  }

  const W = 240;
  const H = 360;
  const tiles = [];
  for (const [k, h] of hits.entries()) {
    const buf = await download(h.webformatURL);
    writeFileSync(`${dir}/cand-${k}.jpg`, buf);
    const label = Buffer.from(
      `<svg width="${W}" height="${H}"><rect x="0" y="0" width="56" height="40" fill="rgba(0,0,0,.65)"/><text x="10" y="29" font-size="26" font-family="Arial" fill="#fff">${k}</text></svg>`,
    );
    const tile = await sharp(buf).resize(W, H, { fit: "cover" }).composite([{ input: label }]).jpeg().toBuffer();
    tiles.push({ input: tile, left: (k % 4) * W, top: Math.floor(k / 4) * H });
  }
  const rows = Math.ceil(hits.length / 4);
  await sharp({ create: { width: 4 * W, height: rows * H, channels: 3, background: "#ffffff" } })
    .composite(tiles)
    .jpeg({ quality: 80 })
    .toFile(`${dir}/sheet.jpg`);

  writeFileSync(
    metaPath,
    JSON.stringify(
      hits.map((h, k) => ({
        k,
        id: h.id,
        pageURL: h.pageURL,
        user: h.user,
        tags: h.tags,
        largeImageURL: h.largeImageURL,
        size: `${h.imageWidth}x${h.imageHeight}`,
      })),
      null,
      2,
    ),
  );
  console.log(`Кандидатов: ${hits.length}. Лист: ${dir}/sheet.jpg`);
  for (const h of hits.slice(0, n)) console.log(`  ${hits.indexOf(h)}: ${h.tags} (${h.imageWidth}x${h.imageHeight})`);
}

if (cmd === "pick") {
  const k = Number(rest.find((a) => !a.startsWith("--")));
  if (!existsSync(metaPath)) throw new Error("Сначала search");
  const cand = JSON.parse(readFileSync(metaPath, "utf8")).find((c) => c.k === k);
  if (!cand) throw new Error(`Нет кандидата ${k}`);
  const name = opt("name", id);
  const blur = Number(opt("blur", "3"));
  const width = Number(opt("width", "1080"));
  const src = await download(cand.largeImageURL);
  writeFileSync(`${dir}/large-${k}.jpg`, src);

  mkdirSync("public/art", { recursive: true });
  const out = `public/art/${name}.webp`;
  const LIMIT = 300 * 1024;
  let ok = false;
  for (const [w, q] of [
    [width, 80],
    [width, 72],
    [width, 64],
    [Math.round(width * 0.85), 64],
    [Math.round(width * 0.75), 60],
  ]) {
    let img = sharp(src).resize({ width: w, withoutEnlargement: true });
    if (blur > 0) img = img.blur(Math.max(0.3, blur * (w / 1080)));
    await img.webp({ quality: q, effort: 6 }).toFile(out);
    const size = statSync(out).size;
    console.log(`${out}: ${w}px q${q} blur ${blur} → ${Math.round(size / 1024)} КБ`);
    if (size <= LIMIT) {
      ok = true;
      break;
    }
  }
  if (!ok) throw new Error("Не удалось уложиться в 300 КБ");

  // Автор и источник
  const credits = "public/art/CREDITS.md";
  const head = "# Фото: авторы и источники\n\nВсе фото — Pixabay (Pixabay Content License), скачаны и сжаты для InviteIZI.\n\n";
  const lines = existsSync(credits)
    ? readFileSync(credits, "utf8").split("\n").filter((l) => l.startsWith("- "))
    : [];
  const line = `- \`${name}.webp\` — ${cand.user}, ${cand.pageURL}`;
  const next = [...lines.filter((l) => !l.startsWith(`- \`${name}.webp\``)), line].sort();
  writeFileSync(credits, head + next.join("\n") + "\n");
  console.log(`Готово: ${out}. Автор записан в ${credits}`);
}
