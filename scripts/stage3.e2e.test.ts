/**
 * Этап 3 — снимки изменённых экранов (Pixel 7 и iPhone SE, уз/ру) → docs/reviews/stage-3/:
 * админка «Сегодня» и «Подробнее», «Менинг таклифномаларим» с «📝 Жавоблар» и тилаками, форма «Келасизми?» с тилаком.
 * Проверки: нет вылезания по ширине, нет undefined/NaN/старых цен, нет ошибок страницы; Telegram клиента — только в карточке.
 * Запуск: npx next dev -p 3121; STAGE3_BASE=http://localhost:3121 npx vitest run scripts/stage3.e2e.test.ts
 */
import { mkdir } from "node:fs/promises";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { chromium, devices, type Browser, type Page } from "playwright-core";
import { appAction } from "@/bot/app/dispatch";
import { ADMIN, Sim } from "@/bot/testing/sim";
import { nikohWithReceipt, paidWithRsvp } from "@/bot/testing/paths";
import { appUz } from "@/texts/app-uz";
import { appRu } from "@/texts/app-ru";
import type { AppUser } from "@/lib/tg-init-data";

const BASE = process.env.STAGE3_BASE;
const OUT = "docs/reviews/stage-3";
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
const CLIENT = 41;
const who = (id: number, lang: "uz" | "ru"): AppUser => ({ id, firstName: "T" + id, username: "client_login", languageCode: lang });

beforeAll(async () => {
  if (!BASE) return;
  await mkdir(OUT, { recursive: true });
  browser = await chromium.launch({ executablePath: process.env.CHROME || "/opt/pw-browsers/chromium" });
  sim = new Sim();
  const o = await paidWithRsvp(sim, CLIENT);
  const base = { orderId: o.id, ipHash: "h" };
  await sim.repo.saveRsvp({ ...base, visitorKey: "a", name: "Каримовлар оиласи", guests: 4, attending: true, wish: "Бахтли бўлинглар, илоҳим қўша қаринглар!" });
  await sim.repo.saveRsvp({ ...base, visitorKey: "b", name: "Олим ака", guests: 2, attending: true, wish: null });
  await sim.repo.saveRsvp({ ...base, visitorKey: "c", name: "Нодира", guests: 0, attending: false, wish: "Узр, бора олмаймиз — тўйингиз муборак!" });
  await nikohWithReceipt(sim, 42, ["Бобур", "Лола"]);
}, 60_000);
afterAll(async () => browser?.close());

async function junk(page: Page) {
  const text = await page.locator("body").innerText();
  const out: string[] = [];
  if (/\bundefined\b|\bNaN\b/.test(text)) out.push("undefined/NaN");
  if (/\b[568][\s  ]?000[\s  ]?₸/.test(text)) out.push("старая цена");
  if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)) out.push("вылезает по ширине");
  return out;
}

async function open(path: string, u: AppUser, phone: (typeof PHONES)[number][1]) {
  const ctx = await browser.newContext({ ...phone, locale: u.languageCode === "ru" ? "ru-RU" : "uz-UZ" });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("https://telegram.org/js/telegram-web-app.js", (r) => r.fulfill({ contentType: "text/javascript", body: TG }));
  await page.route("**/api/app", async (r) => {
    const res = await appAction(sim.deps, u, JSON.parse(r.request().postData() ?? "{}"));
    await r.fulfill({ status: res.status, json: res.body });
  });
  const init = encodeURIComponent(`user=${encodeURIComponent(JSON.stringify({ id: u.id, first_name: u.firstName }))}&auth_date=1&hash=00`);
  await page.goto(`${BASE}${path}#tgWebAppData=${init}&tgWebAppVersion=8.0`, { waitUntil: "domcontentloaded" });
  return { ctx, page, errors };
}

describe.skipIf(!BASE)("этап 3 — экраны", () => {
  for (const [name, phone] of PHONES) {
    it(`владелец ${name}: «Сегодня» → чеки → «Подробнее»; Telegram клиента только в карточке`, async () => {
      const { ctx, page, errors } = await open("/app/owner", who(ADMIN, "ru"), phone);
      const bad: string[] = [];
      try {
        await page.locator("[data-owner-today]").waitFor({ timeout: 90_000 });
        expect(await page.locator('[data-today="waiting"] strong').innerText()).toBe("1");
        expect(await page.locator("[data-owner-receipts] article").count()).toBe(1);
        bad.push(...(await junk(page)));
        await page.screenshot({ path: `${OUT}/owner-${name}-1-today.png` });
        await page.locator("[data-owner-more]").click();
        await page.locator("[data-owner-days] tbody tr").first().waitFor();
        expect(await page.locator("[data-owner-days] tbody tr").count()).toBe(7);
        bad.push(...(await junk(page)));
        await page.screenshot({ path: `${OUT}/owner-${name}-2-more.png`, fullPage: true });
        // список заказов: имя из анкеты, логин — только в карточке
        const list = await page.locator("[data-order]").first().innerText();
        if (list.includes("client_login") || list.includes("@user")) bad.push("логин в списке заказов");
        await page.locator("[data-order-card]").first().click();
        await page.locator("[data-order-details]").waitFor();
        await page.screenshot({ path: `${OUT}/owner-${name}-3-card.png` });
      } finally {
        await ctx.close();
      }
      expect([...bad, ...errors]).toEqual([]);
    }, 180_000);

    for (const lang of ["uz", "ru"] as const)
      it(`клиент ${name} ${lang}: «📝 Жавоблар» с тилаками и «📥 Сақлаб олиш»`, async () => {
        const T = lang === "ru" ? appRu : appUz;
        await sim.repo.setLang(CLIENT, lang); // язык клиента хранится в базе — Mini App берёт его оттуда
        const { ctx, page, errors } = await open("/app", who(CLIENT, lang), phone);
        const bad: string[] = [];
        try {
          await page.locator(`[aria-label="${T.myOrders}"]`).first().waitFor({ timeout: 90_000 });
          await page.locator(`[aria-label="${T.myOrders}"]`).first().click();
          await page.locator("[data-answers-open]").waitFor();
          expect(await page.locator("[data-answers-open]").innerText()).toBe(T.orders.answers.count(6, 2));
          await page.locator("[data-answers-open]").click();
          await page.locator("[data-answers] li").first().waitFor();
          expect(await page.locator("[data-answers]").innerText()).toContain("Бахтли бўлинглар");
          bad.push(...(await junk(page)));
          await page.screenshot({ path: `${OUT}/client-${name}-${lang}-answers.png`, fullPage: true });
        } finally {
          await ctx.close();
        }
        expect([...bad, ...errors]).toEqual([]);
      }, 180_000);

    it(`гость ${name}: форма «Келасизми?» с полем тилака (демо, образцом)`, async () => {
      const ctx = await browser.newContext({ ...phone });
      const page = await ctx.newPage();
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      try {
        await page.goto(`${BASE}/demo/muhr`, { waitUntil: "domcontentloaded" });
        await page.locator("[data-open]").first().click({ timeout: 90_000 });
        await page.waitForTimeout(4000);
        const form = page.locator("[data-rsvp]").first();
        await form.scrollIntoViewIfNeeded();
        await page.locator("[data-rsvp-wish]").first().fill("Бахтли бўлинглар!");
        await form.screenshot({ path: `${OUT}/guest-${name}-wish.png` });
        expect(await junk(page)).toEqual([]);
      } finally {
        await ctx.close();
      }
      expect(errors).toEqual([]);
    }, 180_000);
  }
});
