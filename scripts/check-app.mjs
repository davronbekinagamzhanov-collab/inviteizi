// Mini App /app в браузере: весь путь заказа на 360 и 430 px, uz и ru.
// Только локально. Ответы /api/app подменяются здесь (база и Telegram не трогаются) — серверная логика покрыта bot/app/service.test.ts.
// Запуск: npx next dev -p 3121, затем node scripts/check-app.mjs. Скриншоты → docs/reviews/app/
import "./ts-hooks.mjs";
import { chromium } from "playwright-core";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const { CATALOG_ORDER, getDesign } = await import("../templates/registry.ts");
const { appUz } = await import("../texts/app-uz.ts");
const { appRu } = await import("../texts/app-ru.ts");
const base = process.env.CHECK_BASE_URL ?? "http://localhost:3121";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw Error("Local checks only");
const out = "docs/reviews/app";
await mkdir(out, { recursive: true });

const fakeInit = encodeURIComponent(`user=${encodeURIComponent(JSON.stringify({ id: 1, first_name: "Test" }))}&auth_date=1&hash=00`);
const photoBytes = await readFile("public/covers/muhr.jpg");
const { mockServer } = await import("./app-mock.mjs");

const NAMES = {
  nikoh: async (p) => {
    await p.locator('input[name="groom"]').fill("Азиз");
    await p.locator('input[name="bride"]').fill("Мадина");
  },
  sunnat: async (p) => p.locator('input[name="person"]').fill("Аҳмад"),
  nahorgi: async (p) => p.locator('input[name="person"]').fill("Жасурбек"),
  yubiley: async (p) => {
    await p.locator('input[name="person"]').fill("Мукаррам опа");
    await p.locator('input[name="age"]').fill("60");
  },
};

const TG_STUB = `(() => {
  const h = new URLSearchParams(location.hash.slice(1));
  const noop = () => {};
  const btn = { setParams: noop, onClick: noop, offClick: noop, showProgress: noop, hideProgress: noop, show: noop, hide: noop };
  window.Telegram = { WebApp: { initData: h.get("tgWebAppData") || "", platform: "unknown", version: h.get("tgWebAppVersion") || "6.0",
    ready: noop, expand: noop, close: noop, isVersionAtLeast: () => false, MainButton: btn, BackButton: { show: noop, hide: noop, onClick: noop, offClick: noop },
    openLink: (u) => window.open(u), openTelegramLink: (u) => window.open(u) } };
})();`;

