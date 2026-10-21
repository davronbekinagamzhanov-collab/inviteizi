// Выбранный черновик картины → public/art/<id>.webp, не больше 300 КБ.
// Запуск: node scripts/art-to-webp.mjs art-raw/oq-ot-2026.jpg oq-ot
import sharp from "sharp";
import { mkdirSync, statSync } from "node:fs";

const [src, id] = process.argv.slice(2);
if (!src || !id) throw new Error("Нужно: <файл> <id>");

const LIMIT = 300 * 1024;
mkdirSync("public/art", { recursive: true });
const out = `public/art/${id}.webp`;

// Начинаем с хорошего качества и снижаем, пока файл не станет ≤ 300 КБ
for (const [width, quality] of [
  [1080, 82],
  [1080, 76],
  [1080, 70],
  [960, 72],
  [900, 66],
  [800, 64],
]) {
  await sharp(src).resize({ width }).webp({ quality, effort: 6 }).toFile(out);
  const size = statSync(out).size;
  console.log(`${out}: ${width}px q${quality} → ${Math.round(size / 1024)} КБ`);
  if (size <= LIMIT) process.exit(0);
}
throw new Error("Не удалось уложиться в 300 КБ");
