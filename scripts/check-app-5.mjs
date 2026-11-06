// fix/app-polish-3, задача 3/3: медленный старт («Интернет секин», «Қайта уриниш»), двойное нажатие «Танлаш»,
// «назад» из правки без «Сақлаш» (данные как были), экраны на 320 и 430 px — ничего не вылезает и не наезжает.
// /api/app — заглушка (scripts/app-mock.mjs). Запуск: npx next dev -p 3121, затем node scripts/check-app-5.mjs
import "./ts-hooks.mjs";
import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";

const { appUz: T } = await import("../texts/app-uz.ts");
const { mockServer } = await import("./app-mock.mjs");
const base = process.env.CHECK_BASE_URL ?? "http://localhost:3121";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw Error("Local checks only");
const out = "docs/reviews/app-polish-3";
await mkdir(out, { recursive: true });
const fakeInit = encodeURIComponent(`user=${encodeURIComponent(JSON.stringify({ id: 1, first_name: "Test" }))}&auth_date=1&hash=00`);
const TG_STUB = `(() => { const h = new URLSearchParams(location.hash.slice(1)); const noop = () => {};
  const btn = { setParams: noop, onClick: noop, offClick: noop, showProgress: noop, hideProgress: noop, show: noop, hide: noop };
  window.Telegram = { WebApp: { initData: h.get("tgWebAppData") || "", platform: "unknown", version: "6.0", ready: noop, expand: noop, close: noop,
    isVersionAtLeast: () => false, MainButton: btn, BackButton: { show: noop, hide: noop, onClick: noop, offClick: noop }, openLink: noop, openTelegramLink: noop } }; })();`;
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? "/opt/pw-browsers/chromium" });
const fails = [];
const ok = (cond, msg) => (cond ? console.log("  ok", msg) : (fails.push(msg), console.log("  FAIL", msg)));
const errors = [];

async function open(width, opts = {}) {
  const server = mockServer("uz", base);
  const ctx = await browser.newContext({ viewport: { width, height: 760 }, deviceScaleFactor: 1, hasTouch: true });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && !/Failed to load resource|ERR_TUNNEL|DevTools|MEDIA_ERR|NotSupportedError|no supported source|ERR_FAILED/i.test(m.text()) && errors.push(m.text()));
  let sessions = 0;
  await page.route("**/api/app**", async (r) => {
    if (opts.slow && JSON.parse(r.request().postData() ?? "{}").action === "session" && sessions++ === 0) {
      await new Promise((x) => setTimeout(x, opts.slow));
      return r.abort("internetdisconnected").catch(() => undefined);
    }
    return server.handle(r);
  });
  await page.route("https://telegram.org/js/telegram-web-app.js", (r) => r.fulfill({ contentType: "text/javascript", body: TG_STUB }));
  await page.goto(`${base}/app#tgWebAppData=${fakeInit}`, { waitUntil: "domcontentloaded" });
  return { ctx, page, server };
}
// Ничего не шире экрана и у кнопок/заголовков текст не обрезан (scrollWidth > clientWidth)
const layout = async (page) => {
  await page.waitForTimeout(700); // переход между экранами закончился
  return page.evaluate(() => {
    // Внутри ряда с горизонтальной прокруткой (чипы, места) выход за край — норма
    const inScroller = (el) => {
      for (let p = el.parentElement; p; p = p.parentElement) if (/(auto|scroll)/.test(getComputedStyle(p).overflowX)) return true;
      return false;
    };
    const bad = [];
    if (document.documentElement.scrollWidth > innerWidth + 1) bad.push("page-overflow");
    for (const el of document.querySelectorAll("button, h1, h2, a, label, strong")) {
      const r = el.getBoundingClientRect();
      if (!r.width || getComputedStyle(el).visibility === "hidden" || inScroller(el)) continue;
      if (r.right > innerWidth + 1 || r.left < -1) bad.push(`out:${el.textContent.trim().slice(0, 30)}`);
      else if (el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflow !== "visible" && !el.closest("[data-chips],nav")) bad.push(`cut:${el.textContent.trim().slice(0, 30)}`);
    }
    return bad;
  });
};

