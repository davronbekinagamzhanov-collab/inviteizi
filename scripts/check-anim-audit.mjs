// fix/app-polish-2, п.11: аудит открытия у дизайнов за 8 000 ₸ (animated).
// /demo/<id> на 390×844: кадр до нажатия, нажатие по центру, кадры 0,4 / 1 / 1,8 / 3 с.
// Считаем, насколько изменился экран (средняя разница пикселей, 0–255) и когда перестал меняться.
// «Заметное открытие» — экран после нажатия сильно другой (≥ 18) и движение длится ≥ 1 с.
// Запуск: npx next dev -p 3121, затем node scripts/check-anim-audit.mjs [id…]. Кадры → docs/reviews/app-polish-2/anim/
import "./ts-hooks.mjs";
import { chromium } from "playwright-core";
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";

const { activeDesigns } = await import("../templates/registry.ts");
const base = process.env.CHECK_BASE_URL ?? "http://localhost:3121";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw Error("Local checks only");
const out = "docs/reviews/app-polish-2/anim";
await mkdir(out, { recursive: true });
const only = process.argv.slice(2);
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : { executablePath: "/opt/pw-browsers/chromium" });
const W = 130, H = 281;
const raw = async (buf) => sharp(buf).resize(W, H).removeAlpha().raw().toBuffer();
const diff = (a, b) => { let n = 0; for (let i = 0; i < a.length; i++) n += Math.abs(a[i] - b[i]); return +(n / a.length).toFixed(1); };
const rows = [];
for (const d of activeDesigns().filter((x) => x.format === "animated" && (!only.length || only.includes(x.id)))) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(`${base}/demo/${d.id}`, { waitUntil: "networkidle", timeout: 120_000 }).catch(() => undefined);
  await page.waitForTimeout(2500);
  const shots = [await page.screenshot()];
  // Нажатие по экрану (как говорит подсказка «Очиш учун экранга босинг»): середина, чуть ниже имён
  await page.mouse.click(195, 470);
  const t0 = Date.now();
  for (const at of [400, 1000, 1800, 3000]) {
    await page.waitForTimeout(Math.max(0, at - (Date.now() - t0)));
    shots.push(await page.screenshot());
  }
  const px = await Promise.all(shots.map(raw));
  const change = diff(px[0], px[4]);
  const steps = [1, 2, 3, 4].map((i) => diff(px[i - 1], px[i]));
  const moving = steps.findLastIndex((x) => x > 1.5);
  const ms = [400, 1000, 1800, 3000][moving] ?? 0;
  const strip = await sharp({ create: { width: W * 5 + 16, height: H, channels: 3, background: "#ffffff" } })
    .composite(await Promise.all(shots.map(async (s, i) => ({ input: await sharp(s).resize(W, H).toBuffer(), left: i * (W + 4), top: 0 }))))
    .png().toFile(`${out}/${d.id}.png`);
  void strip;
  const strong = change >= 18 && ms >= 1000;
  rows.push({ id: d.id, change, steps, movingUntil: ms, strong });
  console.log(`${strong ? "ok  " : "weak"} ${d.id.padEnd(18)} change ${String(change).padStart(5)}  steps ${steps.join("/")}  until ${ms} ms`);
  await ctx.close();
}
await browser.close();
await writeFile(`${out}/report.json`, JSON.stringify(rows, null, 2));
