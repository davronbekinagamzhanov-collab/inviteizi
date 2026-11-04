// Видео-фоны с Pixabay (ключ PIXABAY_API_KEY из .env.local, на экран не выводится). Только настоящие (не ИИ).
//
// 1) node --env-file=.env.local scripts/pixabay-video.mjs search <slot> "<query>"  → art-raw/pixabay-video/<slot>/sheet.jpg
// 2) node --env-file=.env.local scripts/pixabay-video.mjs pick <slot> <k> [--as=<name>] [--start=0] [--seconds=8] [--x=0.5]
//    → public/art/natural/<name>.mp4 (≤ 2 МБ, 540×960, без звука, для loop) и <name>-poster.webp
//    --x — где резать вертикальный кадр по ширине (0 — слева, 0.5 — центр, 1 — справа).
// ffmpeg берётся из FFMPEG (путь) — например, из pip-пакета imageio-ffmpeg.
import sharp from "sharp";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, existsSync, statSync } from "node:fs";

const [cmd, slot, ...rest] = process.argv.slice(2);
const opt = (name, def) => rest.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=") ?? def;
const KEY = process.env.PIXABAY_API_KEY;
if (!KEY) throw new Error("Нет PIXABAY_API_KEY: запускай с --env-file=.env.local");
const root = "art-raw/pixabay-video";
const dir = `${root}/${slot}`;
mkdirSync(dir, { recursive: true });
const cachePath = `${root}/cache.json`;
const cache = existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, "utf8")) : {};

if (cmd === "search") {
  const query = rest.find((a) => !a.startsWith("--"));
  if (!cache[query]) {
    const params = new URLSearchParams({ key: KEY, q: query, per_page: "40", safesearch: "true", order: "popular" });
    const r = await fetch(`https://pixabay.com/api/videos/?${params}`);
    if (!r.ok) throw new Error(`Pixabay ответил ${r.status}`);
    const json = await r.json();
    cache[query] = json.hits
      .filter((h) => h.isAiGenerated === false)
      .map((h) => ({ id: h.id, pageURL: h.pageURL, user: h.user, tags: h.tags, duration: h.duration, videos: h.videos }));
    writeFileSync(cachePath, JSON.stringify(cache, null, 1));
  } else console.log("(из кэша)");
  const hits = cache[query].slice(0, 12);
  const W = 320;
  const H = 180;
  const tiles = [];
  for (const [k, h] of hits.entries()) {
    const thumb = h.videos.medium?.thumbnail ?? h.videos.small?.thumbnail;
    const r = thumb ? await fetch(thumb) : null;
    if (!r?.ok) continue;
    const label = Buffer.from(`<svg width="${W}" height="${H}"><rect width="56" height="40" fill="rgba(0,0,0,.65)"/><text x="10" y="29" font-size="26" font-family="Arial" fill="#fff">${k}</text></svg>`);
    tiles.push({ input: await sharp(Buffer.from(await r.arrayBuffer())).resize(W, H, { fit: "cover" }).composite([{ input: label }]).jpeg().toBuffer(), left: (tiles.length % 3) * W, top: Math.floor(tiles.length / 3) * H });
  }
  await sharp({ create: { width: 3 * W, height: Math.max(1, Math.ceil(tiles.length / 3)) * H, channels: 3, background: "#fff" } }).composite(tiles).jpeg({ quality: 80 }).toFile(`${dir}/sheet.jpg`);
  writeFileSync(`${dir}/query.txt`, query);
  for (const [k, h] of hits.entries()) console.log(`  ${k}: ${h.tags} — ${h.user}, ${h.duration} c, ${h.videos.large?.width ?? h.videos.medium.width}px`);
}

if (cmd === "pick") {
  const FF = process.env.FFMPEG;
  if (!FF) throw new Error("Нужен путь к ffmpeg в FFMPEG");
  const k = Number(rest.find((a) => !a.startsWith("--")));
  const cand = cache[readFileSync(`${dir}/query.txt`, "utf8")]?.[k];
  if (!cand) throw new Error(`Нет кандидата ${k}`);
  const name = opt("as", slot);
  const src = `${dir}/source-${k}.mp4`;
  if (!existsSync(src)) {
    const v = cand.videos.large?.url ? cand.videos.large : cand.videos.medium;
    const r = await fetch(v.url);
    if (!r.ok) throw new Error(`Скачивание не удалось: ${r.status}`);
    writeFileSync(src, Buffer.from(await r.arrayBuffer()));
  }
  mkdirSync("public/art/natural", { recursive: true });
  const out = `public/art/natural/${name}.mp4`;
  const x = Number(opt("x", "0.5"));
  // --tint=warm: перекрасить в тёплый молочный (шёлк под палитру дизайна)
  const tint = opt("tint", "") === "warm" ? ",hue=s=0,eq=brightness=0.14:contrast=1.05,colorchannelmixer=rr=1.06:gg=0.97:bb=0.84" : "";
  const crop = `crop=ih*9/16:ih:(iw-ih*9/16)*${x}:0,scale=540:960,fps=24${tint}`;
  for (const crf of [28, 31, 34, 37]) {
    execFileSync(FF, ["-y", "-loglevel", "error", "-ss", opt("start", "0"), "-t", opt("seconds", "8"), "-i", src, "-vf", crop, "-an", "-c:v", "libx264", "-profile:v", "main", "-pix_fmt", "yuv420p", "-preset", "slow", "-crf", String(crf), "-movflags", "+faststart", out]);
    const size = statSync(out).size;
    console.log(`${out}: crf ${crf} → ${Math.round(size / 1024)} КБ`);
    if (size <= 2 * 1024 * 1024) break;
  }
  if (statSync(out).size > 2 * 1024 * 1024) throw new Error("Не удалось уложиться в 2 МБ");
  const frame = `${dir}/poster-${k}.png`;
  execFileSync(FF, ["-y", "-loglevel", "error", "-i", out, "-frames:v", "1", frame]);
  await sharp(frame).webp({ quality: 70 }).toFile(`public/art/natural/${name}-poster.webp`);
  const credits = "public/art/CREDITS.md";
  const line = `- \`natural/${name}.mp4\` (и постер) — ${cand.user}, ${cand.pageURL}; Pixabay Content License. Изменения: фрагмент ${opt("seconds", "8")} с, вертикальная обрезка 540×960, без звука.`;
  const text = readFileSync(credits, "utf8").split("\n").filter((l) => !l.startsWith(`- \`natural/${name}.mp4\``)).join("\n").trimEnd();
  writeFileSync(credits, `${text}\n\n${line}\n`);
  const meta = "templates/themes/natural/local-photos.json";
  const all = existsSync(meta) ? JSON.parse(readFileSync(meta, "utf8")) : {};
  all[name] = { src: `/art/natural/${name}.mp4`, poster: `/art/natural/${name}-poster.webp`, author: cand.user, license: "Pixabay Content License", licenseUrl: "https://pixabay.com/service/license-summary/", source: cand.pageURL };
  writeFileSync(meta, JSON.stringify(all, null, 2) + "\n");
  console.log(`Готово: ${out}`);
}
