// Лист для глаз: несколько скриншотов в ряд (уменьшенные), подписи сверху.
// node scripts/contact-sheet.mjs out.jpg <ширина_плитки> file1 file2 ...
import sharp from "sharp";
const [out, w, ...files] = process.argv.slice(2);
const W = Number(w);
const tiles = await Promise.all(files.map(async (f) => sharp(f).resize({ width: W }).jpeg().toBuffer({ resolveWithObject: true })));
const H = Math.max(...tiles.map((t) => t.info.height));
await sharp({ create: { width: W * tiles.length + 8 * (tiles.length - 1), height: H, channels: 3, background: "#888" } })
  .composite(tiles.map((t, i) => ({ input: t.data, left: i * (W + 8), top: 0 })))
  .jpeg({ quality: 78 })
  .toFile(out);
console.log(out);
