/**
 * Проверка на устройствах (17.11.2026): фото клиента, музыка, конверт, RSVP, оплата.
 * Pixel 7 и Galaxy S9+ (Android), iPhone 13 и iPhone SE, десктоп Chrome — эмуляция Playwright (движок Chromium).
 * Запуск: npx next dev -p 3121, затем DEVICES_BASE=http://localhost:3121 npx vitest run scripts/devices.e2e.test.ts
 * Без DEVICES_BASE тест пропускается. Прод-база и Storage не трогаются (scripts/e2e-harness.ts).
 */
import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { chromium, devices, type Browser } from "playwright-core";
import sharp from "sharp";
import { ADMIN, Sim } from "@/bot/testing/sim";
import { uz } from "@/texts/bot-uz";
import { appUz } from "@/texts/app-uz";
import type { AppUser } from "@/lib/tg-init-data";
import { mainAction, openApp, overflow } from "./e2e-harness";

const BASE = process.env.DEVICES_BASE;
const PHOTO_DESIGN = "vip-marvarid";
const DEVICES = {
  "Pixel 7": { device: devices["Pixel 7"], platform: "android" },
  "Galaxy S9+": { device: devices["Galaxy S9+"], platform: "android" },
  "iPhone 13": { device: devices["iPhone 13"], platform: "ios" },
  "iPhone SE": { device: devices["iPhone SE"], platform: "ios" },
  "Desktop Chrome": { device: devices["Desktop Chrome"], platform: "tdesktop" },
} as const;

let browser: Browser;
let sim: Sim;
let bigJpeg: Buffer;
let n = 3000;
const who = (id: number): AppUser => ({ id, firstName: "T" + id, username: null, languageCode: "uz" });

beforeAll(async () => {
  if (!BASE) return;
  browser = await chromium.launch({ executablePath: process.env.CHROME || "/opt/pw-browsers/chromium" });
  sim = new Sim({ now: new Date().toISOString() });
  await sim.start(ADMIN);
  await sim.click(ADMIN, uz.langUz);
  // Фото с камеры Pixel: 4000×3000, ~15 МБ (шум не сжимается)
  const noise = Buffer.alloc(4000 * 3000 * 3);
  for (let i = 0; i < noise.length; i++) noise[i] = (i * 2654435761) >>> 24;
  bigJpeg = await sharp(noise, { raw: { width: 4000, height: 3000, channels: 3 } })
    .jpeg({ quality: 100 })
    .toBuffer();
}, 120_000);
afterAll(async () => browser?.close());

/** Каталог → дизайн с фото → анкета → шаг «Расмлар» */
async function toPhotos(page: import("playwright-core").Page) {
  const T = appUz;
  await page.locator("[data-design]").first().waitFor({ timeout: 60_000 });
  await page.locator(`[data-design="${PHOTO_DESIGN}"]`).click();
  await mainAction(page).click();
  await page.locator('input[name="groom"]').fill("Азиз");
  await page.locator('input[name="bride"]').fill("Мадина");
  await page.locator('input[name="hosts"]').fill("Каримовлар оиласи");
  const day = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
  await page.locator('input[name="date0"]').fill(day);
  await page.locator(`[aria-label="${T.form.venue}"] button`).first().click();
  await mainAction(page).click();
  await page.getByText(T.photos.lead, { exact: true }).waitFor();
}

