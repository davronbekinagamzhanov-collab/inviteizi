/**
 * Сквозной аудит Mini App (17.11.2026): уз/ру × 320/390. Каталог → «Мои приглашения» → оплата → дизайн.
 * На каждом экране: нет горизонтальной прокрутки, нет «undefined/NaN/null», нет старых цен, нет ошибок страницы.
 * UX_SHOTS=<папка> — сохранить снимки для отчёта.
 * Запуск: npx next dev -p 3121, затем UX_BASE=http://localhost:3121 npx vitest run scripts/ux-audit.e2e.test.ts
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdirSync } from "node:fs";
import { chromium, type Browser, type Page } from "playwright-core";
import { Sim } from "@/bot/testing/sim";
import { getDesign } from "@/templates/registry";
import { appUz } from "@/texts/app-uz";
import { appRu } from "@/texts/app-ru";
import { openApp, overflow } from "./e2e-harness";

const BASE = process.env.UX_BASE;
const SHOTS = process.env.UX_SHOTS;
let browser: Browser;
beforeAll(async () => {
  if (BASE) browser = await chromium.launch({ executablePath: process.env.CHROME || "/opt/pw-browsers/chromium" });
  if (SHOTS) mkdirSync(SHOTS, { recursive: true });
});
afterAll(async () => browser?.close());

const BAD = /\bundefined\b|\bNaN\b|\bnull\b|\[object |[568] 000 ₸/;

async function check(page: Page, name: string, tag: string) {
  await page.waitForTimeout(600);
  expect(await overflow(page), `${tag} ${name}: горизонтальная прокрутка`).toBe(false);
  const text = await page.locator("body").innerText();
  expect(text.match(BAD)?.[0] ?? null, `${tag} ${name}: битый текст`).toBeNull();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${tag}-${name}.png` });
}

describe.skipIf(!BASE)("Mini App: аудит экранов", () => {
  for (const lang of ["uz", "ru"] as const)
    for (const [w, h] of [
      [320, 640],
      [390, 844],
    ])
      it(`${lang} ${w}×${h}`, async () => {
        const T = lang === "uz" ? appUz : appRu;
        const sim = new Sim({ now: new Date().toISOString() });
        await sim.start(31);
        await sim.click(31, lang === "uz" ? "🇺🇿 Ўзбекча" : "🇷🇺 Русский");
        const sample = getDesign("muhr")!.sample;
        const day = new Date(Date.now() + 20 * 86_400_000).toISOString().slice(0, 10);
        await sim.repo.createOrder({
          userId: 31,
          occasion: "nikoh",
          format: "animated",
          templateId: "muhr",
          data: { ...sample, events: sample.events.map((e) => ({ ...e, date: day })) },
          music: { kind: "none" },
          amount: 7990,
          slugBase: "ux-audit",
          status: "preview",
        });
        const u = { id: 31, firstName: "T", username: null, languageCode: lang };
        const device = {
          viewport: { width: w, height: h },
          deviceScaleFactor: 1,
          isMobile: true,
          hasTouch: true,
          userAgent:
            "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36",
        };
        const { ctx, page, errors } = await openApp(browser, BASE!, sim, "/app", u, device, "android");
        const tag = `${lang}-${w}`;
        try {
          await page.locator("[data-design]").first().waitFor({ timeout: 60_000 });
          await check(page, "1-catalog", tag);
          await page.locator(`[aria-label="${T.myOrders}"]`).first().click();
          await page.waitForTimeout(1200);
          await check(page, "2-orders", tag);
          await page
            .getByRole("button", { name: lang === "uz" ? /^Тўлаш · / : /^(Оплатить|К оплате) · / })
            .first()
            .click({ timeout: 20_000 });
          await page.waitForTimeout(1200);
          await check(page, "3-pay", tag);
          // Тадбиры на экране проверки — каждый своей строкой (раньше склеивались в один абзац)
          const box = page.locator("p", { hasText: "📅" }).first();
          expect(await box.evaluate((p) => getComputedStyle(p).whiteSpace)).toBe("pre-line");
          expect((await box.innerText()).split("\n").filter((l) => l.startsWith("📅"))).toHaveLength(2);
          expect(errors, `${tag}: ошибки страницы`).toEqual([]);
        } finally {
          await ctx.close();
        }
        // Экран дизайна — в новом окне Mini App (внутри Telegram «назад» — системная кнопка)
        const second = await openApp(browser, BASE!, sim, "/app", u, device, "android");
        try {
          await second.page.locator("[data-design]").first().waitFor({ timeout: 60_000 });
          await second.page.locator("[data-design]").first().click();
          await second.page.waitForTimeout(1200);
          await check(second.page, "4-design", tag);
          expect(second.errors, `${tag}: ошибки страницы`).toEqual([]);
        } finally {
          await second.ctx.close();
        }
      }, 180_000);
});
