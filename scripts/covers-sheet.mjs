// Лист «было/стало» обложек: node scripts/covers-sheet.mjs <папка-было> <выходная-папка>
// В каждой ячейке пара: слева прежняя обложка, справа новая; по 18 дизайнов на лист.
import "./ts-hooks.mjs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const [beforeDir, out = "docs/reviews/covers"] = process.argv.slice(2);
const { activeDesigns } = await import("../templates/registry.ts");
await mkdir(out, { recursive: true });
const W = 150,
  H = 267,
  CELL = W * 2 + 18,
  COLS = 3,
  PER = 18;
const list = activeDesigns();
for (let s = 0; s * PER < list.length; s++) {
  const chunk = list.slice(s * PER, (s + 1) * PER);
  const layers = [];
  for (const [i, d] of chunk.entries()) {
    const x = (i % COLS) * CELL,
      y = Math.floor(i / COLS) * (H + 26);
    const pic = (f) =>
      sharp(f)
        .resize(W, H, { fit: "cover" })
        .toBuffer()
        .catch(() =>
          sharp({ create: { width: W, height: H, channels: 3, background: "#ddd" } })
            .png()
            .toBuffer(),
        );
    layers.push({ input: await pic(path.join(beforeDir, `${d.id}.webp`)), left: x, top: y + 22 });
    layers.push({ input: await pic(`public/covers/${d.id}.webp`), left: x + W + 4, top: y + 22 });
    layers.push({
      input: Buffer.from(
        `<svg width="${CELL}" height="20"><text x="2" y="14" font-family="sans-serif" font-size="12" fill="#222">№${d.number} ${d.id} — было | стало</text></svg>`,
      ),
      left: x,
      top: y,
    });
  }
  const rows = Math.ceil(chunk.length / COLS);
  await sharp({ create: { width: COLS * CELL, height: rows * (H + 26), channels: 3, background: "#fff" } })
    .composite(layers)
    .webp({ quality: 80 })
    .toFile(path.join(out, `sheet-${s + 1}.webp`));
}
console.log(`листов: ${Math.ceil(list.length / PER)}`);
