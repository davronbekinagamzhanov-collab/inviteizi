// Плавность всех дизайнов каталога (v2, часть 3): кадры и сдвиги вёрстки при 4× замедленном CPU.
// Запуск на production-сборке: npm run build && npx next start -p 3130, затем
//   node scripts/check-motion.mjs [--base=http://localhost:3130] [--cpu=4] [--only=id1,id2]
// Для каждого дизайна: открытие (если есть кнопка [data-open]) и плавная прокрутка на экран вниз.
// Пишет docs/reviews/motion/report.json. Скриншоты не снимаются: они сами мешают замеру.
import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync } from "node:fs";

const arg = (name, def) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? def;
const BASE = arg("base", "http://localhost:3130");
const CPU = Number(arg("cpu", "4"));
await import("./ts-hooks.mjs");
const { ON_SALE_IDS } = await import("../templates/catalog.ts");
const accepted = [...ON_SALE_IDS];
const only = arg("only", "");
const ids = only ? only.split(",") : accepted;

const browser = await chromium.launch({ channel: "chrome", args: ["--autoplay-policy=no-user-gesture-required"] });
const results = [];
for (const id of ids) {
  const page = await browser.newPage({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(`${BASE}/demo/${id}`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU });
  const hasOpening = (await page.locator("[data-open]").count()) > 0;
  const measure = (ms) =>
    page.evaluate(
      (ms) =>
        new Promise((resolve) => {
          let shift = 0;
          const po = new PerformanceObserver((l) => {
            for (const e of l.getEntries()) if (!e.hadRecentInput) shift += e.value;
          });
          po.observe({ type: "layout-shift", buffered: false });
          const t0 = performance.now();
          let last = t0;
          const gaps = [];
          const frame = (now) => {
            gaps.push(now - last);
            last = now;
            if (now - t0 < ms) requestAnimationFrame(frame);
            else {
              po.disconnect();
              const s = [...gaps].sort((a, b) => a - b);
              const q = (p) => s[Math.min(s.length - 1, Math.floor(s.length * p))];
              resolve({
                frames: gaps.length,
                fps: Math.round((gaps.length / ms) * 1000),
                p95: +q(0.95).toFixed(1),
                max: +Math.max(...gaps).toFixed(1),
                janks: gaps.filter((g) => g > 50).length,
                cls: +shift.toFixed(3),
              });
            }
          };
          requestAnimationFrame(frame);
        }),
      ms,
    );
  let opening = null;
  if (hasOpening) {
    const run = measure(2600);
    await page.locator("[data-open]").first().click({ force: true });
    opening = await run;
    await page.waitForTimeout(600);
  }
  const runScroll = measure(1600);
  await page.evaluate(() => scrollTo({ top: innerHeight * 0.9, behavior: "smooth" }));
  const scroll = await runScroll;
  results.push({ id, opening, scroll, errors });
  console.log(
    id.padEnd(18),
    opening
      ? `open ${opening.fps}fps p95 ${opening.p95} janks ${opening.janks} cls ${opening.cls}`
      : "open —".padEnd(40),
    `| scroll ${scroll.fps}fps p95 ${scroll.p95} janks ${scroll.janks} cls ${scroll.cls}`,
    errors.length ? `ERR ${errors.length}` : "",
  );
  await page.close();
}
await browser.close();
mkdirSync("docs/reviews/motion", { recursive: true });
writeFileSync(
  "docs/reviews/motion/report.json",
  JSON.stringify(
    {
      base: BASE,
      cpu: CPU,
      viewport: "375x812",
      note: "Chrome headless на ноутбуке, CPU замедлен в 4 раза; не замена реального телефона",
      results,
    },
    null,
    2,
  ),
);
