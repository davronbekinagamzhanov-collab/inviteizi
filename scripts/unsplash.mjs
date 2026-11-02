// Фото с Unsplash для «натуральных» дизайнов (ключ UNSPLASH_ACCESS_KEY из .env.local, на экран не выводится).
//
// 1) Поиск (каждый запрос — один раз, ответ кэшируется в art-raw/unsplash/cache.json):
//    node --env-file=.env.local scripts/unsplash.mjs search <slot> "<english query>" [--orientation=portrait|landscape|squarish] [--n=12]
//    → art-raw/unsplash/<slot>/sheet.jpg — лист кандидатов с номерами.
// 2) Выбор:
//    node --env-file=.env.local scripts/unsplash.mjs pick <slot> <k>
//    → вызывает download-эндпоинт (правило Unsplash), пишет фото в templates/themes/natural/unsplash.json.
//
// Правила Unsplash: фото показываем по hotlink-адресу images.unsplash.com (с параметрами размера),
// на странице — «Сурат: Имя / Unsplash» со ссылками utm_source=inviteizi&utm_medium=referral.
// Demo-режим: 50 запросов в час. Превью (images.unsplash.com) в лимит не входят.
import sharp from "sharp";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";

const [cmd, slot, ...rest] = process.argv.slice(2);
const opt = (name, def) => rest.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=") ?? def;
const KEY = process.env.UNSPLASH_ACCESS_KEY;
if (!KEY) throw new Error("Нет UNSPLASH_ACCESS_KEY: запускай с --env-file=.env.local");
if (!cmd || !slot) throw new Error('Нужно: search <slot> "<query>" | pick <slot> <k>');

const root = "art-raw/unsplash";
const dir = `${root}/${slot}`;
mkdirSync(dir, { recursive: true });
const cachePath = `${root}/cache.json`;
const cache = existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, "utf8")) : {};
const picksPath = "templates/themes/natural/unsplash.json";

async function api(path) {
  const r = await fetch(`https://api.unsplash.com${path}`, {
    headers: { Authorization: `Client-ID ${KEY}`, "Accept-Version": "v1" },
  });
  const left = r.headers.get("x-ratelimit-remaining");
  if (left !== null) console.log(`(осталось запросов в этот час: ${left})`);
  if (!r.ok) throw new Error(`Unsplash ответил ${r.status}`);
  return r.json();
}

if (cmd === "search") {
  const query = rest.find((a) => !a.startsWith("--"));
  if (!query) throw new Error("Нужен запрос по-английски");
  const orientation = opt("orientation", "portrait");
  const n = Number(opt("n", "12"));
  const key = `${query}|${orientation}`;
  if (!cache[key]) {
    const params = new URLSearchParams({ query, orientation, per_page: "30", content_filter: "high" });
    const json = await api(`/search/photos?${params}`);
    cache[key] = json.results.map((p) => ({
      id: p.id,
      raw: p.urls.raw,
      small: p.urls.small,
      width: p.width,
      height: p.height,
      color: p.color,
      alt: p.alt_description ?? p.description ?? "",
      author: p.user.name,
      authorUrl: p.user.links.html,
      photoUrl: p.links.html,
      downloadLocation: p.links.download_location,
    }));
    writeFileSync(cachePath, JSON.stringify(cache, null, 1));
  } else console.log("(из кэша, запрос к API не делался)");

  const skip = new Set((opt("skip", "") || "").split(",").filter(Boolean).map(Number));
  const offset = Number(opt("offset", "0"));
  const hits = cache[key].slice(offset, offset + n).filter((_, i) => !skip.has(i + offset));
  const W = 240;
  const H = 320;
  const tiles = [];
  for (const [i, h] of hits.entries()) {
    const k = cache[key].indexOf(h);
    const r = await fetch(`${h.raw}&w=${W * 2}&h=${H * 2}&fit=crop&q=60&fm=jpg`);
    if (!r.ok) { console.log(`  ${k}: превью не скачалось (${r.status})`); continue; }
    const buf = Buffer.from(await r.arrayBuffer());
    const label = Buffer.from(
      `<svg width="${W}" height="${H}"><rect width="56" height="40" fill="rgba(0,0,0,.65)"/><text x="10" y="29" font-size="26" font-family="Arial" fill="#fff">${k}</text></svg>`,
    );
    const tile = await sharp(buf).resize(W, H, { fit: "cover" }).composite([{ input: label }]).jpeg().toBuffer();
    tiles.push({ input: tile, left: (tiles.length % 4) * W, top: Math.floor(tiles.length / 4) * H });
  }
  const rows = Math.ceil(hits.length / 4);
  await sharp({ create: { width: 4 * W, height: rows * H, channels: 3, background: "#ffffff" } })
    .composite(tiles)
    .jpeg({ quality: 80 })
    .toFile(`${dir}/sheet.jpg`);
  writeFileSync(`${dir}/query.txt`, key);
  console.log(`Кандидатов: ${hits.length}. Лист: ${dir}/sheet.jpg`);
  for (const h of hits) console.log(`  ${cache[key].indexOf(h)}: ${h.alt} — ${h.author} (${h.width}x${h.height})`);
}

if (cmd === "pick") {
  const k = Number(rest.find((a) => !a.startsWith("--")));
  const key = readFileSync(`${dir}/query.txt`, "utf8");
  const cand = cache[key]?.[k];
  if (!cand) throw new Error(`Нет кандидата ${k}`);
  // Правило Unsplash: отметить «скачивание» при выборе фото
  await api(cand.downloadLocation.replace("https://api.unsplash.com", ""));
  const picks = existsSync(picksPath) ? JSON.parse(readFileSync(picksPath, "utf8")) : {};
  picks[opt("as", slot)] = {
    id: cand.id,
    raw: cand.raw.split("?")[0] + "?ixid=" + new URL(cand.raw).searchParams.get("ixid"),
    width: cand.width,
    height: cand.height,
    color: cand.color,
    alt: cand.alt,
    author: cand.author,
    authorUrl: cand.authorUrl,
    photoUrl: cand.photoUrl,
  };
  const sorted = Object.fromEntries(Object.entries(picks).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(picksPath, JSON.stringify(sorted, null, 2) + "\n");
  console.log(`Выбрано: ${slot} ← ${cand.author} (${cand.photoUrl})`);
}