describe.skipIf(!BASE)("фото клиента на устройствах", () => {
  it("Pixel 7: выбор закрыт без фото (нет доступа к галерее) — понятная подсказка, а не тишина", async () => {
    const { ctx, page, errors } = await openApp(
      browser,
      BASE!,
      sim,
      "/app",
      who(++n),
      DEVICES["Pixel 7"].device,
      "android",
    );
    try {
      await toPhotos(page);
      await page.locator('input[type="file"]').first().dispatchEvent("cancel");
      await page.locator("[data-photo-permission]").waitFor();
      expect(await page.locator("[data-photo-permission]").innerText()).toBe(appUz.photos.permission);
    } finally {
      await ctx.close();
    }
    expect(errors).toEqual([]);
  }, 120_000);

  for (const [name, d] of Object.entries(DEVICES))
    it(`${name}: JPEG 15 МБ 4000×3000 → сжато на телефоне, в заказе 1 фото; оплата и чек-фото 15 МБ`, async () => {
      expect(bigJpeg.byteLength).toBeGreaterThan(12 * 1024 * 1024);
      const id = ++n;
      const { ctx, page, errors, uploads } = await openApp(browser, BASE!, sim, "/app", who(id), d.device, d.platform);
      try {
        await toPhotos(page);
        await page.locator('input[type="file"]').first().setInputFiles({
          name: "PXL_20261116_101500.jpg",
          mimeType: "image/jpeg",
          buffer: bigJpeg,
        });
        // ошибка — понятным текстом (тост), а не молча
        await page
          .locator('[data-photo], [role="status"]')
          .first()
          .waitFor({ timeout: 30_000 })
          .catch(() => {});
        const toast = await page.locator('[role="status"]').allInnerTexts();
        expect(toast.join(" "), "тост вместо фото").not.toMatch(/катта|большое|оч(и|и)б бўлмади/);
        await page.locator("[data-photo]").first().waitFor({ timeout: 30_000 });
        expect(uploads.photo).toHaveLength(1);
        expect(uploads.photo[0]).toBeLessThan(1.5 * 1024 * 1024);
        await mainAction(page).click();
        await page.getByText(appUz.summary.title).first().waitFor();
        await mainAction(page).click();
        await page.getByText(appUz.pay.checkWarn).waitFor({ timeout: 30_000 });
        const [o] = await sim.repo.listOrdersByUser(id);
        expect(o.data.photos ?? []).toHaveLength(1);
        expect(await overflow(page)).toBe(false);
        // Оплата: условия → «Всё верно» → чек фото 15 МБ с камеры (ужимается так же) → ожидание проверки
        await page.locator('input[name="terms"]').check();
        await page.getByRole("button", { name: appUz.pay.checkYes }).click();
        await page.getByText(appUz.pay.how).waitFor();
        await page
          .locator('input[type="file"]')
          .last()
          .setInputFiles({ name: "chek.jpg", mimeType: "image/jpeg", buffer: bigJpeg });
        await page.getByText(appUz.pay.waitTitle).waitFor({ timeout: 30_000 });
        expect(uploads.receipt).toHaveLength(1);
        expect(uploads.receipt[0]).toBeLessThan(1.5 * 1024 * 1024);
        expect((await sim.repo.getOrder(o.id))!.status).toBe("receipt_sent");
        expect(await overflow(page)).toBe(false);
      } finally {
        await ctx.close();
      }
      expect(errors).toEqual([]);
    }, 180_000);
});

void readFile;

