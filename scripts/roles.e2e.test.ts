/**
 * Проверка всех ролей в браузере (17.11.2026): Mini App и админка/панели на ширинах 320 и 390, уз и ру.
 * Интерфейс — настоящий (next dev/start), ответы /api/app — НАСТОЯЩИЙ серверный код (bot/app/dispatch.ts)
 * на тестовой базе в памяти (Sim): прод-база и Telegram не трогаются.
 * Запуск: npx next dev -p 3121, затем ROLES_BASE=http://localhost:3121 npx vitest run scripts/roles.e2e.test.ts
 * Без ROLES_BASE тест пропускается. Снимки → docs/reviews/sales-audit/
 */
import { mkdir } from "node:fs/promises";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { chromium, type Browser, type Page } from "playwright-core";
import { appAction } from "@/bot/app/dispatch";
import * as app from "@/bot/app/service";
import { ownerAdmin } from "@/bot/app/owner-admin";
import { ADMIN, Sim } from "@/bot/testing/sim";
import { nikohOrder } from "@/bot/testing/paths";
import { uz } from "@/texts/bot-uz";
import { appUz } from "@/texts/app-uz";
import { appRu } from "@/texts/app-ru";
import { salesTexts } from "@/texts/sales";
import { activeDesigns } from "@/templates/registry";
import type { AppUser } from "@/lib/tg-init-data";

const BASE = process.env.ROLES_BASE;
const OUT = "docs/reviews/sales-audit";
const CLIENT = 11;
const MANAGER = 700;
const PARTNER = 800;
const WHOLESALE = 900;
const DESIGN = activeDesigns().find((d) => d.occasion === "nikoh" && d.format === "animated" && !d.clientPhotos)!;
const PDF = Buffer.from("%PDF-1.4\n%fixture\n");

/** telegram-web-app.js: native-кнопки «не показываются» — приложение рисует свои (их и нажимаем) */
const TG = `(() => {
  const h = new URLSearchParams(location.hash.slice(1));
  const noop = () => {};
  const btn = { isVisible: false, text: "", setParams() { return btn; }, setText() { return btn; }, onClick: noop, offClick: noop,
    show: noop, hide: noop, enable: noop, disable: noop, showProgress: noop, hideProgress: noop };
  window.Telegram = { WebApp: { initData: h.get("tgWebAppData") || "", platform: "ios", version: "8.0", ready: noop, expand: noop,
    close: noop, disableVerticalSwipes: noop, setHeaderColor: noop, setBackgroundColor: noop, setBottomBarColor: noop,
    isVersionAtLeast: () => false, MainButton: btn, BackButton: { show: noop, hide: noop, onClick: noop, offClick: noop },
    HapticFeedback: { impactOccurred: noop, notificationOccurred: noop, selectionChanged: noop },
    openLink: noop, openTelegramLink: noop } };
})();`;

let browser: Browser;
let sim: Sim;
const who = (id: number, lang: "uz" | "ru"): AppUser => ({
  id,
  firstName: "T" + id,
  username: null,
  languageCode: lang,
});

beforeAll(async () => {
  if (!BASE) return;
  await mkdir(OUT, { recursive: true });
  browser = await chromium.launch({ executablePath: process.env.CHROME || "/opt/pw-browsers/chromium" });
  sim = new Sim();
  const admin = (a: Parameters<typeof ownerAdmin>[2], b: Record<string, unknown> = {}) =>
    ownerAdmin(sim.deps, who(ADMIN, "ru"), a, b) as Promise<Record<string, unknown>>;
  await sim.start(ADMIN);
  await sim.click(ADMIN, uz.langUz);
  const m = await admin("ownerManagerInvite");
  await sim.start(MANAGER, "mgr_" + /start=mgr_([a-z0-9]+)/.exec(String(m.link))![1]);
  const p = await admin("ownerPartnerNew", {
    name: "Салон Малика",
    phone: "+77011234567",
    rate: "15%",
    schedule: "weekly",
  });
  await sim.start(PARTNER, "join_" + /start=join_([a-z0-9]+)/.exec(String(p.link))![1]);
  await sim.click(PARTNER, uz.langUz);
  await sim.contact(PARTNER, "77011234567");
  await sim.start(WHOLESALE);
  await sim.click(WHOLESALE, uz.langUz);
  await admin("ownerWholesaleSet", { userId: WHOLESALE, percent: 20 });
  await admin("ownerPromotionCreate", {
    name: "Куз чегирмаси",
    percent: 50,
    startsAt: "2026-11-01T00:00",
    endsAt: "2026-12-31T18:00",
  });
}, 60_000);
afterAll(async () => browser?.close());

