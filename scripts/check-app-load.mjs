// п.20: скорость первого экрана Mini App на медленном 3G (Playwright + CDP: 400 кбит/с, RTT 400 мс, CPU ×4).
// /api/app подменяется с задержкой 1,5 с (холодный старт функции), telegram-web-app.js — с задержкой 3 с (медленный CDN)
// или совсем не грузится (TG_BLOCKED=1). Меряем: первый кадр (FCP), экран загрузки, каталог, объём JS.
// Запуск: npx next build && npx next start -p 3131, затем CHECK_BASE_URL=http://localhost:3131 node scripts/check-app-load.mjs
import "./ts-hooks.mjs";
import { chromium } from "playwright-core";

const base = process.env.CHECK_BASE_URL ?? "http://localhost:3131";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw Error("Local checks only");
const { mockServer } = await import("./app-mock.mjs");
const fakeInit = encodeURIComponent(`user=${encodeURIComponent(JSON.stringify({ id: 1, first_name: "Test" }))}&auth_date=1&hash=00`);
const TG_STUB = `(() => { const h = new URLSearchParams(location.hash.slice(1)); const noop = () => {};
  const btn = { setParams: noop, onClick: noop, offClick: noop, showProgress: noop, hideProgress: noop, show: noop, hide: noop };
  window.Telegram = { WebApp: { initData: h.get("tgWebAppData") || "", platform: "unknown", version: "6.0", ready: noop, expand: noop, close: noop,
    isVersionAtLeast: () => false, MainButton: btn, BackButton: { show: noop, hide: noop, onClick: noop, offClick: noop }, openLink: noop } }; })();`;
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? "/opt/pw-browsers/chromium" });
const results = [];
for (const blocked of [false, true]) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 400, downloadThroughput: (400 * 1024) / 8, uploadThroughput: (400 * 1024) / 8 });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const server = mockServer("uz", base);
  await page.route("**/api/app**", async (r) => { await new Promise((x) => setTimeout(x, 1500)); return server.handle(r); });
  await page.route("https://telegram.org/js/telegram-web-app.js", async (r) => {
    if (blocked) return r.abort();
    await new Promise((x) => setTimeout(x, 3000));
    return r.fulfill({ contentType: "text/javascript", body: TG_STUB });
  });
  let js = 0;
  page.on("response", async (res) => { if (res.url().endsWith(".js") && res.url().startsWith(base)) js += Number((await res.headerValue("content-length")) ?? 0) || (await res.body().catch(() => Buffer.alloc(0))).length; });
  const t0 = Date.now();
  await page.goto(`${base}/app#tgWebAppData=${fakeInit}`, { waitUntil: "commit" });
  const boot = await page.locator("[data-boot]").or(page.getByText(/Юкланмоқда|Загрузка/)).first().waitFor({ timeout: 120_000 }).then(() => Date.now() - t0).catch(() => null);
  const catalog = await page.locator("[data-design]").first().waitFor({ timeout: 180_000 }).then(() => Date.now() - t0).catch(() => null);
  if (process.env.SHOT) await page.screenshot({ path: `/tmp/claude-0/sp/load-${blocked}.png` });
  const fcp = await page.evaluate(() => Math.round(performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? 0));
  results.push({ tg: blocked ? "не загрузился" : "+3 с", fcp, bootScreen: boot, catalog, jsKB: Math.round(js / 1024) });
  await ctx.close();
}
await browser.close();
console.table(results);
console.log(JSON.stringify(results));
