/**
 * Оплата без чека и промокод в Mini App (17.11.2026) на Pixel 7 и iPhone 13: плашка «🎟 Промокод борми?» над суммой,
 * номер Kaspi и сумма с «Копировать», «✅ Тўладим» → имя → «текширилмоқда»; курсор в полях — цвета акцента.
 * Запуск: npx next dev -p 3121, затем PAY_BASE=http://localhost:3121 npx vitest run scripts/pay.e2e.test.ts
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { chromium, devices, type Browser } from "playwright-core";
import { ADMIN, Sim } from "@/bot/testing/sim";
import { nikohOrder } from "@/bot/testing/paths";
import { uz } from "@/texts/bot-uz";
import { appUz } from "@/texts/app-uz";
import { payTexts } from "@/texts/pay";
import { salesTexts } from "@/texts/sales";
import { openApp, overflow } from "./e2e-harness";

const BASE = process.env.PAY_BASE;
let browser: Browser;
const ACCENT = "rgb(168, 119, 42)";

beforeAll(async () => {
  if (BASE) browser = await chromium.launch({ executablePath: process.env.CHROME || "/opt/pw-browsers/chromium" });
});
afterAll(async () => browser?.close());

describe.skipIf(!BASE)("оплата в Mini App", () => {
  for (const [name, device, platform] of [
    ["Pixel 7", devices["Pixel 7"], "android"],
    ["iPhone 13", devices["iPhone 13"], "ios"],
  ] as const)
    it(`${name}: плашка промокода над суммой, «Тўладим» → имя → на проверке; курсор виден`, async () => {
      const sim = new Sim({ now: new Date().toISOString() });
      // Промокоды включены (заглушка брони; настоящая логика — в Postgres-тестах)
      sim.deps.env.marketing = {
        ui: true,
        delivery: false,
        referrals: false,
        promos: true,
        status: false,
        edits: false,
      };
      (sim.deps.repo as { marketing?: unknown }).marketing = {
        holdOf: async () => null,
        releaseHold: async () => false,
        releaseExpired: async () => 0,
      };
      await sim.start(ADMIN);
      await sim.click(ADMIN, uz.langUz);
      const o = await nikohOrder(sim, 21).catch(async () => {
        // календарь бота зависит от сегодняшней даты — заказ создаём напрямую
        const { getDesign } = await import("@/templates/registry");
        const sample = getDesign("muhr")!.sample;
        const day = new Date(Date.now() + 20 * 86_400_000).toISOString().slice(0, 10);
        await sim.start(21);
        return sim.repo.createOrder({
          userId: 21,
          occasion: "nikoh",
          format: "animated",
          templateId: "muhr",
          data: { ...sample, events: sample.events.map((e) => ({ ...e, date: day })) },
          music: { kind: "none" },
          amount: 7990,
          slugBase: "pay-e2e",
          status: "preview",
        });
      });
      const u = { id: 21, firstName: "T", username: null, languageCode: "uz" as const };
      const { ctx, page, errors } = await openApp(browser, BASE!, sim, "/app", u, device, platform);
      try {
        await page.locator("[data-design]").first().waitFor({ timeout: 60_000 });
        // «Менинг таклифномаларим» → «Тўлаш · 7 990 ₸»
        await page.locator(`[aria-label="${appUz.myOrders}"]`).first().click();
        await page
          .getByRole("button", { name: /^Тўлаш · / })
          .first()
          .click({ timeout: 20_000 });
        await page.locator("[data-promo-open]").waitFor();
        const banner = await page.locator("[data-promo-open]").boundingBox();
        const sum = await page.locator(`text=${appUz.pay.amount}`).first().boundingBox();
        expect(await page.locator("[data-promo-open]").innerText()).toBe(salesTexts.uz.promoBanner);
        expect(banner!.y).toBeLessThan(sum!.y);
        await page.locator("[data-promo-open]").click();
        const promoInput = page.locator("[data-promo-field] input");
        await promoInput.focus();
        expect(await promoInput.evaluate((el) => getComputedStyle(el).caretColor)).toBe(ACCENT);
        // проверка → оплата
        await page.locator('input[name="terms"]').check();
        await page.getByRole("button", { name: appUz.pay.checkYes }).click();
        await page.locator("[data-kaspi]").waitFor();
        expect(await page.locator("[data-kaspi]").innerText()).toContain(payTexts.uz.how);
        await page.locator("[data-paid]").click();
        const nameInput = page.locator('input[name="payerName"]');
        await nameInput.waitFor();
        expect(await nameInput.evaluate((el) => getComputedStyle(el).caretColor)).toBe(ACCENT);
        await nameInput.fill("Давронбек И.");
        await page.locator("[data-payer-form] button[type=submit]").click();
        await page.getByText(appUz.pay.waitTitle).waitFor({ timeout: 20_000 });
        expect(await sim.repo.getOrder(o.id)).toMatchObject({ status: "receipt_sent", payerName: "Давронбек И." });
        expect(await overflow(page)).toBe(false);
      } finally {
        await ctx.close();
      }
      expect(errors).toEqual([]);
    }, 180_000);
});
