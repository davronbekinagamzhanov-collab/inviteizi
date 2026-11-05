// v2, часть 9 + музыка: каждый активный дизайн × uz/ru/kk на 360 px (и 430 px для uz).
// Страница /dev/invitation/<id>?lang=<язык>&music=1 (языки ru+kk включены, песня — локальный файл).
// Проверяет: ошибки консоли (кроме внешних картинок, недоступных в песочнице), горизонтальную прокрутку,
// выход текста за край, <html lang>, узбекские слова в ru/kk, переключатель языка, музыку:
// после тапа (открытие или любой тап) играет, кнопка выключает и включает.
// Запуск при работающем dev-сервере: BASE=http://localhost:3100 node scripts/check-langs.mjs [id …]
// Результат: docs/reviews/langs/report.json и первые экраны docs/reviews/langs/<id>-<язык>.jpg
import { chromium } from "playwright-core";
import { createJiti } from "jiti";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3100";
const root = process.cwd().split("\\").join("/");
const jiti = createJiti(`${root}/scripts/check-langs.mjs`, { alias: { "@": root } });
const { activeDesigns } = await jiti.import(`${root}/templates/registry.ts`);
const only = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const list = activeDesigns().filter((d) => !only.length || only.includes(d.id));
const OUT = "docs/reviews/langs";
mkdirSync(OUT, { recursive: true });

/** Узбекские служебные слова, которых не должно быть на ru/kk (данные заказа — имена, адреса — могут быть узбекскими) */
const UZ_WORDS = ["таклиф", "Келаман", "Ўтказилиш", "Харитада", "дақиқа", "сония", "Пастга", "Мусиқани", "Очиш учун", "Тўй дастури", "Чин юракдан", "Сизни"];
const LOCALE = { uz: "uz-UZ", ru: "ru-RU", kk: "kk-KZ" };
const ignored = (t) => /ERR_TUNNEL_CONNECTION_FAILED|ERR_PROXY|ERR_NAME_NOT_RESOLVED|images\.unsplash|upload\.wikimedia/.test(t);

function measure(uzWords) {
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    for (let e = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) === 0) return false;
    }
    return true;
  };
  const out = { overflowX: Math.max(0, document.documentElement.scrollWidth - innerWidth), outside: [], uz: [] };
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const el = n.parentElement;
    const text = n.textContent.trim();
    if (!el || !text || el.closest("[data-decor],[aria-hidden='true'],script,style") || !visible(el)) continue;
    const r = document.createRange();
    r.selectNodeContents(n);
    for (const q of r.getClientRects()) if (q.width > 0 && (q.right > innerWidth + 1 || q.left < -1)) out.outside.push(text.slice(0, 40));
    for (const w of uzWords) if (text.includes(w)) out.uz.push(text.slice(0, 50));
  }
  out.outside = [...new Set(out.outside)].slice(0, 8);
  out.uz = [...new Set(out.uz)].slice(0, 8);
  return out;
}

const audioState = () => {
  const a = document.querySelector("audio");
  return a ? (a.paused ? "paused" : "playing") : "none";
};

async function scrollThrough(page) {
  const total = await page.evaluate(() => document.scrollingElement.scrollHeight - innerHeight);
  const step = Math.round((page.viewportSize()?.height ?? 740) * 0.85);
  for (let y = 0; y <= total + step; y += step) {
    await page.evaluate((y) => window.scrollTo(0, y), y);
    await page.waitForTimeout(140);
  }
}

const browser = await chromium.launch({ executablePath: process.env.CHROME ?? "/opt/pw-browsers/chromium" });
const report = {};
let problems = 0;
for (const d of list) {
  report[d.id] = { number: d.number, format: d.format };
  for (const [lang, width] of [["uz", 360], ["ru", 360], ["kk", 360], ["uz", 430]]) {
    const key = `${lang}${width}`;
    const r = (report[d.id][key] = { errors: [] });
    const page = await browser.newPage({ viewport: { width, height: width === 430 ? 860 : 740 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, locale: LOCALE[lang] });
    page.on("console", (m) => m.type() === "error" && !ignored(m.text()) && r.errors.push(m.text().slice(0, 160)));
    page.on("pageerror", (e) => r.errors.push(String(e).slice(0, 160)));
    page.on("requestfailed", () => undefined);
    await page.goto(`${BASE}/dev/invitation/${d.id}?lang=${lang}&music=1`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await page.waitForLoadState("load", { timeout: 20_000 }).catch(() => undefined);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(600);
    r.htmlLang = await page.evaluate(() => document.documentElement.lang);
    if (width === 360) await page.screenshot({ path: `${OUT}/${d.id}-${lang}.jpg`, type: "jpeg", quality: 62 });
    // Первый тап: заставка (если есть) или любое место страницы
    const opener = page.locator("[data-open]").first();
    const hasOpener = (await opener.count()) > 0;
    if (hasOpener) await opener.click({ timeout: 4000 }).catch(() => undefined);
    else await page.mouse.click(width / 2, 300);
    await page.waitForTimeout(2600);
    r.afterTap = await page.evaluate(audioState);
    const btn = page.locator("[data-music-button]:not([data-music-hint])").first();
    if (await btn.count()) {
      await btn.click({ force: true }).catch(() => undefined);
      await page.waitForTimeout(300);
      const off = await page.evaluate(audioState);
      await btn.click({ force: true }).catch(() => undefined);
      await page.waitForTimeout(500);
      const on = await page.evaluate(audioState);
      r.music = r.afterTap === "playing" && off === "paused" && on === "playing" ? "ok" : `тап ${r.afterTap} → выкл ${off} → вкл ${on}`;
    } else r.music = `нет круглой кнопки (после тапа ${r.afterTap})`;
    await scrollThrough(page);
    Object.assign(r, await page.evaluate(measure, lang === "uz" ? [] : UZ_WORDS));
    // Переключатель: на uz360 нажимаем «ҚЗ» — страница становится казахской
    if (key === "uz360") {
      const kz = page.locator("[data-lang-switch] button[lang='kk']");
      if (await kz.count()) {
        await kz.click();
        await page.waitForTimeout(400);
        r.switchTo = await page.evaluate(() => document.documentElement.lang);
      } else r.switchTo = "нет переключателя";
    }
    await page.close();
    const bad = r.errors.length || r.overflowX || r.outside.length || r.uz.length || r.music !== "ok" || r.htmlLang !== lang || (key === "uz360" && r.switchTo !== "kk");
    if (bad) problems++;
    console.log(`${d.id} ${key}: ${bad ? "ВНИМАНИЕ" : "ок"} err ${r.errors.length} ovf ${r.overflowX} out ${r.outside.length} uz ${r.uz.length} music ${r.music} lang ${r.htmlLang}${r.switchTo ? ` → ${r.switchTo}` : ""}`);
  }
}
await browser.close();
writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 1));
console.log(`Готово: ${list.length} дизайнов, замечаний: ${problems}`);
