// Низ каждого дизайна в продаже: плашка «InviteIZI билан яратилди» и бейдж в цветах дизайна.
// Для каждого дизайна: скриншот низа страницы (390×844) и контраст текста плашки/бейджа к фону под ним.
// Запуск на production-сборке: npm run build && npx next start -p 3130, затем
//   node scripts/check-brand-footer.mjs [--base=http://localhost:3130] [--only=id1,id2] [--out=dir]
// Пишет <out>/<id>.png, <out>/report.json и лист скриншотов <out>/sheet-N.png. Только чтение.
import "./ts-hooks.mjs";
import { chromium } from "playwright-core";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";

const arg = (name, def) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? def;
const BASE = arg("base", "http://localhost:3130");
const OUT = arg("out", path.join(tmpdir(), "inviteizi-brand-footer"));
const only = arg("only", "");
if (!["localhost", "127.0.0.1"].includes(new URL(BASE).hostname)) throw Error("Только локальный сервер");
const { activeDesigns, getDesign } = await import("../templates/registry.ts");
const targets = only ? only.split(",").map((id) => getDesign(id)) : activeDesigns();
const musicFixture = await readFile("public/music/namuna-kuy.wav");
await mkdir(OUT, { recursive: true });

// CHROMIUM_PATH — свой Chromium, если playwright-core не нашёл браузер
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const results = [];
try {
  for (const d of targets) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await context.route("**/storage/v1/object/public/music/**", (r) =>
      r.fulfill({ status: 200, contentType: "audio/wav", body: musicFixture }),
    );
    const page = await context.newPage();
    await page.goto(`${BASE}/demo/${d.id}`, { waitUntil: "networkidle", timeout: 120000 });
    const opener = page.locator("[data-open]:not(:disabled)").first();
    if (await opener.count()) {
      await opener.click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(2500);
    }
    // до конца, чтобы сработали появления при прокрутке
    for (let y = 0, h = 1; y < h; y += 700) {
      h = await page.evaluate(() => document.documentElement.scrollHeight);
      await page.evaluate((v) => window.scrollTo(0, v), y);
      await page.waitForTimeout(120);
    }
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(1500);
    const info = await page.evaluate(() => {
      const parse = (c) => {
        const m = c.match(/rgba?\(([^)]+)\)/);
        if (!m) return null;
        const [r, g, b, a = "1"] = m[1].split(/[\s,/]+/).filter(Boolean);
        return [+r, +g, +b, +a];
      };
      const lum = ([r, g, b]) => {
        const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      };
      const ratio = (a, b) => {
        const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
        return Math.round(((x + 0.05) / (y + 0.05)) * 100) / 100;
      };
      const bgOf = (el) => {
        for (let n = el; n; n = n.parentElement) {
          const c = parse(getComputedStyle(n).backgroundColor);
          if (c && c[3] > 0.6) return c;
        }
        return parse(getComputedStyle(document.documentElement).backgroundColor) ?? [255, 255, 255, 1];
      };
      const footer = document.querySelector("[data-brand-footer]");
      const link = footer?.querySelector("[data-brand-footer-link]");
      const caption = footer?.querySelector("p:not([data-photo-credits])");
      const badge = document.querySelector("[data-brand-badge]");
      const fbg = footer ? bgOf(footer) : null;
      const blend = (fg, bg) => fg.map((v, i) => (i < 3 ? Math.round(v * fg[3] + bg[i] * (1 - fg[3])) : 1));
      const badgeBg = badge ? parse(getComputedStyle(badge).backgroundColor) : null;
      return {
        footerBg: fbg,
        footerInk: link ? getComputedStyle(link).color : null,
        footerLinkContrast: link && fbg ? ratio(parse(getComputedStyle(link).color), fbg) : null,
        footerCaptionContrast: caption && fbg ? ratio(parse(getComputedStyle(caption).color), fbg) : null,
        badgeText: badge?.textContent?.trim() ?? null,
        badgeContrast:
          badge && badgeBg
            ? ratio(parse(getComputedStyle(badge).color), blend(badgeBg, bgOf(badge.parentElement)))
            : null,
      };
    });
    const file = path.join(OUT, `${d.id}.png`);
    await page.screenshot({ path: file });
    const ok =
      (info.footerLinkContrast ?? 0) >= 4.5 &&
      (info.footerCaptionContrast ?? 0) >= 4.5 &&
      (info.badgeContrast ?? 99) >= 4.5;
    results.push({ id: d.id, number: d.number, ok, ...info });
    console.log(
      `${ok ? "ok  " : "LOW "} ${d.id} link=${info.footerLinkContrast} caption=${info.footerCaptionContrast} badge=${info.badgeContrast}`,
    );
    await context.close();
  }
} finally {
  await browser.close();
}
await writeFile(path.join(OUT, "report.json"), JSON.stringify(results, null, 2));

// Лист скриншотов: 6 в ряд, нижние 560 px каждого кадра, подпись — номер и id
const W = 390 / 2,
  H = 560 / 2,
  COLS = 6,
  PER = 24;
for (let s = 0; s * PER < results.length; s++) {
  const chunk = results.slice(s * PER, (s + 1) * PER);
  const rows = Math.ceil(chunk.length / COLS);
  const tiles = await Promise.all(
    chunk.map(async (r, i) => {
      const img = await sharp(path.join(OUT, `${r.id}.png`))
        .extract({ left: 0, top: 844 - 560, width: 390, height: 560 })
        .resize(W, H)
        .toBuffer();
      const label = Buffer.from(
        `<svg width="${W}" height="22"><rect width="100%" height="100%" fill="#fff"/>` +
          `<text x="6" y="15" font-family="sans-serif" font-size="12" fill="#222">№${r.number} ${r.id}</text></svg>`,
      );
      return [
        { input: img, left: (i % COLS) * (W + 8), top: Math.floor(i / COLS) * (H + 30) + 22 },
        { input: label, left: (i % COLS) * (W + 8), top: Math.floor(i / COLS) * (H + 30) },
      ];
    }),
  );
  await sharp({
    create: { width: COLS * (W + 8), height: rows * (H + 30), channels: 3, background: "#e9e6e1" },
  })
    .composite(tiles.flat())
    .png()
    .toFile(path.join(OUT, `sheet-${s + 1}.png`));
}
const low = results.filter((r) => !r.ok);
console.log(`\nДизайнов: ${results.length}, с низким контрастом: ${low.length}. Папка: ${OUT}`);
process.exitCode = low.length ? 1 : 0;
