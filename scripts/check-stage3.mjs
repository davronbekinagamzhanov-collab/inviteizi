// Этап 3: все активные дизайны на 360 и 430 px. Только локальный сайт, без базы и production-данных.
// Запуск: next start -p 3103, затем node scripts/check-stage3.mjs [id...]
// Отчёт: screens/stage3/report.json, снимки: screens/stage3/*.png
import "./ts-hooks.mjs";
import { chromium } from "playwright-core";
import { mkdir, writeFile, readFile } from "node:fs/promises";
const { activeDesigns } = await import("../templates/registry.ts");

const ids = process.argv.slice(2);
const list = activeDesigns().filter((d) => !ids.length || ids.includes(d.id));
const base = process.env.CHECK_BASE_URL ?? "http://127.0.0.1:3103";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw Error("Только локальный сайт");
const fixture = await readFile("public/music/namuna-kuy.wav");
await mkdir("screens/stage3", { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const results = [];

async function open(page) {
  const opener = page.locator("[data-open]").first();
  if (await opener.count()) await opener.click({ timeout: 8000 });
  await page.waitForSelector('[data-opened="true"]', { timeout: 25000 });
}

for (const d of list) {
  for (const width of [360, 430]) {
    const context = await browser.newContext({ viewport: { width, height: 760 }, deviceScaleFactor: width === 360 ? 2 : 1, isMobile: true, hasTouch: true });
    await context.route("**/storage/v1/object/public/music/**", (r) => r.fulfill({ status: 200, contentType: "audio/wav", body: fixture }));
    const page = await context.newPage();
    const errors = [];
    const images = [];
    let bytes = 0;
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
    page.on("pageerror", (e) => errors.push(`pageerror ${e.message.slice(0, 200)}`));
    page.on("response", async (r) => {
      try {
        const size = (await r.body()).length;
        bytes += size;
        if (r.request().resourceType() === "image") images.push({ url: new URL(r.url()).pathname.slice(-50), size });
      } catch { /* переход или перенаправление */ }
    });
    const row = { id: d.id, number: d.number, format: d.format, width, problems: [] };
    try {
      await page.goto(`${base}/demo/${d.id}`, { waitUntil: "load", timeout: 45000 });
      row.loadMs = await page.evaluate(() => Math.round(performance.getEntriesByType("navigation")[0].loadEventEnd));
      let cdp;
      if (width === 360) {
        cdp = await context.newCDPSession(page);
        await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
        await page.evaluate(() => {
          window.__long = [];
          new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__long.push(Math.round(e.duration)))).observe({ entryTypes: ["longtask"] });
          window.__frames = [];
          let last = performance.now();
          const tick = (now) => { window.__frames.push(now - last); last = now; requestAnimationFrame(tick); };
          requestAnimationFrame(tick);
        });
      }
      const t0 = Date.now();
      await open(page);
      if (width === 360) {
        row.openMs = Date.now() - t0;
        const m = await page.evaluate(() => {
          const f = window.__frames.slice(1).sort((a, b) => a - b);
          return { long: window.__long, p95: Math.round(f[Math.floor(f.length * 0.95)] ?? 0), slow: f.filter((x) => x > 50).length, frames: f.length };
        });
        Object.assign(row, { longTasks: m.long.length, longTotal: m.long.reduce((a, b) => a + b, 0), frameP95: m.p95, slowFrames: m.slow, frames: m.frames });
        await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
        await page.screenshot({ path: `screens/stage3/${String(d.number).padStart(3, "0")}-top.png` });
      }
      await page.waitForSelector("[data-brand-badge]", { timeout: 5000 });
      await page.waitForTimeout(600);
      const check = () => page.evaluate(() => {
        const rect = (e) => e && e.getBoundingClientRect();
        const inter = (a, b) => a && b && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
        const badge = document.querySelector("[data-brand-badge]");
        const b = rect(badge);
        const music = [...document.querySelectorAll("button[aria-label]")].filter((x) => getComputedStyle(x).position === "fixed").map(rect);
        const center = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
        return {
          overflow: document.documentElement.scrollWidth > innerWidth + 1,
          badgeSeen: b.bottom <= innerHeight && b.top >= 0 && b.left >= 0 && b.right <= innerWidth,
          badgeOnTop: Boolean(center && (center === badge || badge.contains(center))),
          overlapsMusic: music.some((m) => inter(b, m)),
        };
      });
      const top = await check();
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await page.waitForTimeout(900);
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await page.waitForTimeout(500);
      const end = await check();
      const footer = await page.evaluate(() => {
        const f = document.querySelector("[data-brand-footer]");
        const r = f.getBoundingClientRect();
        const link = f.querySelector("a");
        const l = link.getBoundingClientRect();
        const badge = document.querySelector("[data-brand-badge]").getBoundingClientRect();
        const covered = l.left < badge.right && badge.left < l.right && l.top < badge.bottom && badge.top < l.bottom;
        const hit = document.elementFromPoint(l.left + l.width / 2, l.top + l.height / 2);
        return {
          seen: r.top < innerHeight && r.bottom > 0,
          href: link.href,
          covered,
          reachable: Boolean(hit && (hit === link || link.contains(hit))),
          afterAll: !f.nextElementSibling || !["P", "H1", "H2", "SECTION", "DIV", "MAIN"].includes(f.nextElementSibling.tagName) || f.nextElementSibling.getBoundingClientRect().height === 0 || getComputedStyle(f.nextElementSibling).position === "fixed",
        };
      });
      if (top.overflow || end.overflow) row.problems.push("overflow");
      if (!top.badgeSeen || !end.badgeSeen) row.problems.push("badge-offscreen");
      if (!top.badgeOnTop || !end.badgeOnTop) row.problems.push("badge-covered");
      if (top.overlapsMusic || end.overlapsMusic) row.problems.push("badge-music");
      if (!footer.seen) row.problems.push("footer-not-at-end");
      if (!footer.reachable) row.problems.push("footer-link-blocked");
      if (footer.covered) row.problems.push("footer-under-badge");
      if (!footer.href.endsWith("?start=footer")) row.problems.push("footer-href");
      if (!footer.afterAll) row.problems.push("footer-not-last");
      await page.screenshot({ path: `screens/stage3/${String(d.number).padStart(3, "0")}-${width}-end.png` });
    } catch (e) {
      row.problems.push(`crash: ${e.message.split("\n")[0].slice(0, 140)}`);
    }
    if (errors.length) row.problems.push(`console: ${[...new Set(errors)].slice(0, 2).join(" | ")}`);
    row.kb = Math.round(bytes / 1024);
    row.images = images.sort((a, b) => b.size - a.size).slice(0, 2).map((i) => `${i.url} ${Math.round(i.size / 1024)}KB`);
    row.imageKb = Math.round(images.reduce((n, i) => n + i.size, 0) / 1024);
    results.push(row);
    console.log(d.number, d.id, width, row.problems.join("; ") || "ok", row.openMs ?? "");
    await context.close();
  }
}
await browser.close();
await writeFile("screens/stage3/report.json", JSON.stringify(results, null, 1));
const bad = results.filter((r) => r.problems.length);
console.log(`Всего ${results.length}, с проблемами ${bad.length}`);
process.exit(bad.length ? 1 : 0);
