// fix/app-polish-3, задача 2/3: «✏️ Маълумотларни ўзгартириш» на итоге и на проверке перед оплатой;
// «назад» на каждом экране: каталог ← просмотр ← анкета ← фото ← итог ← проверка ← оплата.
// Два прогона: стрелка Telegram (BackButton) и кнопка на странице. /api/app — заглушка (scripts/app-mock.mjs).
// Запуск: npx next dev -p 3121, затем node scripts/check-app-4.mjs. Снимки → docs/reviews/app-polish-3/
import "./ts-hooks.mjs";
import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";

const { appUz } = await import("../texts/app-uz.ts");
const { appRu } = await import("../texts/app-ru.ts");
const { mockServer } = await import("./app-mock.mjs");
const base = process.env.CHECK_BASE_URL ?? "http://localhost:3121";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw Error("Local checks only");
const out = "docs/reviews/app-polish-3";
await mkdir(out, { recursive: true });
const fakeInit = encodeURIComponent(`user=${encodeURIComponent(JSON.stringify({ id: 1, first_name: "Test" }))}&auth_date=1&hash=00`);
// platform: unknown → «не в Telegram» (стрелка на странице); ios → стрелка Telegram (обработчики запоминаются)
const stub = (platform) => `(() => { const h = new URLSearchParams(location.hash.slice(1)); const noop = () => {};
  const reg = (k) => ({ onClick: (f) => { (window.__h ??= {})[k] = f; }, offClick: (f) => { if (window.__h?.[k] === f) window.__h[k] = null; } });
  const btn = { setParams: noop, showProgress: noop, hideProgress: noop, show: noop, hide: noop, setText: noop, enable: noop, disable: noop, ...reg("main") };
  window.Telegram = { WebApp: { initData: h.get("tgWebAppData") || "", platform: "${platform}", version: "6.0", ready: noop, expand: noop, close: noop, onEvent: noop, offEvent: noop,
    isVersionAtLeast: () => false, MainButton: btn, BackButton: { show: noop, hide: noop, ...reg("back") }, HapticFeedback: { impactOccurred: noop, notificationOccurred: noop, selectionChanged: noop }, openLink: noop, openTelegramLink: noop } }; })();`;

const browser = await chromium.launch({ executablePath: process.env.CHROME ?? "/opt/pw-browsers/chromium" });
const fails = [];
const ok = (cond, msg) => (cond ? console.log("  ok", msg) : (fails.push(msg), console.log("  FAIL", msg)));
const errors = [];

