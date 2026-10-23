// Обложки для каталога бота: первый экран после открытия, 1080×1920 webp → public/covers/<id>.webp
// Запуск (при работающем dev-сервере): node scripts/make-covers.mjs [id …]
// Без аргументов — все дизайны из templates/registry.ts.
import { chromium } from "playwright-core";
import sharp from "sharp";
import { mkdirSync, readFileSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3000";
const all = [...readFileSync("templates/registry.ts", "utf8").matchAll(/id: "([a-z-]+)"|design\("([a-z-]+)"/g)].map(
  (m) => m[1] ?? m[2],
);
const ids = process.argv.slice(2).length ? process.argv.slice(2) : all;
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
  const png = await page.screenshot();
  await sharp(png).resize(1080, 1920).webp({ quality: 82 }).toFile(`public/covers/${id}.webp`);
  console.log("ok", id);
  await page.close();
}
await browser.close();
