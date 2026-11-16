/**
 * «Оддий» в один экран (17.11.2026): у всех simple-дизайнов на 6 размерах × уз/ру × обычные/длинные имена (3 тадбира)
 * страница не прокручивается (scrollHeight ≤ clientHeight), ничего не вылезает за экран, нет ошибок,
 * есть имена, дата, место; у страницы с ответами гостя — кнопка «Жавоб бериш», окно открывается поверх.
 * Запуск: npx next dev -p 3121, затем ONE_PAGE_BASE=http://localhost:3121 npx vitest run scripts/one-page.e2e.test.ts
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { chromium, type Browser } from "playwright-core";
import { activeDesigns } from "@/templates/registry";
import { ONE_PAGE_LOOKS } from "@/templates/one-page-looks";

const BASE = process.env.ONE_PAGE_BASE;
const SIZES: [number, number][] = [
  [320, 560],
  [375, 600],
  [390, 640],
  [430, 700],
  [390, 844],
  [430, 932],
];
const SIMPLE = activeDesigns().filter((d) => d.format === "simple");
let browser: Browser;

beforeAll(async () => {
  if (BASE) browser = await chromium.launch({ executablePath: process.env.CHROME || "/opt/pw-browsers/chromium" });
});
afterAll(async () => browser?.close());

describe("каталог «Оддий»", () => {
  it("у каждого simple-дизайна в продаже есть палитра одноэкранного макета", () => {
    expect(SIMPLE.length).toBeGreaterThan(0);
    for (const d of SIMPLE) expect(ONE_PAGE_LOOKS[d.id], d.id).toBeDefined();
    for (const id of Object.keys(ONE_PAGE_LOOKS).filter((x) => x !== "default"))
      expect(
        SIMPLE.map((d) => d.id),
        `${id} — не simple`,
      ).toContain(id);
  });
});

describe.skipIf(!BASE)("«Оддий» — один экран без прокрутки", () => {
  for (const d of SIMPLE)
    it(`${d.id}: 6 размеров × уз/ру × обычные/длинные — без прокрутки`, async () => {
      const bad: string[] = [];
      for (const variant of ["demo", "long"] as const)
        for (const lang of ["uz", "ru"] as const) {
          const ctx = await browser.newContext({
            viewport: { width: 375, height: 812 },
            isMobile: true,
            hasTouch: true,
          });
          const page = await ctx.newPage();
          page.on("pageerror", (e) => bad.push(`${variant}/${lang}: ${e.message}`));
          await page.route("**/api/rsvp", (r) => r.fulfill({ json: { ok: true } }));
          const url =
            variant === "long"
              ? `${BASE}/dev/invitation/${d.id}?long=1&lang=${lang}`
              : `${BASE}/demo/${d.id}?lang=${lang}`;
          await page.goto(url, { waitUntil: "networkidle", timeout: 120_000 });
          for (const [w, h] of SIZES) {
            await page.setViewportSize({ width: w, height: h });
            await page.waitForTimeout(250);
            const m = await page.evaluate(() => {
              const root = document.querySelector("[data-one-page]");
              const doc = document.documentElement;
              const names = document.querySelector("[data-one-names]")?.textContent?.trim() ?? "";
              const off = [
                ...document.querySelectorAll(
                  "[data-one-page] p, [data-one-page] h1, [data-one-page] a, [data-one-page] button",
                ),
              ]
                .filter((e) => {
                  const r = e.getBoundingClientRect();
                  return r.width > 0 && (r.bottom > innerHeight + 1 || r.right > innerWidth + 1 || r.left < -1);
                })
                .map((e) => e.textContent?.trim().slice(0, 30));
              return {
                one: Boolean(root),
                scroll: doc.scrollHeight > doc.clientHeight + 1,
                names,
                events: document.querySelectorAll("[data-one-event]").length,
                opener: Boolean(document.querySelector("[data-open]")),
                off,
              };
            });
            const tag = `${variant}/${lang}/${w}×${h}`;
            if (!m.one) bad.push(`${tag}: нет одноэкранного макета`);
            if (m.scroll) bad.push(`${tag}: прокрутка`);
            if (m.opener) bad.push(`${tag}: конверт/открытие`);
            if (!m.names) bad.push(`${tag}: нет имён`);
            if (!m.events) bad.push(`${tag}: нет тадбиров`);
            if (m.off.length) bad.push(`${tag}: за экраном: ${m.off.join(" | ")}`);
          }
          // Ответ гостя открывается поверх (страница с формой — служебная, long)
          if (variant === "long") {
            await page.setViewportSize({ width: 375, height: 667 });
            const btn = page.locator("[data-one-rsvp]");
            if (!(await btn.count())) bad.push(`${variant}/${lang}: нет «Жавоб бериш»`);
            else {
              await btn.click();
              await page
                .locator("[data-one-rsvp-dialog] [data-rsvp]")
                .waitFor({ timeout: 5000 })
                .catch(() => bad.push("окно ответа не открылось"));
            }
          }
          await ctx.close();
        }
      expect(bad).toEqual([]);
    }, 240_000);
});
