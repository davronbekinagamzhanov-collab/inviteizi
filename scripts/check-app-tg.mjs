// Mini App /app ВНУТРИ эмуляции Telegram (iPhone, 390×844): native MainButton и BackButton с настоящими
// событиями onClick/offClick, скрипт telegram-web-app.js приходит с задержкой — как на медленном телефоне.
// Каждый переход каталог → просмотр → форма → фото → итог → проверка → оплата → чек → мои заказы
// делается нажатием native-кнопки. Отдельно: запасная кнопка, когда native не показалась; панель просмотра
// не закрывает «ЎЗ · РУ» и музыку на 360/390/430.
// Только локально, /api/app подменяется (scripts/app-mock.mjs). Запуск: npx next dev -p 3121, затем node scripts/check-app-tg.mjs
import "./ts-hooks.mjs";
import { chromium } from "playwright-core";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { mockServer } from "./app-mock.mjs";

const { CATALOG_ORDER, getDesign } = await import("../templates/registry.ts");
const { appUz } = await import("../texts/app-uz.ts");
const { appRu } = await import("../texts/app-ru.ts");
const base = process.env.CHECK_BASE_URL ?? "http://localhost:3121";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw Error("Local checks only");
const out = "docs/reviews/app-tg";
await mkdir(out, { recursive: true });
const fakeInit = encodeURIComponent(`user=${encodeURIComponent(JSON.stringify({ id: 1, first_name: "Test" }))}&auth_date=1&hash=00`);
const photoBytes = await readFile("public/covers/muhr.jpg");
const SCRIPT_DELAY = Number(process.env.TG_SCRIPT_DELAY ?? 1500);

/** Эмуляция telegram-web-app.js: состояние кнопок в window.__tg, нажатие — window.__tgPress("main" | "back") */
const TG_EMU = `(() => {
  const h = new URLSearchParams(location.hash.slice(1));
  const broken = h.get("tgBrokenMain") === "1";
  const st = (window.__tg = { main: { text: "", visible: false, active: true, progress: false, handlers: [] }, back: { visible: false, handlers: [] }, ready: 0, expand: 0 });
  const m = st.main;
  const MainButton = {
    get isVisible() { return m.visible; },
    get text() { return m.text; },
    setParams(p) {
      if ("text" in p) m.text = p.text;
      if ("is_active" in p) m.active = !!p.is_active;
      if ("is_visible" in p) m.visible = !!p.is_visible && !broken;
      return MainButton;
    },
    setText(t) { m.text = t; return MainButton; },
    onClick(f) { if (!m.handlers.includes(f)) m.handlers.push(f); return MainButton; },
    offClick(f) { m.handlers = m.handlers.filter((x) => x !== f); return MainButton; },
    show() { m.visible = !broken; return MainButton; },
    hide() { m.visible = false; return MainButton; },
    enable() { m.active = true; return MainButton; },
    disable() { m.active = false; return MainButton; },
    showProgress() { m.progress = true; return MainButton; },
    hideProgress() { m.progress = false; return MainButton; },
  };
  const b = st.back;
  const BackButton = {
    get isVisible() { return b.visible; },
    show() { b.visible = true; }, hide() { b.visible = false; },
    onClick(f) { if (!b.handlers.includes(f)) b.handlers.push(f); },
    offClick(f) { b.handlers = b.handlers.filter((x) => x !== f); },
  };
  // Как Telegram: событие приходит, только если кнопка видна (и для главной — активна)
  window.__tgPress = (which) => {
    const x = st[which];
    if (!x.visible) return "hidden";
    if (which === "main" && (!x.active || x.progress)) return "inactive";
    x.handlers.slice().forEach((f) => f());
    return x.handlers.length;
  };
  const noop = () => {};
  window.Telegram = { WebApp: { initData: h.get("tgWebAppData") || "", platform: "ios", version: "8.0",
    ready: () => st.ready++, expand: () => st.expand++, close: noop, disableVerticalSwipes: noop, setHeaderColor: noop, setBackgroundColor: noop, setBottomBarColor: noop,
    isVersionAtLeast: () => true, MainButton, BackButton,
    HapticFeedback: { impactOccurred: noop, notificationOccurred: noop, selectionChanged: noop },
    openLink: noop, openTelegramLink: noop } };
})();`;