async function open(path: string, u: AppUser, width: number) {
  const ctx = await browser.newContext({
    viewport: { width, height: 760 },
    isMobile: true,
    hasTouch: true,
    locale: u.languageCode === "ru" ? "ru-RU" : "uz-UZ",
  });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error" && !/Failed to load resource|ERR_TUNNEL|DevTools/.test(m.text())) errors.push(m.text());
  });
  await page.route("https://telegram.org/js/telegram-web-app.js", (r) =>
    r.fulfill({ contentType: "text/javascript", body: TG }),
  );
  await page.route("**/storage/v1/object/public/**", (r) => r.fulfill({ status: 204, body: "" }));
  await page.route("**/api/app/upload**", async (r) => {
    const q = new URL(r.request().url()).searchParams;
    const res = await app.submitReceipt(sim.deps, u, q.get("order"), {
      bytes: new Uint8Array(PDF),
      name: "chek.pdf",
      mime: "application/pdf",
    });
    await r.fulfill({ status: "error" in res ? 400 : 200, json: res });
  });
  await page.route("**/api/app", async (r) => {
    const body = JSON.parse(r.request().postData() ?? "{}");
    const res = await appAction(sim.deps, u, body);
    await r.fulfill({ status: res.status, json: res.body });
  });
  const init = encodeURIComponent(
    `user=${encodeURIComponent(JSON.stringify({ id: u.id, first_name: u.firstName }))}&auth_date=1&hash=00`,
  );
  await page.goto(`${BASE}${path}#tgWebAppData=${init}&tgWebAppVersion=8.0`, { waitUntil: "domcontentloaded" });
  return { ctx, page, errors };
}

const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
const main = (page: Page) => page.locator("[data-main-action]").last();

