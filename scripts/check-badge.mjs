// fix/app-polish-2, п.12: плашка InviteIZI читается во всех дизайнах — контраст текста к фону пилюли ≥ 4.5:1.
// /demo/<id> 390×844: открыть (нажатие по экрану), замер на первом экране и после прокрутки на 1,2 экрана.
// Фон — медиана пикселей пилюли (текст занимает малую часть), цвет текста — computed style.
// Запуск: npx next dev -p 3121, затем node scripts/check-badge.mjs [id…]. Отчёт → docs/reviews/app-polish-2/badge.json
import "./ts-hooks.mjs";
import { chromium } from "playwright-core";
import sharp from "sharp";
import { writeFile } from "node:fs/promises";

const { activeDesigns } = await import("../templates/registry.ts");
const base = process.env.CHECK_BASE_URL ?? "http://localhost:3121";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw Error("Local checks only");
const only = process.argv.slice(2);
const lin = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : { executablePath: "/opt/pw-browsers/chromium" });

async function measure(page) {
  const badge = page.locator('[data-brand-badge][data-shown="true"], [data-brand-badge]:not([data-shown])').first();
  if (!(await badge.count()) || !(await badge.isVisible())) return null;
  const color = await badge.evaluate((el) => getComputedStyle(el).color.match(/[\d.]+/g).slice(0, 3).map(Number));
  const { data, info } = await sharp(await badge.screenshot()).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const px = [];
  for (let i = 0; i < info.width * info.height; i++) px.push([data[i * 3], data[i * 3 + 1], data[i * 3 + 2]]);
  px.sort((a, b) => lum(a) - lum(b));
  // фон — середина по яркости среди пикселей, далёких от цвета текста
  const far = px.filter((p) => ratio(p, color) > 1.6);
  const bg = (far.length ? far : px)[Math.floor((far.length ? far : px).length / 2)];
  return +ratio(bg, color).toFixed(2);
}

const rows = [];
for (const d of activeDesigns().filter((x) => !only.length || only.includes(x.id))) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(`${base}/demo/${d.id}`, { waitUntil: "networkidle", timeout: 120_000 }).catch(() => undefined);
  await page.waitForTimeout(1500);
  await page.mouse.click(195, 470);
  await page.waitForTimeout(3000);
  const first = await measure(page);
  await page.evaluate(() => scrollBy(0, innerHeight * 1.2));
  await page.waitForTimeout(1200);
  const scrolled = await measure(page);
  const worst = Math.min(...[first, scrolled].filter((x) => x !== null));
  const ok = Number.isFinite(worst) && worst >= 4.5;
  rows.push({ id: d.id, first, scrolled, ok });
  console.log(`${ok ? "ok  " : "FAIL"} ${d.id.padEnd(18)} first ${first ?? "—"}  scrolled ${scrolled ?? "скрыта"}`);
  await ctx.close();
}
await browser.close();
await writeFile("docs/reviews/app-polish-2/badge.json", JSON.stringify(rows, null, 2));
const bad = rows.filter((r) => !r.ok);
console.log(`badge: ${rows.length - bad.length}/${rows.length} ≥ 4.5`);
process.exit(bad.length ? 1 : 0);
