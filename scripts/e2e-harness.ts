/**
 * Общая обвязка браузерных проверок Mini App (17.11.2026): интерфейс — настоящий (next dev/start),
 * /api/app — НАСТОЯЩИЙ серверный код (bot/app/dispatch.ts) на тестовой базе в памяти (Sim).
 * Загрузка фото: тело запроса проверяется (≤ 4,5 МБ — лимит Vercel), в ответ — адрес в бакете photos (без записи).
 * Прод-база, Storage и Telegram не трогаются.
 */
import { createHash } from "node:crypto";
import type { Browser, BrowserContextOptions, Page } from "playwright-core";
import { appAction } from "@/bot/app/dispatch";
import * as app from "@/bot/app/service";
import type { Sim } from "@/bot/testing/sim";
import type { AppUser } from "@/lib/tg-init-data";

export const VERCEL_BODY_LIMIT = 4.5 * 1024 * 1024;

/** telegram-web-app.js: native-кнопки «не показываются» — приложение рисует свои (их и нажимаем) */
export const tgStub = (platform: "android" | "ios" | "tdesktop") => `(() => {
  const h = new URLSearchParams(location.hash.slice(1));
  const noop = () => {};
  const btn = { isVisible: false, text: "", setParams() { return btn; }, setText() { return btn; }, onClick: noop, offClick: noop,
    show: noop, hide: noop, enable: noop, disable: noop, showProgress: noop, hideProgress: noop };
  window.Telegram = { WebApp: { initData: h.get("tgWebAppData") || "", platform: "${platform}", version: "8.0", ready: noop, expand: noop,
    close: noop, disableVerticalSwipes: noop, setHeaderColor: noop, setBackgroundColor: noop, setBottomBarColor: noop,
    isVersionAtLeast: () => false, MainButton: btn, BackButton: { show: noop, hide: noop, onClick: noop, offClick: noop },
    HapticFeedback: { impactOccurred: noop, notificationOccurred: noop, selectionChanged: noop },
    openLink: noop, openTelegramLink: noop } };
})();`;

export type Uploads = { photo: number[]; receipt: number[] };

export async function openApp(
  browser: Browser,
  base: string,
  sim: Sim,
  path: string,
  u: AppUser,
  device: BrowserContextOptions,
  platform: "android" | "ios" | "tdesktop",
) {
  const ctx = await browser.newContext({ ...device, locale: u.languageCode === "ru" ? "ru-RU" : "uz-UZ" });
  const page = await ctx.newPage();
  const errors: string[] = [];
  const uploads: Uploads = { photo: [], receipt: [] };
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error" && !/Failed to load resource|ERR_TUNNEL|DevTools/.test(m.text())) errors.push(m.text());
  });
  await page.route("https://telegram.org/js/telegram-web-app.js", (r) =>
    r.fulfill({ contentType: "text/javascript", body: tgStub(platform) }),
  );
  await page.route("**/api/app/upload**", async (r) => {
    const q = new URL(r.request().url()).searchParams;
    const body = r.request().postDataBuffer() ?? Buffer.alloc(0);
    // Как Vercel: тело больше 4,5 МБ не доходит до функции
    if (body.byteLength > VERCEL_BODY_LIMIT) return r.fulfill({ status: 413, body: "Request Entity Too Large" });
    if (q.get("kind") === "photo") {
      uploads.photo.push(body.byteLength);
      const hash = createHash("sha256").update(body).digest("hex");
      return r.fulfill({
        json: { url: `https://fixture.supabase.co/storage/v1/object/public/photos/client/${hash}.webp` },
      });
    }
    uploads.receipt.push(body.byteLength);
    const res = await app.submitReceipt(sim.deps, u, q.get("order"), {
      bytes: new Uint8Array(Buffer.from("%PDF-1.4\n%fixture\n")),
      name: "chek.pdf",
      mime: "application/pdf",
    });
    await r.fulfill({ status: "error" in res ? 400 : 200, json: res });
  });
  await page.route("**/api/app", async (r) => {
    const res = await appAction(sim.deps, u, JSON.parse(r.request().postData() ?? "{}"));
    await r.fulfill({ status: res.status, json: res.body });
  });
  const init = encodeURIComponent(
    `user=${encodeURIComponent(JSON.stringify({ id: u.id, first_name: u.firstName }))}&auth_date=1&hash=00`,
  );
  await page.goto(`${base}${path}#tgWebAppData=${init}&tgWebAppVersion=8.0&tgWebAppPlatform=${platform}`, {
    waitUntil: "domcontentloaded",
  });
  return { ctx, page, errors, uploads };
}

export const overflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
export const mainAction = (page: Page) => page.locator("[data-main-action]").last();
