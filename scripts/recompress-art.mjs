// Пережатие картин дизайнов (public/art, public/vip): тот же размер и формат WebP, качество 82.
// Файл заменяется, только если экономия ≥ 15 % и картинка визуально та же (PSNR ≥ 38 дБ к оригиналу).
// Запуск: node scripts/recompress-art.mjs [--dry]
import sharp from "sharp";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const dry = process.argv.includes("--dry");
const files = [];
const walk = (d) => {
  for (const f of readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) walk(p);
    else if (f.name.endsWith(".webp") && statSync(p).size > 60 * 1024) files.push(p);
  }
};
walk("public/art");
walk("public/vip");

async function psnr(a, b) {
  const [x, y] = await Promise.all([a, b].map((buf) => sharp(buf).removeAlpha().raw().toBuffer()));
  let se = 0;
  for (let i = 0; i < x.length; i++) se += (x[i] - y[i]) ** 2;
  const mse = se / x.length;
  return mse === 0 ? 99 : 10 * Math.log10((255 * 255) / mse);
}

let before = 0,
  after = 0,
  changed = 0;
for (const f of files) {
  const src = readFileSync(f);
  const meta = await sharp(src).metadata();
  const out = await sharp(src).webp({ quality: 82, effort: 6, smartSubsample: true, alphaQuality: 90 }).toBuffer();
  const q = await psnr(src, out);
  const ok = out.length <= src.length * 0.85 && q >= 38;
  before += src.length;
  after += ok ? out.length : src.length;
  if (ok) {
    changed++;
    if (!dry) writeFileSync(f, out);
  }
  console.log(
    `${ok ? "pack" : "keep"} ${Math.round(src.length / 1024)}→${Math.round(out.length / 1024)}KB psnr=${q.toFixed(1)} ${meta.width}x${meta.height} ${f}`,
  );
}
console.log(`\n${changed}/${files.length} пережато: ${Math.round(before / 1024)} КБ → ${Math.round(after / 1024)} КБ`);
