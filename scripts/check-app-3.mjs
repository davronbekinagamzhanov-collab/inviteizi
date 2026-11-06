// fix/app-polish-3: браузерная проверка карточки «Тугалланмаган таклифнома» и отмены черновика (390 px, uz).
// /api/app подменяется (scripts/app-mock.mjs), заглушка живёт между «перезагрузками» — как сервер.
// Запуск: npx next dev -p 3121, затем node scripts/check-app-3.mjs. Снимки → docs/reviews/app-polish-3/
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
const server = mockServer("uz", base);
const errors = [];

async function open() {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, locale: "uz-UZ" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && !/Failed to load resource|ERR_TUNNEL|DevTools|MEDIA_ERR|NotSupportedError|no supported source/i.test(m.text()) && errors.push(m.text()));
  await page.route("**/api/app**", (r) => server.handle(r));
  await page.route("https://telegram.org/js/telegram-web-app.js", (r) => r.fulfill({ contentType: "text/javascript", body: TG_STUB }));
  await page.goto(`${base}/app#tgWebAppData=${fakeInit}`, { waitUntil: "domcontentloaded" });
  await page.locator("[data-design]").first().waitFor({ timeout: 90_000 });
  await page.waitForTimeout(800);
  return { ctx, page };
}
const overlaps = (a, b) => a && b && a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

try {
  // 1) Начал анкету и закрыл приложение сразу (до задержки сохранения)
  let { ctx, page } = await open();
  await page.locator("[data-design]").first().click();
  await page.locator("[data-main-action]").click();
  await page.locator('input[name="groom"]').fill("Азизбек Абдурахмонов");
  await page.locator('input[name="bride"]').fill("Мадинахон");
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForTimeout(300);
  ok(server.st.draft?.form?.bride === "Мадинахон", "закрыл сразу — черновик всё равно сохранён");
  await ctx.close();

  // 2) Снова открыл: сверху карточка, текст не налезает на кнопки
  ({ ctx, page } = await open());
  const card = page.locator("[data-resume]");
  ok(await card.isVisible(), "карточка «Тугалланмаган таклифнома» сверху");
  ok((await card.locator("img").count()) === 1, "в карточке — обложка дизайна");
  const title = await card.locator("strong").boundingBox();
  const cont = await card.getByRole("button", { name: T.catalog.continueAction }).boundingBox();
  const trash = await card.locator("[data-cancel]").boundingBox();
  ok(!overlaps(title, cont) && !overlaps(title, trash), "текст не налезает на кнопки");
  ok((await card.locator("[data-cancel]").innerText()).trim() === "", "отмена — только корзина, без слова");
  ok(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)), "ничего не вылезает за экран");
  await card.screenshot({ path: `${out}/uz-01-card.png` });

  // 3) «Давом этиш» → анкета с данными
  await card.getByRole("button", { name: T.catalog.continueAction }).click();
  ok((await page.locator('input[name="bride"]').inputValue()) === "Мадинахон", "«Давом этиш» → анкета с заполненными данными");
  await page.locator('input[name="groom"]').fill("Азиз");
  await page.waitForTimeout(900);
  await page.goBack().catch(() => undefined);
  await ctx.close();

  // 4) Корзина → «Аниқми?» → отмена; карточка пропала сразу; после «перезагрузки» нет ни карточки, ни записи
  ({ ctx, page } = await open());
  await page.locator("[data-resume] [data-cancel]").click();
  ok(await page.getByText(T.orders.cancelAsk).isVisible(), "подтверждение «Аниқми?»");
  await page.locator("[data-resume]").screenshot({ path: `${out}/uz-02-confirm.png` });
  await page.getByRole("button", { name: T.orders.cancelYes }).click();
  await page.locator("[data-resume]").waitFor({ state: "detached", timeout: 3000 }).catch(() => undefined);
  ok(!(await page.locator("[data-resume]").count()), "после отмены карточка пропала сразу");
  await page.waitForTimeout(1200);
  ok(server.st.draft === null, "сервер: черновика нет (никакое запоздавшее сохранение его не вернуло)");
  await ctx.close();
  ({ ctx, page } = await open());
  ok(!(await page.locator("[data-resume]").count()), "перезагрузка: карточки нет");
  ok(!server.st.orders.length, "перезагрузка: в «Менинг таклифномаларим» пусто");
  await ctx.close();
} finally {
  await browser.close();
}
ok(!errors.length, `нет ошибок консоли ${errors.join(" | ")}`);
if (fails.length) {
  console.log("FAILED:", fails);
  process.exit(1);
}
console.log("ALL OK");