describe.skipIf(!BASE)("роли в браузере", () => {
  for (const lang of ["uz", "ru"] as const)
    for (const width of [320, 390])
      it(`клиент ${lang} ${width}: каталог с акцией → дизайн → данные → проверка со скидкой → чек → ✅ владельца`, async () => {
        const T = lang === "ru" ? appRu : appUz;
        const S = salesTexts[lang];
        const id = CLIENT + width + (lang === "ru" ? 1 : 0);
        const { ctx, page, errors } = await open("/app", who(id, lang), width);
        const bad: string[] = [];
        const shot = async (name: string) => {
          if (await overflow(page)) bad.push(`${name}: вылезает по ширине`);
          await page.screenshot({ path: `${OUT}/client-${lang}-${width}-${name}.png` });
        };
        try {
          await page.locator(`[data-design]`).first().waitFor({ timeout: 60_000 });
          await page.locator("[data-deal-banner]").waitFor();
          expect(await page.locator("[data-deal-banner]").innerText()).toContain(S.timer(0, 0, 0).split(" ")[0]);
          if ((await page.locator("[data-deal-price]").count()) === 0) bad.push("нет зачёркнутой цены в каталоге");
          await shot("01-catalog");
          await page
            .getByRole("button", { name: T.occasions.nikoh, exact: true })
            .click()
            .catch(() => {});
          await page.locator(`[data-design="${DESIGN.id}"]`).click();
          await page.locator("[data-view-deal]").waitFor();
          await shot("02-view");
          await main(page).click();
          await page.locator('input[name="groom"]').waitFor();
          await page.locator('input[name="groom"]').fill("Азиз");
          await page.locator('input[name="bride"]').fill("Мадина");
          await page.locator('input[name="hosts"]').fill(lang === "ru" ? "Семья Каримовых" : "Каримовлар оиласи");
          await page.locator('input[name="date0"]').fill("2026-12-05");
          await page.locator(`[aria-label="${T.form.venue}"] button`).first().click();
          await main(page).click();
          await page.getByText(T.summary.title).first().waitFor();
          await page.locator("[data-deal-price]").first().waitFor();
          await shot("03-summary");
          // кнопка «к оплате» — уже с ценой по акции, а не со старой
          const payText = await main(page).innerText();
          if (!payText.includes("4 000") || payText.includes("8 000")) bad.push(`кнопка оплаты: ${payText}`);
          await main(page).click();
          await page.locator('[data-price-deal="promotion"]').waitFor();
          const priceText = await page.locator('[data-price-deal="promotion"]').innerText();
          expect(priceText).toContain(S.saving("4 000 ₸").split(" ")[0]);
          await shot("04-check");
          await page.locator('input[name="terms"]').check();
          await page.getByRole("button", { name: T.pay.checkYes }).click();
          await page.getByText(T.pay.how).waitFor();
          await shot("05-pay");
          await page
            .locator('input[type="file"]')
            .setInputFiles({ name: "chek.pdf", mimeType: "application/pdf", buffer: PDF });
          await page.getByText(T.pay.waitTitle).waitFor();
          await shot("06-wait");
          const [o] = await sim.repo.listOrdersByUser(id);
          expect(o).toMatchObject({ status: "receipt_sent", amount: 4000 });
          await sim.callback(ADMIN, `ok:${o.number}`, 1);
          expect((await sim.repo.getOrder(o.id))!.status).toBe("active");
        } finally {
          await ctx.close();
        }
        expect([...bad, ...errors]).toEqual([]);
      }, 180_000);

  it("партнёр и оптовик: в каталоге нет бейджей акции; оптовику — оптовая цена; партнёру — обычная", async () => {
    const out: string[] = [];
    for (const [id, kind] of [
      [PARTNER, null],
      [WHOLESALE, "wholesale"],
    ] as const) {
      const o = await nikohOrder(sim, id);
      const { ctx, page, errors } = await open("/app", who(id, "uz"), 320);
      try {
        await page.locator("[data-design]").first().waitFor({ timeout: 60_000 });
        if (await page.locator("[data-deal-banner], [data-deal-price]").count()) out.push(`${id}: видит акцию`);
        // проверка перед оплатой — из «Мои заказы» → оплатить
        const q = (await appAction(sim.deps, who(id, "uz"), { action: "quote", orderId: o.id })).body as {
          order: app.AppOrder;
        };
        if (kind === null && (q.order.amount !== 8000 || q.order.price)) out.push(`партнёр: цена ${q.order.amount}`);
        if (kind === "wholesale" && (q.order.amount !== 6400 || q.order.price?.kind !== "wholesale"))
          out.push(`оптовик: цена ${q.order.amount}`);
        await page.screenshot({ path: `${OUT}/role-${id}-catalog.png` });
        out.push(...errors);
      } finally {
        await ctx.close();
      }
    }
    expect(out).toEqual([]);
  }, 120_000);

  for (const [path, id, name] of [
    ["/app/owner", ADMIN, "owner"],
    ["/app/panel", MANAGER, "manager"],
    ["/app/panel", PARTNER, "partner"],
  ] as const)
    for (const width of [320, 390])
      it(`${name} ${width}: панель открывается, без ошибок и без вылезания; чужому — «нет доступа»`, async () => {
        const { ctx, page, errors } = await open(path, who(id, "ru"), width);
        const bad: string[] = [];
        try {
          await page.waitForLoadState("networkidle");
          await page.waitForTimeout(800);
          const text = await page.locator("body").innerText();
          if (/Нет доступа|Ошибка сервера/.test(text)) bad.push(`${name}: ${text.slice(0, 80)}`);
          if (await overflow(page)) bad.push(`${name}: вылезает`);
          if (name === "owner") {
            await page.locator('[data-owner-open="promotions"]').click();
            await page.locator('[data-promotion="running"]').waitFor();
            await page.getByRole("button", { name: "← Назад" }).click();
            await page.getByRole("tab", { name: "Оптовики" }).click();
            await page.locator("[data-wholesaler]").first().waitFor();
            const rows = await page.$$eval(
              '[aria-label="Разделы"] button',
              (b) => new Set(b.map((x) => Math.round(x.getBoundingClientRect().top))).size,
            );
            if (rows !== 1) bad.push(`вкладки в ${rows} строки`);
            if (/НАМУНА/.test(await page.locator("body").innerText())) bad.push("НАМУНА в русской админке");
          }
          await page.screenshot({ path: `${OUT}/${name}-${width}.png`, fullPage: true });
        } finally {
          await ctx.close();
        }
        // чужая роль на ту же страницу
        const stranger = await open(path, who(CLIENT, "ru"), width);
        try {
          await stranger.page.waitForLoadState("networkidle");
          await stranger.page.waitForTimeout(800);
          const t = await stranger.page.locator("body").innerText();
          if (!/Нет доступа|только для|рухсат|фақат/i.test(t))
            bad.push(`${name}: клиенту открылось: ${t.slice(0, 60)}`);
        } finally {
          await stranger.ctx.close();
        }
        expect([...bad, ...errors.filter((e) => !/403/.test(e))]).toEqual([]);
      }, 120_000);
});