// ── Музыка: звук только после нажатия (как на Android), касание конверта → играет; запрет → видна кнопка ▶ ──
describe.skipIf(!BASE)("музыка на устройствах", () => {
  let strict: Browser;
  let wav: Buffer;
  beforeAll(async () => {
    strict = await chromium.launch({
      executablePath: process.env.CHROME || "/opt/pw-browsers/chromium",
      args: ["--autoplay-policy=user-gesture-required"],
    });
    wav = await readFile("public/music/namuna-kuy.wav");
  });
  afterAll(async () => strict?.close());

  async function openDemo(device: (typeof DEVICES)[keyof typeof DEVICES]["device"], id: string, deny = false) {
    const ctx = await strict.newContext({ ...device });
    const page = await ctx.newPage();
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("**/storage/v1/object/public/music/**", (r) =>
      r.fulfill({ status: 200, contentType: "audio/wav", body: wav, headers: { "accept-ranges": "bytes" } }),
    );
    if (deny)
      await page.addInitScript(() => {
        HTMLMediaElement.prototype.play = () => Promise.reject(new DOMException("blocked", "NotAllowedError"));
      });
    await page.goto(`${BASE}/demo/${id}`, { waitUntil: "networkidle", timeout: 120_000 });
    return { ctx, page, errors };
  }
  const opener = (page: import("playwright-core").Page) => page.locator("[data-open]:not(:disabled)").first();

  for (const [name, d] of Object.entries(DEVICES))
    it(`${name}: касание конверта → audio.paused === false`, async () => {
      const { ctx, page, errors } = await openDemo(d.device, "muhr");
      try {
        await page.waitForTimeout(600);
        if (d.device.hasTouch) await opener(page).tap();
        else await opener(page).click();
        await page.waitForFunction(() => [...document.querySelectorAll("audio")].some((a) => !a.paused), null, {
          timeout: 10_000,
        });
      } finally {
        await ctx.close();
      }
      expect(errors).toEqual([]);
    }, 120_000);

  for (const [name, d] of Object.entries(DEVICES))
    it(`${name}: открыть конверт → ответ гостя «Келаман» → спасибо`, async () => {
      const { ctx, page, errors } = await openDemo(d.device, "muhr");
      try {
        await page.route("**/api/rsvp", (r) => r.fulfill({ json: { ok: true } }));
        await page.waitForTimeout(600);
        if (d.device.hasTouch) await opener(page).tap();
        else await opener(page).click();
        const form = page.locator("[data-rsvp]");
        await form.scrollIntoViewIfNeeded({ timeout: 15_000 });
        await form.locator("input").first().fill("Шавкат ака");
        await form.getByRole("button", { name: "+" }).click();
        await form.locator('button[type="submit"]').click();
        await form.locator("button", { hasText: /./ }).first().waitFor();
        await page.waitForFunction(() => !document.querySelector("[data-rsvp] form"), null, { timeout: 10_000 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
      } finally {
        await ctx.close();
      }
      expect(errors).toEqual([]);
    }, 120_000);

  it("Pixel 7: телефон запретил звук → заметная кнопка «Мусиқани ёқиш учун ▶ ни босинг», а не тишина", async () => {
    const { ctx, page } = await openDemo(DEVICES["Pixel 7"].device, "muhr", true);
    try {
      await page.waitForTimeout(600);
      await opener(page).tap();
      await page.locator("[data-music-hint]").waitFor({ timeout: 10_000 });
      expect(await page.locator("[data-music-hint]").innerText()).toContain("▶");
    } finally {
      await ctx.close();
    }
  }, 120_000);
});

// ── Панели ролей (Pixel 7 и iPhone 13): партнёр (уз), менеджер (ру), оптовик (цена) — от ссылки до панели ──
describe.skipIf(!BASE)("панели ролей на Pixel 7 и iPhone 13", () => {
  const PARTNER = 8800;
  const MANAGER = 8700;
  const WHOLESALE = 8900;
  const CLIENT = 8801;
  /** В узбекской панели нет русских букв ы/щ (э и ъ в узбекском есть), в русской — узбекских ў/қ/ғ/ҳ */
  const mixed = (text: string, lang: "uz" | "ru") => (lang === "uz" ? /[ыщЫЩ]/ : /[ўқғҳЎҚҒҲ]/).exec(text)?.[0] ?? null;

  beforeAll(async () => {
    const { ownerAdmin } = await import("@/bot/app/owner-admin");
    const { partnerSource } = await import("@/lib/owner-panel");
    const admin = (a: Parameters<typeof ownerAdmin>[2], b: Record<string, unknown> = {}) =>
      ownerAdmin(sim.deps, { ...who(ADMIN), languageCode: "ru" }, a, b) as Promise<Record<string, unknown>>;
    const m = await admin("ownerManagerInvite");
    await sim.start(MANAGER, "mgr_" + /start=mgr_([a-z0-9]+)/.exec(String(m.link))![1]);
    const p = (await admin("ownerPartnerNew", {
      name: "Салон Малика",
      phone: "+77011234567",
      rate: "15%",
      schedule: "weekly",
    })) as {
      id: number;
      link: string;
    };
    await sim.start(PARTNER, "join_" + /start=join_([a-z0-9]+)/.exec(p.link)![1]);
    await sim.click(PARTNER, uz.langUz);
    await sim.contact(PARTNER, "77011234567");
    // клиент партнёра оплатил: начисление видно, имени клиента — нет
    await sim.start(CLIENT, partnerSource((await sim.repo.getPartner(p.id))!.code));
    // Заказ с чеком (часы симуляции — сегодняшние, календарь бота не нужен)
    const { getDesign } = await import("@/templates/registry");
    const sample = getDesign("muhr")!.sample;
    const day = new Date(Date.now() + 20 * 86_400_000).toISOString().slice(0, 10);
    const o = await sim.repo.createOrder({
      userId: CLIENT,
      occasion: "nikoh",
      format: "animated",
      templateId: "muhr",
      data: { ...sample, groom: "Азиз", bride: "Мадина", events: sample.events.map((e) => ({ ...e, date: day })) },
      music: { kind: "none" },
      amount: 8000,
      slugBase: "aziz-madina-panel",
      status: "receipt_sent",
    });
    await sim.callback(ADMIN, `ok:${o.number}`, 1);
    await sim.start(WHOLESALE);
    await sim.click(WHOLESALE, uz.langUz);
    await admin("ownerWholesaleSet", { userId: WHOLESALE, percent: 20 });
  }, 120_000);

  for (const name of ["Pixel 7", "iPhone 13"] as const) {
    const d = DEVICES[name];
    it(`${name}: партнёр — своя панель, ссылка p_, постер, начисление, клиенты без имён, текст только уз`, async () => {
      const { ctx, page, errors } = await openApp(
        browser,
        BASE!,
        sim,
        "/app/panel",
        who(PARTNER),
        d.device,
        d.platform,
      );
      try {
        await page.locator('[data-role="partner"]').waitFor({ timeout: 60_000 });
        const text = await page.locator("body").innerText();
        expect(text).toMatch(/start=p_[a-z0-9]+/);
        expect(text).not.toContain("Азиз");
        expect(text).not.toContain("Мадина");
        expect(mixed(text.replace(/https?:\S+/g, ""), "uz")).toBeNull();
        expect(await page.locator('[data-card="due"]').innerText()).toMatch(/1\s?200/);
        await page.getByRole("button", { name: /Ўзбекча/ }).click();
        await page.waitForTimeout(800);
        expect(sim.tg.to(PARTNER).some((m) => m.type === "document")).toBe(true);
        expect(await overflow(page)).toBe(false);
      } finally {
        await ctx.close();
      }
      expect(errors).toEqual([]);
    }, 120_000);

    it(`${name}: менеджер — своя панель на русском, без денег владельца`, async () => {
      const { ctx, page, errors } = await openApp(
        browser,
        BASE!,
        sim,
        "/app/panel",
        { ...who(MANAGER), languageCode: "ru" },
        d.device,
        d.platform,
      );
      try {
        await page.locator('[data-role="manager"]').waitFor({ timeout: 60_000 });
        const text = await page.locator("body").innerText();
        expect(text).not.toContain("Салон Малика · 1 200");
        expect(text).not.toMatch(/Оплачено\s+\d/);
        expect(mixed(text.replace(/https?:\S+/g, ""), "ru")).toBeNull();
        expect(await overflow(page)).toBe(false);
      } finally {
        await ctx.close();
      }
      expect(errors).toEqual([]);
    }, 120_000);

    it(`${name}: оптовик — панели нет (вежливый отказ), в приложении без бейджей акции`, async () => {
      const panel = await openApp(browser, BASE!, sim, "/app/panel", who(WHOLESALE), d.device, d.platform);
      try {
        await panel.page.locator("[data-phase=denied]").waitFor({ timeout: 60_000 });
      } finally {
        await panel.ctx.close();
      }
      const appView = await openApp(browser, BASE!, sim, "/app", who(WHOLESALE), d.device, d.platform);
      try {
        await appView.page.locator("[data-design]").first().waitFor({ timeout: 60_000 });
        expect(await appView.page.locator("[data-deal-banner], [data-deal-price]").count()).toBe(0);
      } finally {
        await appView.ctx.close();
      }
      expect([...panel.errors.filter((e) => !/403/.test(e)), ...appView.errors]).toEqual([]);
    }, 120_000);
  }
});