async function run(mode, lang) {
  const T = lang === "ru" ? appRu : appUz;
  console.log(`— ${mode} · ${lang}`);
  const server = mockServer(lang, base);
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 1, hasTouch: true });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && !/Failed to load resource|ERR_TUNNEL|DevTools|MEDIA_ERR|NotSupportedError|no supported source/i.test(m.text()) && errors.push(m.text()));
  await page.route("**/api/app**", (r) => server.handle(r));
  await page.route("https://telegram.org/js/telegram-web-app.js", (r) => r.fulfill({ contentType: "text/javascript", body: stub(mode === "telegram" ? "ios" : "unknown") }));
  await page.goto(`${base}/app#tgWebAppData=${fakeInit}`, { waitUntil: "domcontentloaded" });
  await page.locator("[data-design]").first().waitFor({ timeout: 90_000 });
  await page.waitForTimeout(800);

  const h1 = async () => ((await page.locator("h1").first().textContent().catch(() => "")) ?? "").trim();
  async function where() {
    await page.waitForTimeout(350);
    if (await page.getByRole("button", { name: T.view.back }).isVisible().catch(() => false)) return "view";
    const t = await h1();
    if (t === T.summary.title) return "summary";
    if (t === T.pay.checkTitle) return "check";
    if (t === T.pay.title) return "pay";
    if (await page.locator('input[name="groom"]').isVisible().catch(() => false)) return "form";
    if (await page.locator('input[type="file"][accept="image/*"]').count()) return "photos";
    if (t === T.catalog.title) return "catalog";
    return `? ${t}`;
  }
  const main = async () => {
    const own = page.locator("[data-main-action]");
    if (await own.isVisible().catch(() => false)) await own.click();
    else await page.evaluate(() => window.__h?.main?.());
    await page.waitForTimeout(500);
  };
  const back = async () => {
    if (mode === "telegram") await page.evaluate(() => window.__h?.back?.());
    else {
      const pill = page.getByRole("button", { name: T.view.back });
      if (await pill.isVisible().catch(() => false)) await pill.click();
      else await page.getByRole("button", { name: T.back, exact: true }).first().click();
    }
  };

  // Вперёд: каталог → просмотр → анкета → фото → итог → проверка → оплата
  await page.locator('[data-design="muhr"]').click();
  ok((await where()) === "view", "каталог → просмотр");
  await main();
  ok((await where()) === "form", "просмотр → анкета");
  await page.locator('input[name="groom"]').fill("Азиз");
  await page.locator('input[name="bride"]').fill("Мадина");
  await page.locator('input[name="hosts"]').fill("Каримовлар оиласи");
  await page.locator('input[name="date0"]').fill("2026-12-05");
  await page.locator(`[aria-label="${T.form.venue}"] button`).first().click();
  await main();
  ok((await where()) === "photos", "анкета → фото");
  await main();
  ok((await where()) === "summary", "фото → итог");

  // п.1: «Маълумотларни ўзгартириш» на итоге → анкета с данными → «Сақлаш ва қайтиш» → итог, та же ссылка
  const urlBefore = server.st.orders[0]?.url;
  const editBtn = page.getByRole("button", { name: T.form.editData });
  ok(await editBtn.isVisible(), "итог: кнопка «✏️ Маълумотларни ўзгартириш» видна");
  if (mode === "page" && lang === "uz") await page.screenshot({ path: `${out}/uz-03-summary-edit.png` });
  await editBtn.click();
  ok((await where()) === "form" && (await page.locator('input[name="bride"]').inputValue()) === "Мадина", "итог → анкета с текущими данными");
  await page.locator('input[name="groom"]').fill("Азизбек");
  await main();
  ok((await where()) === "summary", "«Сақлаш» → обратно на итог");
  ok(server.st.orders.length === 1 && server.st.orders[0].url === urlBefore && /Азизбек/.test(server.st.orders[0].check), "НАМУНА обновлена, ссылка та же");

  await main();
  ok((await where()) === "check", "итог → проверка перед оплатой");
  const editCheck = page.getByRole("button", { name: T.form.editData });
  ok(await editCheck.isVisible(), "проверка: кнопка «✏️ Маълумотларни ўзгартириш» видна");
  if (mode === "page" && lang === "uz") await page.screenshot({ path: `${out}/uz-04-check-edit.png`, fullPage: true });
  await editCheck.click();
  ok((await where()) === "form", "проверка → анкета");
  await page.locator('input[name="bride"]').fill("Мадинахон");
  await main();
  ok((await where()) === "check", "«Сақлаш» → обратно на проверку");
  ok(/Мадинахон/.test(await page.locator("main").innerText()), "на проверке — новые данные");
  ok(server.st.orders.length === 1 && server.st.orders[0].url === urlBefore, "та же ссылка после правки с проверки");
  await page.locator('input[name="terms"]').check();
  await page.getByRole("button", { name: T.pay.checkYes }).click();
  ok((await where()) === "pay", "проверка → оплата");

  // Назад по цепочке
  const chain = ["check", "summary", "photos", "form", "view", "catalog"];
  for (const want of chain) {
    await back();
    ok((await where()) === want, `назад → ${want}`);
  }
  ok(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)), "ничего не вылезает за экран");
  await ctx.close();
}

try {
  await run("telegram", "uz");
  await run("page", "uz");
  await run("page", "ru");
} finally {
  await browser.close();
}
ok(!errors.length, `нет ошибок консоли ${errors.slice(0, 3).join(" | ")}`);
if (fails.length) {
  console.log("FAILED:", fails);
  process.exit(1);
}
console.log("ALL OK");
