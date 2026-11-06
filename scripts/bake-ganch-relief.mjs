// «Ганч пештоқ»: заранее запекает рельеф ганча (фильтр #gp-relief) в плитки-картинки узоров.
// На странице фильтр больше не считается: паттерны берут готовые WebP (data URI) — вид тот же, первое открытие лёгкое.
// Плитка рендерится в окружении 3×3 (рельеф и тени на стыках как у бесшовного узора) и вырезается центр.
// Запуск: npx next dev -p 3121, затем node scripts/bake-ganch-relief.mjs → templates/themes/ganch-peshtoq/relief.ts
import { chromium } from "playwright-core";
import sharp from "sharp";
import { writeFile } from "node:fs/promises";

const base = process.env.CHECK_BASE_URL ?? "http://localhost:3121";
// плотность: пикселей на единицу узора (мелкому гириху и решётке — больше, крупному ислими хватает 3)
const TILES = [
  { name: "ISLIMI", size: 64, scale: 3, body: (n) => `<rect width="${n}" height="${n}" fill="url(#gp-islimi)" filter="url(#gp-relief)"/>` },
  // гирих рисуется во viewBox 14: та же геометрия, что у паттерна gp-girih
  { name: "GIRIH", size: 14, scale: 4, body: (n) => `<rect width="${n}" height="${n}" fill="url(#gp-girih)" filter="url(#gp-relief)"/>` },
  // решётка панжара: гипс с отверстиями (маска gp-lattice), отверстия прозрачные
  { name: "LATTICE", size: 26, scale: 4, body: (n) => `<g filter="url(#gp-relief)"><rect width="${n}" height="${n}" fill="#F7F4EE" mask="url(#gp-lattice)"/></g>` },
];

const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const page = await browser.newPage({ deviceScaleFactor: 1, viewport: { width: 1000, height: 1000 } });
await page.goto(`${base}/demo/ganch-peshtoq`, { waitUntil: "load" });
const defs = await page.evaluate(() => document.querySelector("#gp-relief")?.closest("svg")?.outerHTML);
if (!defs) throw Error("GanchDefs not found");
// Первый снимок после перехода бывает без прозрачности — делаем пробный
await page.setContent("<html><body style='margin:0;background:transparent'></body></html>");
await page.screenshot({ omitBackground: true });
const out = [];
for (const t of TILES) {
  const SCALE = t.scale;
  const n = t.size * 3;
  const px = n * SCALE;
  await page.setContent(
    `<html><body style="margin:0;background:transparent">${defs}<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 ${n} ${n}" style="display:block">${t.body(n)}</svg></body></html>`,
  );
  const png = await page.screenshot({ clip: { x: t.size * SCALE, y: t.size * SCALE, width: t.size * SCALE, height: t.size * SCALE }, omitBackground: true });
  const webp = await sharp(png).webp({ lossless: true, effort: 6 }).toBuffer();
  out.push(`/** ${t.size}×${t.size} ед., ${t.size * SCALE}px, ${webp.length} байт */\nexport const ${t.name}_RELIEF = "data:image/webp;base64,${webp.toString("base64")}";`);
  console.log(t.name, webp.length);
}
await browser.close();
await writeFile(
  "templates/themes/ganch-peshtoq/relief.ts",
  `// Сгенерировано scripts/bake-ganch-relief.mjs — не править руками.\n// Рельеф ганча (фильтр #gp-relief), запечённый в плитки узоров.\n\n${out.join("\n\n")}\n`,
);
