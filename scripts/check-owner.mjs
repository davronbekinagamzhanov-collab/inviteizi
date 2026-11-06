// Панель владельца /app/owner в эмуляции Telegram 390×844: вкладки, поиск, фильтры, отказ не-админу.
// Только локально, /api/app подменяется (цифры считает bot/app/owner.ts — покрыто bot/app/owner.test.ts).
// Запуск: npx next dev -p 3121, затем node scripts/check-owner.mjs. Скриншоты → docs/reviews/owner-app/
import { chromium } from "playwright-core";
import { mkdir, writeFile } from "node:fs/promises";

const base = process.env.CHECK_BASE_URL ?? "http://localhost:3121";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw Error("Local checks only");
const out = "docs/reviews/owner-app";
await mkdir(out, { recursive: true });
const fakeInit = encodeURIComponent(`user=${encodeURIComponent(JSON.stringify({ id: 1, first_name: "Owner" }))}&auth_date=1&hash=00`);
const TG = `window.Telegram = { WebApp: { initData: new URLSearchParams(location.hash.slice(1)).get("tgWebAppData") || "", platform: "ios", version: "8.0",
  ready() {}, expand() {}, close() {}, disableVerticalSwipes() {}, setHeaderColor() {}, setBackgroundColor() {}, setBottomBarColor() {}, isVersionAtLeast: () => true,
  MainButton: { setParams() {}, onClick() {}, offClick() {}, show() {}, hide() {}, showProgress() {}, hideProgress() {} },
  BackButton: { show() {}, hide() {}, onClick() {}, offClick() {} }, HapticFeedback: { impactOccurred() {}, notificationOccurred() {}, selectionChanged() {} },
  openLink: (u) => (window.__opened = u), openTelegramLink() {} } };`;

const iso = (h) => new Date(Date.UTC(2026, 10, 6, h, 15)).toISOString();
const panel = (period) => ({
  period,
  label: { d: "Сегодня, 06.11.2026", w: "Последние 7 дней", m: "Ноябрь 2026", y: "2026 год" }[period],
  cards: { paid: 7, revenue: 49000, namuna: 5, conversion: 58, makers: 12, payers: 7, due: 4500 },
  ordersTotal: 12,
  orders: Array.from({ length: 12 }, (_, i) => ({
    number: 140 - i, createdAt: iso(4 + i), paidAt: i % 2 ? null : iso(5 + i), amount: [8000, 6000, 5000][i % 3],
    design: ["Муҳр", "Ипак", "Гулзор", "Ганч пештоқ"][i % 4], partner: i % 3 === 0 ? "Салон Малика" : i % 5 === 0 ? "Тўйхона «Saltanat»" : null,
    partnerId: i % 3 === 0 ? 1 : i % 5 === 0 ? 2 : null, client: ["Дилноза", "@aziz_k", "Шаҳноза Абдураҳмонова"][i % 3],
    names: ["Азиз & Мадина", "Бобур & Лола", "Аҳмад", "Мукаррам опа"][i % 4], status: i % 2 ? ["preview", "awaiting_payment", "receipt_sent"][i % 3] : "active",
    paid: i % 2 === 0, url: `${base}/demo/muhr`,
  })),
  partners: [
    { id: 1, name: "Салон Малика", rate: "1 000 ₸", status: "active", manager: null, scanned: 14, paid: 4, earned: 4000, paidOut: 2000, due: 2000, onHold: 0, sleeping: false },
    { id: 2, name: "Тўйхона «Saltanat» — Сайрам, катта зал", rate: "15%", status: "active", manager: "Ойбек", scanned: 9, paid: 2, earned: 2500, paidOut: 0, due: 2500, onHold: 0, sleeping: false },
    { id: 3, name: "Фотостудия Нур", rate: "1 000 ₸", status: "pending", manager: "Ойбек", scanned: 0, paid: 0, earned: 0, paidOut: 0, due: 0, onHold: 0, sleeping: true },
  ],
  designs: [
    { id: "muhr", number: 101, name: "Муҳр", samples: 5, paid: 3 },
    { id: "ipak", number: 102, name: "Ипак", samples: 4, paid: 2 },
    { id: "ganch-peshtoq", number: 87, name: "Ганч пештоқ", samples: 2, paid: 1 },
    { id: "gulzor", number: 64, name: "Гулзор", samples: 1, paid: 1 },
  ],
  funnel: { clients: 20, makers: 12, payers: 7, stuck: [{ step: "preview", label: "смотрят НАМУНА", count: 3 }, { step: "awaiting_payment", label: "на оплате", count: 1 }, { step: "receipt_sent", label: "чек на проверке", count: 1 }] },
});