const NIKOH = CATALOG_ORDER.nikoh.find((id) => getDesign(id)?.clientPhotos) ?? CATALOG_ORDER.nikoh[0];
const report = [];
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});

async function open(width, lang, extraHash = "") {
  const ctx = await browser.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, locale: lang === "ru" ? "ru-RU" : "uz-UZ" });
  const page = await ctx.newPage();
  const server = mockServer(lang, base);
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => m.type() === "error" && !/Failed to load resource.*(none\.mp3|ERR_TUNNEL_CONNECTION_FAILED)|Download the React DevTools/.test(m.text()) && errors.push(`console: ${m.text()}`));
  await page.route("**/api/app**", (r) => server.handle(r));
  await page.route("https://telegram.org/js/telegram-web-app.js", async (r) => {
    await new Promise((res) => setTimeout(res, SCRIPT_DELAY));
    await r.fulfill({ contentType: "text/javascript", body: TG_EMU }).catch(() => undefined);
  });
  await page.goto(`${base}/app#tgWebAppData=${fakeInit}&tgWebAppVersion=8.0${extraHash}`, { waitUntil: "domcontentloaded" });
  await page.locator("[data-design]").first().waitFor({ timeout: 40_000 });
  // п.20: каталог показывается, не дожидаясь telegram-web-app.js; native-кнопки — после того, как скрипт придёт
  await page.waitForFunction(() => window.__tg && window.__tg.ready > 0, null, { timeout: 40_000 });
  return { ctx, page, server, errors };
}

const mainText = (page) => page.evaluate(() => (window.__tg.main.visible ? window.__tg.main.text : null));
async function waitMain(page, text) {
  await page.waitForFunction((t) => window.__tg.main.visible && window.__tg.main.text === t && window.__tg.main.active && !window.__tg.main.progress, text, { timeout: 15_000 });
}
async function press(page, which) {
  await page.waitForTimeout(350); // как человек: повторное нажатие раньше 300 мс приложение считает дублем
  const r = await page.evaluate((w) => window.__tgPress(w), which);
  if (typeof r !== "number" || r < 1) throw Error(`${which} press: ${r}`);
  if (r > 1) throw Error(`${which}: ${r} handlers (double subscription)`);
}
const fallbackVisible = (page) => page.locator("[data-main-action]").isVisible();

// REPRO=1: только «Шуни танлайман» через native-кнопку (для сравнения со старой версией)
if (process.env.REPRO) {
  const { page, errors } = await open(390, "uz");
  await page.locator(`[data-design="${NIKOH}"]`).click();
  await waitMain(page, appUz.view.choose);
  const handlers = await page.evaluate(() => window.__tg.main.handlers.length);
  await page.evaluate(() => window.__tgPress("main"));
  const ok = await page.locator('input[name="date0"]').waitFor({ timeout: 5000 }).then(() => true, () => false);
  console.log(JSON.stringify({ repro: true, mainVisible: true, handlers, reachedForm: ok, errors }));
  await browser.close();
  process.exit(ok ? 0 : 1);
}

