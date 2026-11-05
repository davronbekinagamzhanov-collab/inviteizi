// Демо с постера партнёра (#p=<код>): ссылки в бота ведут с p_<код>. Запуск: next start на :3105, затем node scripts/check-poster-demo.mjs
import { chromium } from "playwright-core";

const base = process.env.BASE ?? "http://localhost:3105";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
const opened = [];
await page.context().route("https://t.me/**", (r) => {
  opened.push(r.request().url());
  return r.fulfill({ status: 200, body: "tg" });
});
await page.goto(`${base}/demo/muhr#p=abcd2345`, { waitUntil: "networkidle" });
const link = page.locator('a[href^="https://t.me/inviteizi_uz_bot?start="]').first();
await link.scrollIntoViewIfNeeded();
// Ссылка открывается в новой вкладке (target=_blank)
// Ссылка под заставкой-открытием: нажимаем её саму (тот же обработчик click, что и у пальца)
const [popup] = await Promise.all([page.context().waitForEvent("page"), link.evaluate((a) => a.click())]);
await popup.waitForLoadState("domcontentloaded").catch(() => undefined);
await page.waitForTimeout(500);
const ok = opened.some((u) => u.includes("start=p_abcd2345"));
console.log(JSON.stringify({ ok, opened, errors }));
await browser.close();
process.exit(ok && !errors.length ? 0 : 1);