const report = [];
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME, headless: true } : { channel: "chrome", headless: true });
try {
  for (const width of [360, 430]) {
    for (const lang of ["uz", "ru"]) {
      const T = lang === "ru" ? appRu : appUz;
      const occasions = width === 360 ? ["nikoh", "sunnat", "nahorgi", "yubiley"] : ["nikoh", "yubiley"];
      for (const occ of occasions) {
        const tag = `${width}-${lang}-${occ}`;
        const ctx = await browser.newContext({ viewport: { width, height: Math.round(width * 2.1) }, deviceScaleFactor: 1, locale: lang === "ru" ? "ru-RU" : "uz-UZ" });
        const page = await ctx.newPage();
        const server = mockServer(lang, base);
        const errors = [];
        const steps = [];
        page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
        page.on("console", (m) => m.type() === "error" && !/Failed to load resource.*(none\.mp3|ERR_TUNNEL_CONNECTION_FAILED)|Download the React DevTools/.test(m.text()) && errors.push(`console: ${m.text()}`));
        await page.route("**/api/app**", (r) => server.handle(r));
        // telegram.org может быть закрыт сетью песочницы: та же логика, что у настоящего скрипта вне Telegram
        // (initData из #tgWebAppData, платформа unknown — приложение рисует свои кнопки)
        await page.route("https://telegram.org/js/telegram-web-app.js", (r) => r.fulfill({ contentType: "text/javascript", body: TG_STUB }));
        const check = async (name, shot = true) => {
          await page.waitForTimeout(450);
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
          const small = await page.evaluate(() =>
            [...document.querySelectorAll("button, input, textarea, p, span, label, small")]
              .filter((el) => el.offsetParent && el.textContent?.trim() && !el.closest("iframe"))
              .map((el) => parseFloat(getComputedStyle(el).fontSize))
              .filter((px) => px < 13).length,
          );
          steps.push({ name, overflow, small });
          if (shot && (occ === "nikoh" || name.includes("form"))) await page.screenshot({ path: `${out}/${tag}-${name}.png`, fullPage: name !== "view" });
        };
        try {
          await page.goto(`${base}/app#tgWebAppData=${fakeInit}&tgWebAppVersion=7.10`, { waitUntil: "domcontentloaded" });
          await page.locator("[data-design]").first().waitFor({ timeout: 30_000 });
          // Каталог: чип тадбира, сердечко
          if (occ !== "nikoh") await page.getByRole("button", { name: T.occasions[occ], exact: true }).click();
          const first = CATALOG_ORDER[occ][0];
          await page.locator(`[data-design="${first}"]`).waitFor();
          await check("01-catalog");
          await page.getByRole("button", { name: T.catalog.save }).first().click();
          await page.getByText(T.catalog.saved).waitFor();
          // Просмотр
          await page.locator(`[data-design="${first}"]`).click();
          await page.locator(`iframe[src="/demo/${first}"]`).waitFor();
          await check("02-view");
          await page.locator("[data-main-action]").click();
          // Анкета: пустая → ошибки → прошлый день → верно
          await page.locator('input[name="date0"]').waitFor();
          await check("03-form");
          await page.locator("[data-main-action]").click();
          await page.getByText(T.form.errors.empty).first().waitFor();
          await check("04-form-errors");
          await NAMES[occ](page);
          if (occ === "nahorgi") await page.locator('[role="radio"]').filter({ hasText: T.form.causes.nikoh }).click().catch(() => undefined);
          await page.locator('input[name="hosts"]').fill(lang === "ru" ? "Семья Каримовых" : "Каримовлар оиласи");
          await page.locator('input[name="date0"]').fill("2026-11-01");
          await page.locator("[data-main-action]").click();
          await page.getByText(T.form.errors.past).waitFor();
          await page.locator('input[name="date0"]').fill("2026-12-05");
          await page.locator(`[aria-label="${T.form.venue}"] button`).first().click();
          await check("05-form-filled");
          await page.locator("[data-main-action]").click();
          // Фото (только дизайны с фото клиента)
          if (getDesign(first).clientPhotos) {
            await page.getByText(T.photos.lead, { exact: true }).waitFor();
            await check("06-photos");
            await page.locator('input[type="file"]').setInputFiles([{ name: "a.jpg", mimeType: "image/jpeg", buffer: photoBytes }]);
            await page.locator('img[src="/covers/ipak.webp"]').waitFor();
            await check("07-photos-1");
            await page.locator("[data-main-action]").click();
          }
          // Итог
          await page.getByText(T.summary.title).waitFor();
          await check("08-summary");
          await page.getByRole("button", { name: new RegExp(T.summary.text) }).click();
          await check("09-summary-text");
          await page.getByRole("button", { name: T.summary.namuna }).click();
          await page.locator('iframe[title="НАМУНА"]').waitFor();
          await check("10-namuna", false);
          await page.getByRole("button", { name: new RegExp(T.form.previewClose) }).click();
          // Оплата: сначала проверка («⚠️ …пул қайтарилмайди»), реквизиты — после «✅ Ҳаммаси тўғри»
          await page.locator("[data-main-action]").click();
          await page.getByText(T.pay.checkWarn).waitFor();
          await check("11a-pay-check");
          await page.getByRole("button", { name: T.pay.checkYes }).click();
          await page.getByText(T.pay.how).waitFor();
          await check("11-pay");
          await page.locator('input[type="file"]').setInputFiles([{ name: "chek.jpg", mimeType: "image/jpeg", buffer: photoBytes }]);
          await page.getByText(T.pay.doneTitle).waitFor();
          await check("12-done");
          await page.locator("[data-main-action]").click();
          await page.getByText(T.orders.statuses.receipt_sent).waitFor();
          await check("13-orders");
          // Переключение языка в шапке
          const other = lang === "uz" ? "ru" : "uz";
          await page.getByRole("button", { name: (other === "ru" ? appUz : appRu).langSwitch[other], exact: true }).click();
          await page.getByText((other === "ru" ? appRu : appUz).orders.title).first().waitFor();
        } catch (e) {
          errors.push(`step failed: ${e.message.split("\n")[0]}`);
          await page.screenshot({ path: `${out}/${tag}-FAIL.png`, fullPage: true }).catch(() => undefined);
        }
        const calls = server.st.calls;
        const uniq = [...new Set(errors.map((e) => e.slice(0, 220)))];
        report.push({ tag, ok: !uniq.length && steps.every((s) => !s.overflow), errors: uniq, steps, submits: calls.filter((c) => c === "submit").length, drafts: calls.filter((c) => c === "draft").length });
        console.log(JSON.stringify(report.at(-1)));
        await ctx.close();
      }
    }
  }
  // Без Telegram (обычный браузер): понятная подсказка, а не пустой экран
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  await page.goto(`${base}/app`);
  const hint = await page.getByText(appUz.openInTelegram.split("\n")[0]).waitFor({ timeout: 20_000 }).then(() => true, () => false);
  report.push({ tag: "no-telegram", ok: hint });
  await page.screenshot({ path: `${out}/no-telegram.png` });
} finally {
  await browser.close();
}
const passed = report.every((r) => r.ok);
await writeFile(`${out}/report.json`, JSON.stringify({ scope: "Local /app with mocked /api/app; no database, no Telegram", passed, report }, null, 2) + "\n");
console.log(JSON.stringify({ passed, runs: report.length }));
if (!passed) process.exitCode = 1;