try {
  // ── 1. Полный путь на native-кнопках, uz и ru ──
  for (const lang of ["uz", "ru"]) {
    const T = lang === "ru" ? appRu : appUz;
    const { ctx, page, server, errors } = await open(390, lang);
    const steps = [];
    const step = async (name, shot = false) => {
      await page.waitForTimeout(350);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      if (overflow) errors.push(`${name}: horizontal overflow`);
      if (await fallbackVisible(page)) errors.push(`${name}: fallback button visible while native MainButton is shown`);
      steps.push(name);
      if (shot) await page.screenshot({ path: `${out}/390-${lang}-${name}.png` });
      // Обрезанный текст: элемент с текстом шире своего окна (без прокрутки по задумке)
      const clipped = await page.evaluate(() =>
        [...document.querySelectorAll("button, h1, h2, p, span, label, small, strong")]
          .filter((el) => el.offsetParent && el.children.length === 0 && el.textContent?.trim() && el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX !== "auto")
          .map((el) => el.textContent.trim().slice(0, 40)),
      );
      if (clipped.length) errors.push(`${name}: clipped text: ${clipped.join(" | ")}`);
      if (process.env.SHOTS_DIR) await page.screenshot({ path: `${process.env.SHOTS_DIR}/390-${lang}-${name}.png`, fullPage: true });
    };
    try {
      if (await mainText(page)) errors.push("catalog: MainButton must be hidden");
      // Сердце в каталоге
      const heart = page.locator(`[data-design="${NIKOH}"]`).locator("xpath=..").locator("[data-heart]");
      const box = await heart.boundingBox();
      if (!box || box.width < 43.5 || box.height < 43.5) errors.push(`heart tap area ${box?.width}×${box?.height}`);
      await heart.click();
      await page.getByText(T.catalog.saved, { exact: true }).waitFor();
      if ((await heart.getAttribute("aria-pressed")) !== "true") errors.push("heart not pressed");
      await step("01-catalog", true);
      // Просмотр → BackButton → каталог → снова просмотр
      await page.locator(`[data-design="${NIKOH}"]`).click();
      await page.locator(`iframe[src="/demo/${NIKOH}"]`).waitFor();
      await waitMain(page, T.view.choose);
      await page.waitForFunction(() => window.__tg.back.visible);
      await step("02-view");
      await press(page, "back");
      await page.locator(`[data-design="${NIKOH}"]`).waitFor();
      await page.waitForFunction(() => !window.__tg.main.visible && !window.__tg.back.visible);
      await page.locator(`[data-design="${NIKOH}"]`).click();
      await waitMain(page, T.view.choose);
      // «Шуни танлайман» (native)
      await press(page, "main");
      await page.locator('input[name="date0"]').waitFor();
      await waitMain(page, T.form.next);
      await step("03-form");
      await press(page, "main");
      await page.getByText(T.form.errors.empty).first().waitFor();
      await page.locator('input[name="groom"]').fill("Азиз");
      await page.locator('input[name="bride"]').fill("Мадина");
      await page.locator('input[name="hosts"]').fill(lang === "ru" ? "Семья Каримовых" : "Каримовлар оиласи");
      await page.locator('input[name="date0"]').fill("2026-12-05");
      await page.locator(`[aria-label="${T.form.venue}"] button`).first().click();
      await waitMain(page, T.form.next);
      await press(page, "main");
      // Фото → BackButton → форма → снова фото
      await page.getByText(T.photos.lead, { exact: true }).waitFor();
      await waitMain(page, T.photos.skip);
      await step("04-photos");
      await press(page, "back");
      await page.locator('input[name="date0"]').waitFor();
      await waitMain(page, T.form.next);
      await press(page, "main");
      await page.getByText(T.photos.lead, { exact: true }).waitFor();
      await page.locator('input[type="file"]').setInputFiles([{ name: "a.jpg", mimeType: "image/jpeg", buffer: photoBytes }]);
      await page.locator('img[src="/covers/ipak.webp"]').waitFor();
      await waitMain(page, T.photos.next);
      await press(page, "main");
      // Итог → проверка перед оплатой
      await page.getByText(T.summary.title).waitFor();
      const price = { animated: 7990, scroll: 4990, simple: 2990 }[getDesign(NIKOH).format];
      await waitMain(page, T.summary.pay(price));
      await step("05-summary");
      await press(page, "main");
      await page.getByText(T.pay.checkWarn).waitFor();
      await page.waitForFunction(() => !window.__tg.main.visible);
      await step("06-pay-check");
      await page.locator('input[name="terms"]').check();
      await page.getByRole("button", { name: T.pay.checkYes }).click();
      await page.getByText(T.pay.how).waitFor();
      await step("07-pay");
      await page.locator('input[type="file"]').setInputFiles([{ name: "chek.jpg", mimeType: "image/jpeg", buffer: photoBytes }]);
      await page.getByText(T.pay.waitTitle).waitFor();
      await waitMain(page, T.myOrders);
      await step("08-done");
      await press(page, "main");
      await page.getByText(T.orders.statuses.receipt_sent).waitFor();
      await waitMain(page, T.orders.newOne);
      await step("09-orders");
      // Сохранённые: то же сердце
      await press(page, "main");
      await page.getByRole("button", { name: new RegExp(`^${T.savedChip}( \\d+)?$`) }).click();
      await page.locator(`[data-design="${NIKOH}"]`).waitFor();
      await step("10-saved", true);
    } catch (e) {
      errors.push(`step failed after ${steps.at(-1) ?? "start"}: ${e.message.split("\n").slice(0, 3).join(" | ")}`, `calls: ${server.st.calls.join(",")}`);
      await page.screenshot({ path: `${out}/390-${lang}-FAIL.png`, fullPage: true }).catch(() => undefined);
    }
    report.push({ tag: `native-390-${lang}`, ok: !errors.length, errors: [...new Set(errors)], steps, submits: server.st.calls.filter((c) => c === "submit").length });
    console.log(JSON.stringify(report.at(-1)));
    await ctx.close();
  }

  // ── 2. Native MainButton не показалась (старый клиент) — работает запасная кнопка на странице ──
  {
    const T = appUz;
    const { ctx, page, errors } = await open(390, "uz", "&tgBrokenMain=1");
    try {
      await page.locator(`[data-design="${NIKOH}"]`).click();
      await page.locator(`iframe[src="/demo/${NIKOH}"]`).waitFor();
      const btn = page.locator("[data-main-action]");
      await btn.waitFor();
      if ((await btn.textContent())?.trim() !== T.view.choose) errors.push("fallback text");
      // Нижняя панель не закрывает демо: iframe кончается над кнопкой
      const fr = await page.locator("iframe").boundingBox();
      const bb = await btn.boundingBox();
      if (fr && bb && fr.y + fr.height > bb.y + 1) errors.push("fallback button overlaps demo");
      await page.screenshot({ path: `${out}/390-uz-fallback-view.png` });
      await btn.click();
      await page.locator('input[name="date0"]').waitFor();
    } catch (e) {
      errors.push(`fallback: ${e.message.split("\n")[0]}`);
    }
    report.push({ tag: "fallback-390", ok: !errors.length, errors });
    console.log(JSON.stringify(report.at(-1)));
    await ctx.close();
  }

  // ── 3. Просмотр: панель приложения не закрывает «ЎЗ · РУ» и музыку дизайна ──
  for (const width of [360, 390, 430]) {
    const { ctx, page, errors } = await open(width, "uz");
    try {
      await page.locator(`[data-design="${NIKOH}"]`).click();
      const frameEl = page.locator(`iframe[src="/demo/${NIKOH}"]`);
      await frameEl.waitFor();
      await waitMain(page, appUz.view.choose);
      const frame = page.frameLocator(`iframe[src="/demo/${NIKOH}"]`);
      const sw = frame.locator("[data-lang-switch]");
      await sw.waitFor({ timeout: 20_000 });
      const fb = await frameEl.boundingBox();
      const top = await page.locator("[data-heart]").boundingBox();
      if (fb && top && fb.y < top.y + top.height) errors.push("app panel overlaps demo");
      // Язык: нажатие доходит до кнопки дизайна
      await sw.getByRole("button", { name: "Русский" }).click({ timeout: 5000 });
      if ((await sw.getByRole("button", { name: "Русский" }).getAttribute("aria-pressed")) !== "true") errors.push("lang switch did not switch");
      // Музыка: видна и нажимается (у дизайнов с открытием — после открытия)
      const music = frame.locator("[data-music-button]:visible").first();
      if (await music.count()) await music.click({ timeout: 5000 });
      // Сердце на просмотре
      await page.locator("[data-heart]").click();
      await page.getByText(appUz.catalog.saved, { exact: true }).waitFor();
      await page.waitForTimeout(300);
      if ((await page.locator("[data-heart]").getAttribute("aria-pressed")) !== "true") errors.push("view heart not pressed");
      await page.screenshot({ path: `${out}/${width}-uz-view-panel.png` });
    } catch (e) {
      errors.push(`view ${width}: ${e.message.split("\n")[0]}`);
      await page.screenshot({ path: `${out}/${width}-view-FAIL.png` }).catch(() => undefined);
    }
    report.push({ tag: `view-${width}`, ok: !errors.length, errors });
    console.log(JSON.stringify(report.at(-1)));
    await ctx.close();
  }
} finally {
  await browser.close();
}
const passed = report.every((r) => r.ok);
await writeFile(`${out}/report.json`, JSON.stringify({ scope: "Local /app inside emulated Telegram WebApp (iOS); mocked /api/app", design: NIKOH, passed, report }, null, 2) + "\n");
console.log(JSON.stringify({ passed, runs: report.length }));
if (!passed) process.exitCode = 1;
