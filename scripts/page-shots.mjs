// Снимки страницы демо целиком (по экранам) для просмотра фото: node scripts/page-shots.mjs <outDir> <id> [id…]
// 430×860 @3x — как на большом телефоне; каждый экран отдельным файлом <id>-<k>.jpg
import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";
const BASE = process.env.BASE ?? "http://localhost:3100";
const [out, ...ids] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
for (const id of ids) {
  try {
  const page = await browser.newPage({ viewport: { width: 430, height: 860 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await page.goto(`${BASE}/demo/${id}`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForLoadState("load").catch(() => undefined);
  const open = page.locator("[data-open]").first();
  if (await open.count()) await open.click({ timeout: 3000 }).catch(() => undefined);
  await page.waitForTimeout(2500);
  const total = await page.evaluate(() => document.scrollingElement.scrollHeight);
  let k = 0;
  for (let y = 0; y < total - 200 && k < 12; y += 800, k++) {
    await page.evaluate((y) => window.scrollTo(0, y), y);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${out}/${id}-${k}.jpg`, type: "jpeg", quality: 72, scale: "css", timeout: 60_000 });
  }
  await page.close();
  console.log(id, k);
  } catch (e) {
    console.log(id, "ошибка:", String(e).split("\n")[0]);
  }
}
await browser.close();
