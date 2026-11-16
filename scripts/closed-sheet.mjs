// Лист закрытых экранов (первый экран) всех дизайнов в продаже в окне Mini App, по умолчанию 375×600.
// node scripts/closed-sheet.mjs [--base=http://localhost:3130] [--size=375x600] [--out=docs/reviews/closed-375x600]
import "./ts-hooks.mjs";
import { chromium } from "playwright-core";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const arg = (name, def) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? def;
const BASE = arg("base", "http://localhost:3130");
const [W, H] = arg("size", "375x600").split("x").map(Number);
const OUT = arg("out", `docs/reviews/closed-${W}x${H}`);
const { activeDesigns } = await import("../templates/registry.ts");
await mkdir(OUT, { recursive: true });
const music = await readFile("public/music/namuna-kuy.wav");
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const shots = [];
try {
  for (const d of activeDesigns()) {
    const ctx = await browser.newContext({
      viewport: { width: W, height: H },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 1,
    });
    await ctx.route("**/storage/v1/object/public/music/**", (r) =>
      r.fulfill({ status: 200, contentType: "audio/wav", body: music }),
    );
    const page = await ctx.newPage();
    await page.goto(`${BASE}/demo/${d.id}?lang=uz`, { waitUntil: "networkidle", timeout: 120000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1500);
    shots.push({ d, png: await page.screenshot() });
    await ctx.close();
  }
} finally {
  await browser.close();
}
const TW = 180,
  TH = Math.round((TW * H) / W),
  COLS = 6,
  PER = 24;
for (let s = 0; s * PER < shots.length; s++) {
  const chunk = shots.slice(s * PER, (s + 1) * PER);
  const layers = [];
  for (const [i, { d, png }] of chunk.entries()) {
    const x = (i % COLS) * (TW + 8),
      y = Math.floor(i / COLS) * (TH + 24);
    layers.push({ input: await sharp(png).resize(TW, TH).toBuffer(), left: x, top: y + 20 });
    layers.push({
      input: Buffer.from(
        `<svg width="${TW}" height="18"><text x="1" y="13" font-family="sans-serif" font-size="11">№${d.number} ${d.id}</text></svg>`,
      ),
      left: x,
      top: y,
    });
  }
  await sharp({
    create: {
      width: COLS * (TW + 8),
      height: Math.ceil(chunk.length / COLS) * (TH + 24),
      channels: 3,
      background: "#fff",
    },
  })
    .composite(layers)
    .webp({ quality: 80 })
    .toFile(path.join(OUT, `sheet-${s + 1}.webp`));
}
console.log(`дизайнов: ${shots.length}, листов: ${Math.ceil(shots.length / PER)} → ${OUT}`);
