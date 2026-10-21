// Проверка пилота в браузере (Chrome через playwright-core) в 375×812 и 360×640.
// Запуск: node scripts/check-pilot.mjs <id> [--mid=700] [--base=http://localhost:3000]
// Скриншоты: pilots-screens/<id>/<ширина>x<высота>/01-cover … 05-end, 06-namuna.
// Печатает отчёт: ошибки консоли, горизонтальная прокрутка, пустые экраны при быстром листании,
// мелкий текст, ссылки карты, музыка, водяной знак.
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const id = process.argv[2];
if (!id) throw new Error("Нужно: node scripts/check-pilot.mjs <id>");
const arg = (name, def) =>
  process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? def;
const BASE = arg("base", "http://localhost:3000");
const MID = Number(arg("mid", "700")); // когда снимать «середину открытия», мс после нажатия

const VIEWPORTS = [
  { width: 375, height: 812 },
  { width: 360, height: 640 },
];

const browser = await chromium.launch({ channel: "chrome" });
const report = { id, viewports: [] };

for (const vp of VIEWPORTS) {
  const dir = `pilots-screens/${id}/${vp.width}x${vp.height}`;
  mkdirSync(dir, { recursive: true });
  const ctx = await browser.newContext({
    viewport: vp,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));

  const r = { viewport: `${vp.width}x${vp.height}` };
  const t0 = Date.now();
  await page.goto(`${BASE}/demo/${id}`, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  r.loadMs = Date.now() - t0;
  r.fcpMs = await page.evaluate(
    () => performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? null,
  );
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${dir}/01-cover.png` });

  // Открытие: дизайн помечает нажимаемый элемент атрибутом data-open
  const opener = page.locator("[data-open]").first();
  r.hasOpening = (await opener.count()) > 0;
  if (r.hasOpening) {
    await opener.click();
    await page.waitForTimeout(MID);
    await page.screenshot({ path: `${dir}/02-opening.png` });
  }
  await page.waitForSelector('[data-opened="true"]', { timeout: 10_000 }).catch(() => {
    r.openedTimeout = true;
  });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${dir}/03-opened.png` });

  // Музыка: после открытия должна играть (кнопка показывает «пауза»)
  r.musicPlaying = (await page.locator('[aria-label="Мусиқани ўчириш"]').count()) > 0;
  r.musicButton = r.musicPlaying || (await page.locator('[aria-label="Мусиқани ёқиш"]').count()) > 0;

  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    scrollHeight: document.documentElement.scrollHeight,
    innerHeight: window.innerHeight,
  }));
  r.horizontalOverflow = metrics.scrollWidth > metrics.innerWidth;
  r.pageHeight = metrics.scrollHeight;
  r.fitsOneScreen = metrics.scrollHeight <= metrics.innerHeight + 1;

  // Элементы, вылезающие за правый/левый край экрана
  r.offscreen = await page.evaluate(() => {
    const w = window.innerWidth;
    const bad = [];
    for (const el of document.querySelectorAll("body *")) {
      const s = getComputedStyle(el);
      if (s.position === "fixed" || s.visibility === "hidden" || s.display === "none") continue;
      if (el.closest("[aria-hidden='true'], [data-decor]")) continue;
      const b = el.getBoundingClientRect();
      if (b.width === 0 || b.height === 0) continue;
      if ((b.right > w + 1 || b.left < -1) && (el.textContent ?? "").trim().length > 0) {
        bad.push(`${el.tagName.toLowerCase()} «${el.textContent.trim().slice(0, 30)}» ${Math.round(b.left)}..${Math.round(b.right)}`);
      }
    }
    return bad.slice(0, 10);
  });

  // Мелкий текст: абзацы длиннее 20 знаков с кеглем меньше 16px
  r.smallText = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll("p, span, li, div, a, h1, h2, h3")) {
      const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").trim();
      if (own.length < 20) continue;
      const fs = parseFloat(getComputedStyle(el).fontSize);
      if (fs < 16) out.push(`${fs}px «${own.slice(0, 40)}»`);
    }
    return out.slice(0, 10);
  });

  // Ссылки карты
  r.mapLinks = await page.$$eval("a[href*='2gis']", (as) => as.map((a) => a.href));

  // Середина и конец
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight / 2 - innerHeight / 2 }));
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${dir}/04-middle.png` });
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight }));
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${dir}/05-end.png` });

  // Быстрое листание на свежей странице: прыжки по полэкрана, проверка через 60 мс
  await page.reload({ waitUntil: "load" });
  if (r.hasOpening) {
    await page.locator("[data-open]").first().click();
  }
  await page.waitForSelector('[data-opened="true"]', { timeout: 10_000 }).catch(() => {});
  await page.waitForTimeout(300);
  r.blankScreens = [];
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y <= total; y += Math.round(vp.height / 2)) {
    await page.evaluate((y) => window.scrollTo(0, y), y);
    await page.waitForTimeout(60);
    const visible = await page.evaluate(() => {
      const h = innerHeight;
      const effOpacity = (el) => {
        let o = 1;
        for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
          o *= parseFloat(getComputedStyle(e).opacity);
        }
        return o;
      };
      let n = 0;
      for (const el of document.querySelectorAll("p, h1, h2, h3, span, a, img, svg")) {
        if (el.closest("[data-watermark]")) continue;
        const b = el.getBoundingClientRect();
        if (b.bottom < 0 || b.top > h || b.width === 0) continue;
        if (getComputedStyle(el).position === "fixed") continue;
        if (effOpacity(el) >= 0.3) n++;
      }
      return n;
    });
    if (visible === 0) r.blankScreens.push(y);
  }

  r.consoleErrors = [...new Set(errors)];
  await ctx.close();

  // Режим «НАМУНА»: водяной знак и без музыки
  const ctx2 = await browser.newContext({ viewport: vp, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p2 = await ctx2.newPage();
  const errors2 = [];
  p2.on("console", (m) => m.type() === "error" && errors2.push(m.text()));
  p2.on("pageerror", (e) => errors2.push(String(e)));
  await p2.goto(`${BASE}/demo/${id}/namuna`, { waitUntil: "load" });
  if ((await p2.locator("[data-open]").count()) > 0) await p2.locator("[data-open]").first().click();
  await p2.waitForSelector('[data-opened="true"]', { timeout: 10_000 }).catch(() => {});
  await p2.waitForTimeout(1500);
  await p2.screenshot({ path: `${dir}/06-namuna.png` });
  r.namunaWatermark = (await p2.getByText("НАМУНА").count()) > 0;
  r.namunaMusicButton =
    (await p2.locator('[aria-label="Мусиқани ёқиш"], [aria-label="Мусиқани ўчириш"]').count()) > 0;
  r.namunaConsoleErrors = [...new Set(errors2)];
  await ctx2.close();

  report.viewports.push(r);
}

await browser.close();
console.log(JSON.stringify(report, null, 2));
