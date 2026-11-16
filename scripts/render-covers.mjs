// Обложки каталога — единый стандарт: закрытый конверт (первый экран) самого дизайна, чистый рендер.
// Окно телефона 360×640 × 3 = 1080×1920, демо-данные дизайна, язык уз, без анимационных полукадров
// (prefers-reduced-motion), без переключателя языков, бейджа, подсказки, плашки и кнопки музыки.
// Пишет public/covers/<id>.webp (≤ 180 КБ), public/covers/<id>.jpg (для бота) и миниатюру public/covers/thumb/<id>.webp.
// Запуск на production-сборке: npm run build && npx next start -p 3130, затем
//   node scripts/render-covers.mjs [--base=http://localhost:3130] [--only=id1,id2] [--before=dir]
// --before=dir: сначала копирует текущие обложки в dir (для листа «было/стало»).
import "./ts-hooks.mjs";
import { chromium } from "playwright-core";
import { copyFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const arg = (name, def) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? def;
const BASE = arg("base", "http://localhost:3130");
if (!["localhost", "127.0.0.1"].includes(new URL(BASE).hostname)) throw Error("Только локальный сервер");
const { activeDesigns } = await import("../templates/registry.ts");
const only = arg("only", "");
const before = arg("before", "");
const targets = activeDesigns().filter((d) => !only || only.split(",").includes(d.id));
const musicFixture = await readFile("public/music/namuna-kuy.wav");
const MAX_BYTES = 180 * 1024;
const HIDE = `[data-lang-switch],[data-brand-badge],[data-tap-hint],[data-brand-footer],[data-watermark],
  [aria-label^='Мусиқани'],[data-music-hint]{display:none!important}`;

if (before) await mkdir(before, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
try {
  for (const d of targets) {
    if (before) await copyFile(`public/covers/${d.id}.webp`, path.join(before, `${d.id}.webp`)).catch(() => {});
    const ctx = await browser.newContext({
      viewport: { width: 360, height: 640 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      reducedMotion: "reduce",
    });
    await ctx.route("**/storage/v1/object/public/music/**", (r) =>
      r.fulfill({ status: 200, contentType: "audio/wav", body: musicFixture }),
    );
    const page = await ctx.newPage();
    await page.goto(`${BASE}/demo/${d.id}?lang=uz`, { waitUntil: "networkidle", timeout: 120000 });
    await page.addStyleTag({ content: HIDE });
    await page.evaluate(async () => {
      await document.fonts.ready;
      const imgs = [...document.images].filter((i) => {
        const r = i.getBoundingClientRect();
        return r.bottom > 0 && r.top < innerHeight;
      });
      for (const i of imgs) i.loading = "eager";
      const wait = Promise.all(imgs.map((i) => (i.complete && i.naturalWidth ? null : i.decode().catch(() => null))));
      await Promise.race([wait, new Promise((r) => setTimeout(r, 5000))]);
    });
    await page.waitForTimeout(1200);
    const png = await page.screenshot({ type: "png" });
    let q = 82,
      webp = await sharp(png).webp({ quality: q, effort: 6 }).toBuffer();
    while (webp.length > MAX_BYTES && q > 60) {
      q -= 4;
      webp = await sharp(png).webp({ quality: q, effort: 6 }).toBuffer();
    }
    await sharp(webp).toFile(`public/covers/${d.id}.webp`);
    await sharp(png).jpeg({ quality: 82, mozjpeg: true }).toFile(`public/covers/${d.id}.jpg`);
    await sharp(png)
      .resize(480, 853, { fit: "cover" })
      .webp({ quality: 74, effort: 6 })
      .toFile(`public/covers/thumb/${d.id}.webp`);
    console.log(`${d.id}: ${Math.round(webp.length / 1024)} КБ (q${q})`);
    await ctx.close();
  }
} finally {
  await browser.close();
}
