// Скриншоты натуральных пилотов: первый экран, середина, низ (и вся страница) в 430 и 360 px.
// Запуск: node scripts/shoot-natural.mjs <id> [--base=http://localhost:3100] [--path=/demo/<id>] [--out=docs/reviews/natural-pilots] [--full]
// В отчёт (консоль): ошибки консоли, горизонтальная прокрутка, высота страницы.
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const id = process.argv[2];
if (!id) throw new Error("Нужно: node scripts/shoot-natural.mjs <id>");
const arg = (name, def) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=") ?? def;
const BASE = arg("base", "http://localhost:3100");
const PATH = arg("path", `/demo/${id}`);
const OUT = arg("out", "docs/reviews/natural-pilots");
const TAG = arg("tag", "");
const full = process.argv.includes("--full");
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: "chrome" });
for (const width of (arg("widths", "430,360")).split(",").map(Number)) {
  const page = await browser.newPage({ viewport: { width, height: 860 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 160)));
  page.on("pageerror", (e) => errors.push(e.message.slice(0, 160)));
  await page.goto(BASE + PATH, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  const name = `${OUT}/${id}${TAG}-${width}`;
  if (width === 430) await page.screenshot({ path: `${name}-0-opening.png` });
  const opener = page.locator("[data-open]").first();
  if (await opener.count()) await opener.click();
  await page.waitForSelector('[data-opened="true"]', { timeout: 10_000 }).catch(() => errors.push("не открылось"));
  await page.waitForTimeout(900);
  // Пролистать до конца, чтобы все блоки появились
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += 500) {
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(1300);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  const shots = [["1-first", 0], ["2-middle", Math.round(height * 0.45)], ["3-end", height]];
  for (const [label, y] of shots) {
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await page.waitForTimeout(500);
    if (width === 430 || full) await page.screenshot({ path: `${name}-${label}.png` });
  }
  if (full) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `${name}-full.png`, fullPage: true });
  }
  console.log(JSON.stringify({ id, width, height, overflow, errors }));
  await page.close();
}
await browser.close();