try {
  // 1) Медленный старт: «Интернет секин» и «Қайта уриниш», ошибка сети → «Қайта уриниш» → каталог
  console.log("— медленный старт");
  let { ctx, page } = await open(375, { slow: 9500 });
  await page.getByText(T.slow).waitFor({ timeout: 30_000 });
  ok(await page.getByRole("button", { name: T.retry }).isVisible(), "через 8 с: «Интернет секин» и «Қайта уриниш»");
  await page.getByText(T.offline).waitFor({ timeout: 20_000 }).catch(() => undefined);
  ok(await page.getByText(T.offline).isVisible(), "нет сети → понятное сообщение");
  await page.getByRole("button", { name: T.retry }).click();
  await page.locator("[data-design]").first().waitFor({ timeout: 60_000 });
  ok(true, "«Қайта уриниш» → каталог открылся");
  await ctx.close();

  for (const width of [320, 430]) {
    console.log(`— ${width} px`);
    ({ ctx, page } = await open(width));
    await page.locator("[data-design]").first().waitFor({ timeout: 60_000 });
    await page.waitForTimeout(600);
    { const bad = await layout(page); ok(!bad.length, `каталог ${JSON.stringify(bad)}`); }
    await page.locator('[data-design="muhr"]').click();
    // Двойное нажатие «Танлаш»: «назад» с анкеты — сразу к просмотру
    await page.locator("[data-main-action]").dblclick();
    await page.locator('input[name="groom"]').waitFor();
    { const bad = await layout(page); ok(!bad.length, `анкета ${JSON.stringify(bad)}`); }
    await page.locator('input[name="groom"]').fill("Абдурахмонов Азизбек Ўткирбекович");
    await page.locator('input[name="bride"]').fill("Мадинахон");
    await page.locator('input[name="hosts"]').fill("Каримовлар оиласи");
    await page.locator('input[name="date0"]').fill("2026-12-05");
    await page.locator(`[aria-label="${T.form.venue}"] button`).first().click();
    await page.getByRole("button", { name: T.back, exact: true }).first().click();
    ok(await page.getByRole("button", { name: T.view.back }).isVisible(), "двойное «Танлаш» → «назад» сразу к просмотру");
    await page.locator("[data-main-action]").click();
    await page.locator("[data-main-action]").click();
    await page.waitForTimeout(1200);
    await page.locator("[data-main-action]").click(); // фото — пропустить
    await page.getByRole("heading", { name: T.summary.title }).waitFor();
    { const bad = await layout(page); ok(!bad.length, `итог ${JSON.stringify(bad)}`); }
    if (width === 320) await page.screenshot({ path: `${out}/uz-05-summary-320.png`, fullPage: true });
    // Правка без «Сақлаш» → «назад»: на итоге данные как в НАМУНА
    await page.getByRole("button", { name: T.form.editData }).click();
    await page.locator('input[name="bride"]').fill("Бошқа исм");
    await page.getByRole("button", { name: T.back, exact: true }).first().click();
    await page.getByRole("button", { name: T.form.editData }).click();
    ok((await page.locator('input[name="bride"]').inputValue()) === "Мадинахон", "правка без «Сақлаш» → «назад» → данные как были");
    await page.getByRole("button", { name: T.back, exact: true }).first().click();
    await page.locator("[data-main-action]").click();
    await page.getByRole("heading", { name: T.pay.checkTitle }).waitFor();
    { const bad = await layout(page); ok(!bad.length, `проверка ${JSON.stringify(bad)}`); }
    await page.locator('input[name="terms"]').check();
    await page.getByRole("button", { name: T.pay.checkYes }).dblclick();
    await page.getByRole("heading", { name: T.pay.title }).waitFor();
    { const bad = await layout(page); ok(!bad.length, `оплата ${JSON.stringify(bad)}`); }
    await page.getByRole("button", { name: T.back, exact: true }).first().click();
    ok(await page.getByRole("heading", { name: T.pay.checkTitle }).isVisible(), "двойное «Ҳаммаси тўғри» → «назад» сразу к проверке");
    // Каталог с карточкой черновика и «Менинг таклифномаларим»
    await page.getByRole("button", { name: T.back, exact: true }).first().click();
    await page.getByRole("button", { name: T.back, exact: true }).first().click();
    await page.getByRole("button", { name: T.back, exact: true }).first().click();
    await page.getByRole("button", { name: T.back, exact: true }).first().click();
    await page.getByRole("button", { name: T.view.back }).click();
    await page.locator("[data-resume]").waitFor();
    { const bad = await layout(page); ok(!bad.length, `каталог с карточкой ${JSON.stringify(bad)}`); }
    if (width === 320) await page.locator("[data-resume]").screenshot({ path: `${out}/uz-06-card-320.png` });
    await ctx.close();
  }
} finally {
  await browser.close();
}
ok(!errors.length, `нет ошибок консоли ${errors.slice(0, 3).join(" | ")}`);
if (fails.length) {
  console.log("FAILED:", fails);
  process.exit(1);
}
console.log("ALL OK");
