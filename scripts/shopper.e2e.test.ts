/**
 * «Тайный покупатель» (19.11.2026): путь живого человека, а не проверка функций.
 *  - Клиент (Pixel 7 и iPhone SE, уз и ру): каталог → дизайн («что входит») → данные (длинные имена) → итог →
 *    проверка → «✅ Тўладим» + имя → ✅ владельца → «Менинг таклифномаларим» → «📥 Сақлаб олиш» → файл в чат.
 *  - Гость (без Telegram, медленный 4G): демо открывается, конверт, кнопка музыки, карта, ответ гостя, значок InviteIZI.
 * На каждом экране: нет вылезания по ширине, нет undefined/NaN/старых цен, нет ошибок страницы; снимки → OUT.
 * Интерфейс — настоящий (next dev), ответы /api/app — настоящий серверный код на тестовой базе в памяти (Sim).
 * Запуск: npx next dev -p 3121; SHOPPER_BASE=http://localhost:3121 npx vitest run scripts/shopper.e2e.test.ts
 */
import { mkdir } from "node:fs/promises";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { chromium, devices, type Browser, type Page } from "playwright-core";
import { appAction } from "@/bot/app/dispatch";
import { ADMIN, Sim } from "@/bot/testing/sim";
import { appUz } from "@/texts/app-uz";
import { appRu } from "@/texts/app-ru";
import { payTexts } from "@/texts/pay";
import { activeDesigns } from "@/templates/registry";
import type { AppUser } from "@/lib/tg-init-data";
import { keepsakePdf, keepsakePng } from "@/lib/keepsake/render";

const BASE = process.env.SHOPPER_BASE;
const OUT = process.env.SHOPPER_OUT ?? "/tmp/inviteizi-shopper";
const DESIGN = activeDesigns().find((d) => d.occasion === "nikoh" && d.format === "animated" && !d.clientPhotos)!;
const PHONES = [
  ["pixel7", devices["Pixel 7"]],
  ["iphoneSE", devices["iPhone SE"]],
] as const;

const TG = `(() => {
  const h = new URLSearchParams(location.hash.slice(1));
  const noop = () => {};
  const btn = { isVisible: false, text: "", setParams() { return btn; }, setText() { return btn; }, onClick: noop, offClick: noop,
    show: noop, hide: noop, enable: noop, disable: noop, showProgress: noop, hideProgress: noop };
  window.Telegram = { WebApp: { initData: h.get("tgWebAppData") || "", platform: "android", version: "8.0", ready: noop, expand: noop,
    close: noop, disableVerticalSwipes: noop, setHeaderColor: noop, setBackgroundColor: noop, setBottomBarColor: noop,
    isVersionAtLeast: () => false, MainButton: btn, BackButton: { show: noop, hide: noop, onClick: noop, offClick: noop },
    HapticFeedback: { impactOccurred: noop, notificationOccurred: noop, selectionChanged: noop },
    openLink: noop, openTelegramLink: noop } };
})();`;

let browser: Browser;
let sim: Sim;
const who = (id: number, lang: "uz" | "ru"): AppUser => ({ id, firstName: "T" + id, username: null, languageCode: lang });

beforeAll(async () => {
  if (!BASE) return;
  await mkdir(OUT, { recursive: true });
  browser = await chromium.launch({ executablePath: process.env.CHROME || "/opt/pw-browsers/chromium" });
  sim = new Sim({ now: new Date().toISOString() });
  // «Сақлаб олиш» с настоящим построением файлов; видео — как будто рендер подключён
  sim.deps.keepsake = {
    render: (o, url, kind) => (kind === "a5" || kind === "a6" ? keepsakePdf(o, url, kind) : keepsakePng(o, url, kind)),
    ownerIds: () => [ADMIN],
    videoJob: async (o) => ({ orderId: o.id, slug: o.slug, url: "", musicUrl: null, cta: "", link: "", paper: "#fff", ink: "#000", callback: "" }),
    dispatchVideo: async () => {},
  };
}, 60_000);
afterAll(async () => browser?.close());

/** Мусор на экране, который видит человек */
async function junk(page: Page) {
  const text = await page.locator("body").innerText();
  const out: string[] = [];
  if (/\bundefined\b/.test(text)) out.push("undefined");
  if (/\bNaN\b/.test(text)) out.push("NaN");
  if (/\b[568][\s  ]?000[\s  ]?₸/.test(text)) out.push("старая цена");
  if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)) out.push("вылезает по ширине");
  return out;
}

async function openApp(u: AppUser, phone: (typeof PHONES)[number][1]) {
  const ctx = await browser.newContext({ ...phone, locale: u.languageCode === "ru" ? "ru-RU" : "uz-UZ" });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error" && !/Failed to load resource|ERR_TUNNEL|DevTools|404/.test(m.text())) errors.push(m.text());
  });
  await page.route("https://telegram.org/js/telegram-web-app.js", (r) => r.fulfill({ contentType: "text/javascript", body: TG }));
  await page.route("**/api/app", async (r) => {
    const res = await appAction(sim.deps, u, JSON.parse(r.request().postData() ?? "{}"));
    await r.fulfill({ status: res.status, json: res.body });
  });
  const init = encodeURIComponent(`user=${encodeURIComponent(JSON.stringify({ id: u.id, first_name: u.firstName }))}&auth_date=1&hash=00`);
  await page.goto(`${BASE}/app#tgWebAppData=${init}&tgWebAppVersion=8.0`, { waitUntil: "domcontentloaded" });
  return { ctx, page, errors };
}

const main = (page: Page) => page.locator("[data-main-action]").last();

