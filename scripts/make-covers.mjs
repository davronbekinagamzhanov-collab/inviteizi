// Обложки для каталога: первый экран после открытия, 1080×1920 → public/covers/<id>.webp (сайт) и .jpg (бот)
// Запуск (при работающем dev-сервере): node scripts/make-covers.mjs [id …]
// Без аргументов — все дизайны из templates/registry.ts.
// NO_NAMES=1 — обложка без имён: имена и «кем приходится» в карточке скрыты (место остаётся пустым).
import { chromium } from "playwright-core";
import sharp from "sharp";
import {withAssetCredit} from "./asset-credit.mjs";
import { mkdirSync, readFileSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3000";
const all = [...readFileSync("templates/registry.ts", "utf8").matchAll(/id: "([a-z-]+)"|design\("([a-z-]+)"/g)].map(
  (m) => m[1] ?? m[2],
);
const ids = process.argv.slice(2).length ? process.argv.slice(2) : all;
// Дизайны, куда клиент может поставить своё фото: на обложке маленький значок фотоаппарата в углу
const withClientPhotos = new Set(
  [...readFileSync("templates/registry.ts", "utf8").matchAll(/design\("([a-z-]+)".*clientPhotos: true/g)].map((m) => m[1]),
);
const CAMERA = `<svg xmlns="http://www.w3.org/2000/svg" width="132" height="132" viewBox="0 0 132 132">
  <circle cx="66" cy="66" r="60" fill="#fffaf2" fill-opacity=".94" stroke="#3b2a1e" stroke-opacity=".18" stroke-width="2"/>
  <g fill="none" stroke="#3b2a1e" stroke-width="5" stroke-linejoin="round" stroke-linecap="round">
    <path d="M36 50h14l6-9h20l6 9h14a5 5 0 0 1 5 5v31a5 5 0 0 1-5 5H36a5 5 0 0 1-5-5V55a5 5 0 0 1 5-5z"/>
    <circle cx="66" cy="70" r="12"/>
  </g>
</svg>`;
mkdirSync("public/covers", { recursive: true });

const browser = await chromium.launch({ channel: "chrome" });
for (const id of ids) {
  // 360×640 при плотности 3 = ровно 1080×1920
  const page = await browser.newPage({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3 });
  await page.goto(`${BASE}/demo/${id}`, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  if (await page.locator("[data-open]").count()) await page.locator("[data-open]").first().click();
  await page.waitForSelector('[data-opened="true"]', { timeout: 15_000 });
  // ждём, пока доиграют анимации обложки
  await page.waitForTimeout(4000);
  // кнопка музыки на превью не нужна
  await page.addStyleTag({ content: "[aria-label^='Мусиқани'] { display: none !important; }" });
  if (process.env.NO_NAMES) await page.addStyleTag({ content: "[data-card-text] h1, [data-card-text] h1 + *:not(p), [data-card-text] > p:first-child { visibility: hidden !important; }" });
  let png = await withAssetCredit(await page.screenshot(),id);
  if (withClientPhotos.has(id)) png = await sharp(png).composite([{ input: Buffer.from(CAMERA), top: 40, left: 1080 - 132 - 40 }]).png().toBuffer();
  await sharp(png).resize(1080, 1920).withMetadata().webp({ quality: 82 }).toFile(`public/covers/${id}.webp`);
  // Telegram показывает фото только в JPG/PNG — для каталога в боте
  await sharp(png).resize(1080, 1920).withMetadata().jpeg({ quality: 82, mozjpeg: true }).toFile(`public/covers/${id}.jpg`);
  console.log("ok", id);
  await page.close();
}
await browser.close();