const report = [];
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
async function open(admin) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "ru-RU" });
  const page = await ctx.newPage();
  const errors = [];
  const calls = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && !/ERR_TUNNEL_CONNECTION_FAILED|Download the React DevTools|403/.test(m.text()) && errors.push(m.text()));
  await page.route("https://telegram.org/js/telegram-web-app.js", (r) => r.fulfill({ contentType: "text/javascript", body: TG }));
  await page.route("**/api/app", async (r) => {
    const body = JSON.parse(r.request().postData() ?? "{}");
    calls.push(body);
    if (!admin) return r.fulfill({ status: 403, json: { error: "forbidden" } });
    if (body.action === "owner") return r.fulfill({ json: panel(body.period) });
    if (body.action === "ownerExport") return r.fulfill({ json: { ok: true } });
    return r.fulfill({ status: 400, json: { error: "bad" } });
  });
  await page.goto(`${base}/app/owner#tgWebAppData=${fakeInit}`, { waitUntil: "domcontentloaded" });
  return { ctx, page, errors, calls };
}
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);

try {
  {
    const { ctx, page, errors, calls } = await open(true);
    try {
      await page.locator('[data-card="paid"]').waitFor({ timeout: 40_000 });
      await page.screenshot({ path: `${out}/390-01-cards-orders.png` });
      await page.getByRole("searchbox").fill("Бобур");
      if ((await page.locator("[data-order]").count()) !== 3) errors.push("search by names");
      await page.getByRole("searchbox").fill("№135");
      if ((await page.locator("[data-order]").count()) !== 1) errors.push("search by number");
      await page.getByRole("searchbox").fill("");
      await page.getByLabel("Статус").selectOption("paid");
      await page.getByLabel("Партнёр").selectOption("1");
      if ((await page.locator("[data-order]").count()) !== 2) errors.push(`filter paid+partner: ${await page.locator("[data-order]").count()}`);
      await page.getByLabel("Статус").selectOption("");
      await page.getByLabel("Партнёр").selectOption("");
      await page.getByRole("tab", { name: "Неделя" }).click();
      await page.getByText("Последние 7 дней").waitFor();
      if (!calls.some((c) => c.action === "owner" && c.period === "w")) errors.push("period not requested");
      await page.getByRole("tab", { name: "Партнёры" }).click();
      await page.locator("[data-partner]").first().waitFor();
      if (await overflow(page)) errors.push("partners overflow");
      await page.screenshot({ path: `${out}/390-02-partners.png`, fullPage: true });
      await page.getByRole("tab", { name: "Дизайны" }).click();
      await page.screenshot({ path: `${out}/390-03-designs.png` });
      await page.getByRole("tab", { name: "Где уходят" }).click();
      await page.screenshot({ path: `${out}/390-04-funnel.png`, fullPage: true });
      await page.getByRole("button", { name: "📤 Excel" }).click();
      await page.getByText("Файл отправлен в чат с ботом").waitFor();
      if (!calls.some((c) => c.action === "ownerExport" && c.period === "w")) errors.push("excel not requested");
      if (await overflow(page)) errors.push("overflow");
    } catch (e) {
      errors.push(e.message.split("\n")[0]);
      await page.screenshot({ path: `${out}/390-FAIL.png`, fullPage: true });
    }
    report.push({ tag: "admin-390", ok: !errors.length, errors });
    await ctx.close();
  }
  {
    const { ctx, page, errors } = await open(false);
    const ok = await page.getByText("Нет доступа").waitFor({ timeout: 40_000 }).then(() => true, () => false);
    if (!ok) errors.push("denied text not shown");
    if (await page.locator("[data-card]").count()) errors.push("data shown to non-admin");
    await page.screenshot({ path: `${out}/390-05-denied.png` });
    report.push({ tag: "non-admin-390", ok: !errors.length, errors });
    await ctx.close();
  }
} finally {
  await browser.close();
}
const passed = report.every((r) => r.ok);
await writeFile(`${out}/report.json`, JSON.stringify({ scope: "Local /app/owner, mocked /api/app", passed, report }, null, 2) + "\n");
console.log(JSON.stringify(report));
if (!passed) process.exitCode = 1;
