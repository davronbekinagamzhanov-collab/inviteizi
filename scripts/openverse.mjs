// Узбекские фото с Openverse (без ключа): плов, казан, нон, дўппи, дастурхон.
// Только лицензии, разрешающие коммерцию и изменение (license_type=commercial,modification).
//
// 1) node scripts/openverse.mjs search <slot> "<query>" [--n=12]   → art-raw/openverse/<slot>/sheet.jpg
// 2) node scripts/openverse.mjs pick <slot> <k> [--as=<name>] [--width=1080] [--crop=portrait]
//    → public/art/natural/<name>.webp (≤ 300 КБ), автор и лицензия — в public/art/CREDITS.md
import sharp from "sharp";
import { mkdirSync, readFileSync, writeFileSync, existsSync, statSync } from "node:fs";

const [cmd, slot, ...rest] = process.argv.slice(2);
const opt = (name, def) => rest.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=") ?? def;
if (!cmd || !slot) throw new Error('Нужно: search <slot> "<query>" | pick <slot> <k>');

const root = "art-raw/openverse";
const dir = `${root}/${slot}`;
mkdirSync(dir, { recursive: true });
const cachePath = `${root}/cache.json`;
const cache = existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, "utf8")) : {};
const UA = { "User-Agent": "InviteIZI/1.0 (design assets)" };

if (cmd === "search") {
  const query = rest.find((a) => !a.startsWith("--"));
  const n = Number(opt("n", "12"));
  if (!cache[query]) {
    const params = new URLSearchParams({ q: query, license_type: "commercial,modification", page_size: "20", mature: "false" });
    const r = await fetch(`https://api.openverse.org/v1/images/?${params}`, { headers: UA });
    if (!r.ok) throw new Error(`Openverse ответил ${r.status}`);
    const json = await r.json();
    cache[query] = json.results.map((p) => ({
      id: p.id,
      title: p.title,
      url: p.url,
      thumbnail: p.thumbnail,
      creator: p.creator,
      license: `${p.license.toUpperCase()} ${p.license_version ?? ""}`.trim(),
      licenseUrl: p.license_url,
      landing: p.foreign_landing_url,
      size: `${p.width}x${p.height}`,
    }));
    writeFileSync(cachePath, JSON.stringify(cache, null, 1));
  } else console.log("(из кэша)");
  const hits = cache[query].slice(0, n);
  const W = 240;
  const H = 320;
  const tiles = [];
  for (const [k, h] of hits.entries()) {
    try {
      const r = await fetch(h.thumbnail, { headers: UA });
      if (!r.ok) throw new Error(String(r.status));
      const label = Buffer.from(
        `<svg width="${W}" height="${H}"><rect width="56" height="40" fill="rgba(0,0,0,.65)"/><text x="10" y="29" font-size="26" font-family="Arial" fill="#fff">${k}</text></svg>`,
      );
      const tile = await sharp(Buffer.from(await r.arrayBuffer())).resize(W, H, { fit: "cover" }).composite([{ input: label }]).jpeg().toBuffer();
      tiles.push({ input: tile, left: (tiles.length % 4) * W, top: Math.floor(tiles.length / 4) * H });
    } catch (e) {
      console.log(`  ${k}: превью не скачалось (${e.message})`);
    }
  }
  await sharp({ create: { width: 4 * W, height: Math.max(1, Math.ceil(tiles.length / 4)) * H, channels: 3, background: "#ffffff" } })
    .composite(tiles)
    .jpeg({ quality: 80 })
    .toFile(`${dir}/sheet.jpg`);
  writeFileSync(`${dir}/query.txt`, query);
  for (const [k, h] of hits.entries()) console.log(`  ${k}: ${h.title} — ${h.creator} — ${h.license} (${h.size})`);
}

if (cmd === "pick") {
  const k = Number(rest.find((a) => !a.startsWith("--")));
  const cand = cache[readFileSync(`${dir}/query.txt`, "utf8")]?.[k];
  if (!cand) throw new Error(`Нет кандидата ${k}`);
  const name = opt("as", slot);
  const width = Number(opt("width", "1080"));
  const r = await fetch(cand.url, { headers: UA });
  if (!r.ok) throw new Error(`Скачивание не удалось: ${r.status}`);
  const src = Buffer.from(await r.arrayBuffer());
  mkdirSync("public/art/natural", { recursive: true });
  const out = `public/art/natural/${name}.webp`;
  let ok = false;
  for (const [w, q] of [[width, 78], [width, 70], [Math.round(width * 0.85), 66], [Math.round(width * 0.7), 62]]) {
    await sharp(src).rotate().resize({ width: w, withoutEnlargement: true }).webp({ quality: q, effort: 6 }).toFile(out);
    const size = statSync(out).size;
    console.log(`${out}: ${w}px q${q} → ${Math.round(size / 1024)} КБ`);
    if (size <= 300 * 1024) {
      ok = true;
      break;
    }
  }
  if (!ok) throw new Error("Не удалось уложиться в 300 КБ");
  const credits = "public/art/CREDITS.md";
  const line = `- \`natural/${name}.webp\` — ${cand.creator}; [${cand.title}](${cand.landing}); ${cand.license}, ${cand.licenseUrl}. Openverse, проверено ${new Date().toISOString().slice(0, 10)}. Изменения: уменьшение, WebP.`;
  const text = readFileSync(credits, "utf8").split("\n").filter((l) => !l.startsWith(`- \`natural/${name}.webp\``)).join("\n").trimEnd();
  writeFileSync(credits, `${text}\n\n${line}\n`);
  const meta = "templates/themes/natural/local-photos.json";
  const all = existsSync(meta) ? JSON.parse(readFileSync(meta, "utf8")) : {};
  all[name] = { src: `/art/natural/${name}.webp`, author: cand.creator, license: cand.license, licenseUrl: cand.licenseUrl, source: cand.landing };
  writeFileSync(meta, JSON.stringify(all, null, 2) + "\n");
  console.log(`Готово: ${out}`);
}
