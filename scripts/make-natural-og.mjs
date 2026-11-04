// OG-картинки (превью ссылки) для натуральных пилотов: первый экран демо, весь текст скрыт —
// ни имён, ни дат, ни мест. Запуск при работающем dev-сервере:
//   BASE=http://localhost:3100 node scripts/make-natural-og.mjs [id …]
import { chromium } from "playwright-core";
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3000";
const ids = process.argv.slice(2).length ? process.argv.slice(2) : ["muhr", "ipak", "bog", "tong-dasturxon"];
mkdirSync("public/og", { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
for (const id of ids) {
  const page = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
  await page.goto(`${BASE}/demo/${id}`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  if (await page.locator("[data-open]").count()) await page.locator("[data-open]").first().click();
  await page.waitForSelector('[data-opened="true"]', { timeout: 15_000 });
  await page.waitForTimeout(1500);
  await page.addStyleTag({
    content: "body *{color:transparent!important;text-shadow:none!important} [aria-label^='Мусиқани'],[data-brand-badge]{display:none!important}",
  });
  await sharp(await page.screenshot()).resize(420, 620, { fit: "cover", position: "top" }).jpeg({ quality: 86 }).toFile(`public/og/${id}.jpg`);
  console.log("ok", id);
  await page.close();
}
await browser.close();
