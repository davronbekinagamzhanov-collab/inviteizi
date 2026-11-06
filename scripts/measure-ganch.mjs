// «Ганч пештоқ»: замер первого открытия при CPU 4× (длинные задачи при загрузке, кадры 3 с после нажатия).
// Запуск: next build && next start -p 3121, затем node scripts/measure-ganch.mjs (BASE=… RUNS=…)
import { chromium } from "playwright-core";
const base = process.env.BASE ?? "http://localhost:3121";
const runs = Number(process.env.RUNS ?? 3);
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome" });
const res = [];
for (let i = 0; i < runs; i++) {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await page.addInitScript(() => {
    window.__long = [];
    new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__long.push(e.duration))).observe({ type: "longtask", buffered: true });
  });
  await page.goto(`${base}/demo/ganch-peshtoq`, { waitUntil: "load" });
  await page.waitForTimeout(1500); // прогрев (компиляция dev) без замедления
  await page.reload({ waitUntil: "load" });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.reload({ waitUntil: "load" });
  await page.waitForTimeout(2500);
  const load = await page.evaluate(() => ({ long: window.__long.length, longMs: Math.round(window.__long.reduce((a, b) => a + b, 0)), max: Math.round(Math.max(0, ...window.__long)) }));
  // Открытие: кадры 3 с
  await page.evaluate(() => {
    window.__frames = [];
    let last = performance.now();
    const tick = (t) => { window.__frames.push(t - last); last = t; if (window.__frames.length < 2000 && t - window.__t0 < 3000) requestAnimationFrame(tick); };
    window.__t0 = performance.now();
    requestAnimationFrame(tick);
  });
  await page.mouse.click(187, 450);
  await page.waitForTimeout(3500);
  const open = await page.evaluate(() => {
    const f = window.__frames.slice(1);
    return { frames: f.length, jank: f.filter((x) => x > 50).length, maxFrame: Math.round(Math.max(...f)), fps: Math.round((f.length / f.reduce((a, b) => a + b, 0)) * 1000) };
  });
  res.push({ load, open });
  await ctx.close();
}
await browser.close();
const med = (k, sub) => res.map((r) => r[k][sub]).sort((a, b) => a - b)[Math.floor(res.length / 2)];
console.log(JSON.stringify({ runs: res, median: { loadLongTasks: med("load", "long"), loadLongMs: med("load", "longMs"), loadMaxTask: med("load", "max"), openFps: med("open", "fps"), openJank: med("open", "jank"), openMaxFrame: med("open", "maxFrame") } }));
