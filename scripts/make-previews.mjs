// Превью обложек для витрины /pilots: снимок первого экрана после открытия → public/pilots/<id>.webp
// Запуск (при работающем dev-сервере): node scripts/make-previews.mjs
import { chromium } from "playwright-core";
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const IDS = ["oltin-monogramma", "sapfir", "oq-ot", "tonggi-qozon", "pion-guldasta"];
const BASE = process.env.BASE ?? "http://localhost:3000";
mkdirSync("public/pilots", { recursive: true });

const browser = await chromium.launch({ channel: "chrome" });
for (const id of IDS) {
  const page = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
  await page.goto(`${BASE}/demo/${id}/namuna`, { waitUntil: "load" });
  if (await page.locator("[data-open]").count()) await page.locator("[data-open]").first().click();
  await page.waitForSelector('[data-opened="true"]', { timeout: 10_000 });
  // ждём, пока доиграют анимации обложки
  await page.waitForTimeout(3500);
  // водяной знак и кнопки не нужны на превью
  await page.addStyleTag({ content: "[data-watermark], nextjs-portal { display: none !important; }" });
  const png = await page.screenshot({ clip: { x: 0, y: 0, width: 375, height: 560 } });
  await sharp(png).webp({ quality: 80 }).toFile(`public/pilots/${id}.webp`);
  console.log("ok", id);
  await page.close();
}
await browser.close();
