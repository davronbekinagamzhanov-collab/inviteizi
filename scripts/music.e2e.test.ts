/**
 * Музыка на настоящих телефонах (17.11.2026): политика «звук только после касания», страница и iframe (Mini App),
 * одна кнопка (плашки «Мусиқа…» нет), сломанный файл → одна запись в журнал ошибок, mp3 отдаётся с Range.
 * Запуск: npx next dev -p 3121, затем MUSIC_BASE=http://localhost:3121 npx vitest run scripts/music.e2e.test.ts
 */
import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { chromium, devices, type Browser, type Page } from "playwright-core";

const BASE = process.env.MUSIC_BASE;
let browser: Browser;
let wav: Buffer;

beforeAll(async () => {
  if (!BASE) return;
  browser = await chromium.launch({
    executablePath: process.env.CHROME || "/opt/pw-browsers/chromium",
    args: ["--autoplay-policy=user-gesture-required"],
  });
  wav = await readFile("public/music/namuna-kuy.wav");
});
afterAll(async () => browser?.close());

async function open(opts: { broken?: boolean } = {}) {
  const ctx = await browser.newContext({ ...devices["Pixel 7"] });
  const page = await ctx.newPage();
  const reports: Record<string, unknown>[] = [];
  await page.route("**/storage/v1/object/public/music/**", (r) =>
    opts.broken
      ? r.fulfill({ status: 404, contentType: "text/plain", body: "nope" })
      : r.fulfill({ status: 200, contentType: "audio/wav", body: wav, headers: { "accept-ranges": "bytes" } }),
  );
  await page.route("**/api/client-error", (r) => {
    reports.push(JSON.parse(r.request().postData() ?? "{}"));
    return r.fulfill({ status: 204, body: "" });
  });
  return { ctx, page, reports };
}
const playing = (page: Page) =>
  page.waitForFunction(() => [...document.querySelectorAll("audio")].some((a) => !a.paused && a.volume === 1), null, {
    timeout: 10_000,
  });

describe.skipIf(!BASE)("музыка: звук только после касания", () => {
  it("страница: касание конверта → играет с полной громкостью; плашки «Мусиқа…» нет, одна кнопка", async () => {
    const { ctx, page } = await open();
    try {
      await page.goto(`${BASE}/demo/muhr`, { waitUntil: "networkidle", timeout: 120_000 });
      await page.locator("[data-open]:not(:disabled)").first().tap();
      await playing(page);
      await page.locator("[data-music-button]").first().waitFor({ timeout: 8000 });
      expect(await page.locator("[data-music-hint]").count()).toBe(0);
      expect(await page.locator("[data-music-button]").count()).toBe(1);
    } finally {
      await ctx.close();
    }
  }, 120_000);

  it("iframe Mini App (allow=autoplay): касание внутри → играет", async () => {
    const { ctx, page } = await open();
    try {
      // Родительская страница с iframe, как в Mini App: звук разрешён только атрибутом allow="autoplay"
      await page.setContent(
        `<iframe src="${BASE}/demo/muhr" allow="autoplay; fullscreen" style="width:390px;height:780px;border:0"></iframe>`,
      );
      const frame = page.frameLocator("iframe");
      await frame.locator("[data-open]:not(:disabled)").first().waitFor({ timeout: 60_000 });
      await frame.locator("[data-open]:not(:disabled)").first().tap();
      const f = page.frames().find((x) => x.url().includes("/demo/muhr"))!;
      await f.waitForFunction(() => [...document.querySelectorAll("audio")].some((a) => !a.paused), null, {
        timeout: 10_000,
      });
    } finally {
      await ctx.close();
    }
  }, 120_000);

  it("файл музыки не открылся → кнопка ♪ пульсирует (без текста) и одна запись в журнал ошибок", async () => {
    const { ctx, page, reports } = await open({ broken: true });
    try {
      await page.goto(`${BASE}/demo/muhr`, { waitUntil: "networkidle", timeout: 120_000 });
      await page.locator("[data-open]:not(:disabled)").first().tap();
      await page.locator("[data-music-pulse]").waitFor({ timeout: 15_000 });
      await page.waitForTimeout(1000);
      expect(reports).toHaveLength(1);
      expect(reports[0]).toMatchObject({ where: "browser", design: "muhr" });
      expect(String(reports[0].name)).toMatch(/MediaError|NotSupportedError|NotAllowedError/);
      expect(String(reports[0].src)).toContain("/music/");
      expect(await page.locator("[data-music-hint]").count()).toBe(0);
    } finally {
      await ctx.close();
    }
  }, 120_000);

  it("свои mp3 (/audio/originals) — audio/mpeg и Range (206)", async () => {
    const res = await fetch(`${BASE}/audio/originals/inviteizi-sunnat-bayram-nafasi.mp3`, {
      headers: { range: "bytes=0-99" },
    });
    expect(res.status).toBe(206);
    expect(res.headers.get("content-type")).toBe("audio/mpeg");
    expect(res.headers.get("content-range")).toMatch(/^bytes 0-99\//);
  });
});