describe.skipIf(!BASE)("тайный покупатель", () => {
  let n = 0;
  for (const [phoneName, phone] of PHONES)
    for (const lang of ["uz", "ru"] as const)
      it(`клиент ${phoneName} ${lang}: от каталога до «📥 Сақлаб олиш»`, async () => {
        const T = lang === "ru" ? appRu : appUz;
        const P = payTexts[lang];
        const id = 5000 + ++n;
        const { ctx, page, errors } = await openApp(who(id, lang), phone);
        const found: string[] = [];
        const shot = async (name: string) => {
          for (const j of await junk(page)) found.push(`${name}: ${j}`);
          await page.screenshot({ path: `${OUT}/client-${phoneName}-${lang}-${name}.png` });
        };
        try {
          await page.locator("[data-design]").first().waitFor({ timeout: 90_000 });
          await shot("01-catalog");
          await page.locator(`[data-design="${DESIGN.id}"]`).click();
          await page.locator("[data-view-includes]").waitFor();
          expect(await page.locator("[data-view-includes]").innerText()).toContain("🎬");
          await shot("02-view");
          await main(page).click();
          await page.locator('input[name="groom"]').waitFor();
          await page.locator('input[name="groom"]').fill("Абдурашидхон");
          await page.locator('input[name="bride"]').fill("Гулчеҳрахон");
          await page.locator('input[name="hosts"]').fill(lang === "ru" ? "Семья Абдурашидовых" : "Абдурашидовлар оиласи");
          await page.locator('input[name="date0"]').fill("2026-12-05");
          await page.locator(`[aria-label="${T.form.venue}"] button`).first().click();
          await shot("03-form");
          await main(page).click();
          await page.getByText(T.summary.title).first().waitFor();
          await shot("04-summary");
          await main(page).click();
          await page.locator('input[name="terms"]').waitFor();
          await shot("05-check");
          await page.locator('input[name="terms"]').check();
          await page.getByRole("button", { name: T.pay.checkYes }).click();
          await page.locator("[data-kaspi]").waitFor();
          await shot("06-kaspi");
          await page.locator("[data-paid]").click();
          await page.locator('input[name="payerName"]').fill("Давронбек И.");
          await shot("07-name");
          await page.locator("[data-payer-form] button[type=submit]").click();
          await page.getByText(T.pay.waitTitle).waitFor({ timeout: 20_000 });
          await shot("08-wait");
          const [o] = await sim.repo.listOrdersByUser(id);
          expect(o.status).toBe("receipt_sent");
          expect(o.payerName).toBe("Давронбек И.");
          await sim.callback(ADMIN, `ok:${o.number}`, 1);
          // клиент открывает «Менинг таклифномаларим»
          await page.reload({ waitUntil: "domcontentloaded" });
          await page.locator(`[aria-label="${T.myOrders}"]`).first().click();
          await page.getByRole("button", { name: T.orders.keepsake.button }).waitFor();
          await page.getByRole("button", { name: T.orders.keepsake.button }).click();
          await page.locator("[data-keepsake]").waitFor();
          await shot("09-keepsake");
          const before = sim.tg.to(id).length;
          await page.getByRole("button", { name: T.orders.keepsake.kinds.story }).click();
          await page.getByText(T.orders.keepsake.result.sent).waitFor({ timeout: 30_000 });
          await shot("10-sent");
          expect(sim.tg.to(id).length).toBe(before + 1);
          expect(sim.tg.to(id).at(-1)!.type).toBe("photo");
          void P;
        } finally {
          await ctx.close();
        }
        expect([...found, ...errors]).toEqual([]);
      }, 240_000);

  for (const [phoneName, phone] of PHONES)
    it(`гость ${phoneName}: медленный 4G — открытие, музыка, карта, ответ, значок`, async () => {
      const ctx = await browser.newContext({ ...phone, locale: "uz-UZ" });
      const page = await ctx.newPage();
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      const cdp = await ctx.newCDPSession(page);
      // «Обычный 4G» Chrome DevTools: 9 Мбит/с вниз, 1,5 Мбит/с вверх, 170 мс
      await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 170, downloadThroughput: (9 * 1024 * 1024) / 8, uploadThroughput: (1.5 * 1024 * 1024) / 8 });
      const found: string[] = [];
      try {
        const t0 = Date.now();
        await page.goto(`${BASE}/demo/${DESIGN.id}`, { waitUntil: "domcontentloaded" });
        await page.locator("[data-open]").first().waitFor({ timeout: 30_000 });
        const firstScreen = Date.now() - t0;
        await page.screenshot({ path: `${OUT}/guest-${phoneName}-01-closed.png` });
        await page.locator("[data-open]").first().click();
        await page.waitForTimeout(4500);
        for (const j of await junk(page)) found.push(`гость: ${j}`);
        if ((await page.locator("[data-music-button]").count()) !== 1) found.push("кнопка музыки не одна");
        await page.screenshot({ path: `${OUT}/guest-${phoneName}-02-open.png` });
        const map = page.locator('a[href*="2gis"], a[href*="google"], a[href*="yandex"], a[href*="maps"]').first();
        if (!(await map.count())) found.push("нет ссылки на карту");
        if (!(await page.locator("[data-rsvp]").count())) found.push("нет ответа гостя");
        const badge = await page.locator("[data-brand-badge] a, a[data-brand-footer-link]").first().getAttribute("href").catch(() => null);
        if (!badge || !/catalog|t\.me|inviteizi/.test(badge)) found.push(`значок ведёт: ${badge}`);
        await page.screenshot({ path: `${OUT}/guest-${phoneName}-03-full.png`, fullPage: true });
        console.log(`гость ${phoneName}: первый экран на 4G за ${firstScreen} мс (dev-сервер, без кэша)`);
      } finally {
        await ctx.close();
      }
      expect([...found, ...errors]).toEqual([]);
    }, 120_000);
});
