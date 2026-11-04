// Лист фото для глаз: по строке на дизайн, все его снимки (Unsplash и локальные) с подписью слота.
// node scripts/photo-sheet.mjs <out.jpg> <id> [id…]     — дизайны берутся из templates/themes/<id>/Design.tsx
import { readFileSync, existsSync } from "node:fs";
import sharp from "sharp";

const [out, ...ids] = process.argv.slice(2);
const unsplash = JSON.parse(readFileSync("templates/themes/natural/unsplash.json", "utf8"));
const local = JSON.parse(readFileSync("templates/themes/natural/local-photos.json", "utf8"));
const byslot = (o) => (Array.isArray(o) ? Object.fromEntries(o.map((x) => [x.slot, x])) : o);
const U = byslot(unsplash), L = byslot(local);
const T = 300, LABEL = 26, GAP = 6;

async function image(slot) {
  if (U[slot]) {
    const res = await fetch(`${U[slot].raw}&w=${T * 2}&q=80&fm=jpg`);
    if (!res.ok) throw new Error(`${slot}: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
  const l = L[slot];
  const file = l && `public${l.poster ?? l.src}`;
  if (file && existsSync(file)) return readFileSync(file);
  throw new Error(`нет фото для слота ${slot}`);
}

const label = (text, w) =>
  Buffer.from(`<svg width="${w}" height="${LABEL}"><rect width="100%" height="100%" fill="#222"/><text x="6" y="18" font-family="Arial" font-size="15" fill="#fff">${text}</text></svg>`);

const rows = [];
for (const id of ids) {
  const src = readFileSync(`templates/themes/${id}/Design.tsx`, "utf8");
  const slots = [...new Set([...src.matchAll(/slot:\s*"([^"]+)"/g)].map((m) => m[1]))];
  const tiles = [];
  for (const slot of slots) {
    const buf = await image(slot);
    const meta = await sharp(buf).metadata();
    const tile = await sharp(buf).resize(T, T, { fit: "cover" }).jpeg().toBuffer();
    tiles.push({ slot, tile, size: `${meta.width}×${meta.height}` });
  }
  rows.push({ id, tiles });
}
const W = Math.max(...rows.map((r) => r.tiles.length)) * (T + GAP) + 200;
const H = rows.length * (T + LABEL + GAP);
const comp = [];
rows.forEach((r, y) => {
  const top = y * (T + LABEL + GAP);
  comp.push({ input: label(r.id, 196), left: 0, top });
  r.tiles.forEach((t, x) => {
    const left = 200 + x * (T + GAP);
    comp.push({ input: label(`${t.slot} · ${U[t.slot] ? "unsplash" : "local"}`, T), left, top });
    comp.push({ input: t.tile, left, top: top + LABEL });
  });
});
await sharp({ create: { width: W, height: H, channels: 3, background: "#888" } }).composite(comp).jpeg({ quality: 82 }).toFile(out);
console.log(out);
