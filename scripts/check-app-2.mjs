// fix/app-polish-2: браузерная проверка изменённых экранов Mini App на 390 px, uz и ru.
// /api/app подменяется (scripts/app-mock.mjs) — база и Telegram не трогаются.
// Каталог: долгое нажатие на цену/📷/♡ (всплывашка, сердце не переключилось), «Нархлар фарқи» (ℹ);
// анкета: превью крупно, «Очиш» → на весь экран, «Ёпиш» сверху; итог: текст приглашения (п.16) и музыка
// (кружок загрузки → ошибка мягко); чек → «Текширилмоқда» → сам становится «Тайёр» / «Рад этилди»;
// «Менинг таклифномаларим»: статусы и отмена с «Аниқми?»; панели менеджера и партнёра; отказ без роли.
// Запуск: npx next dev -p 3121, затем node scripts/check-app-2.mjs. Снимки → docs/reviews/app-polish-2/
import "./ts-hooks.mjs";
import { chromium } from "playwright-core";
import { mkdir, readFile } from "node:fs/promises";

const { appUz } = await import("../texts/app-uz.ts");
const { appRu } = await import("../texts/app-ru.ts");
const { mockServer } = await import("./app-mock.mjs");
const base = process.env.CHECK_BASE_URL ?? "http://localhost:3121";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw Error("Local checks only");
const out = "docs/reviews/app-polish-2";
await mkdir(out, { recursive: true });
const fakeInit = encodeURIComponent(`user=${encodeURIComponent(JSON.stringify({ id: 1, first_name: "Test" }))}&auth_date=1&hash=00`);
const photo = await readFile("public/covers/muhr.jpg");
const TG_STUB = `(() => { const h = new URLSearchParams(location.hash.slice(1)); const noop = () => {};
  const btn = { setParams: noop, onClick: noop, offClick: noop, showProgress: noop, hideProgress: noop, show: noop, hide: noop };
  window.Telegram = { WebApp: { initData: h.get("tgWebAppData") || "", platform: "unknown", version: "6.0", ready: noop, expand: noop, close: noop,
    isVersionAtLeast: () => false, MainButton: btn, BackButton: { show: noop, hide: noop, onClick: noop, offClick: noop }, openLink: noop, openTelegramLink: noop } }; })();`;

const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : { executablePath: "/opt/pw-browsers/chromium" });
const fails = [];
const ok = (cond, msg) => (cond ? console.log("  ok", msg) : (fails.push(msg), console.log("  FAIL", msg)));

async function open(lang, path = "/app") {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, locale: lang === "ru" ? "ru-RU" : "uz-UZ" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && !/Failed to load resource|ERR_TUNNEL|DevTools|MEDIA_ERR|NotSupportedError|no supported source/i.test(m.text()) && errors.push(m.text()));
  const server = mockServer(lang, base);
  await page.route("**/api/app**", (r) => server.handle(r));
  await page.route("https://telegram.org/js/telegram-web-app.js", (r) => r.fulfill({ contentType: "text/javascript", body: TG_STUB }));
  await page.goto(`${base}${path}#tgWebAppData=${fakeInit}`, { waitUntil: "domcontentloaded" });
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
  return { ctx, page, server, errors, overflow };
}
const hold = async (page, loc) => {
  const b = await loc.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(650);
  await page.mouse.up();
};

for (const lang of ["uz", "ru"]) {
  const T = lang === "ru" ? appRu : appUz;
  console.log(`— ${lang}`);
  const { ctx, page, server, errors, overflow } = await open(lang);
  try {
    // Каталог: долгое нажатие
    await page.locator("[data-design]").first().waitFor({ timeout: 60_000 });
    await page.waitForTimeout(1500);
    await hold(page, page.locator("[data-design] [data-hold]").first());
    ok(await page.getByRole("status").filter({ hasText: "₸ —" }).isVisible(), "долгое нажатие на цену — всплывашка");
    await page.waitForTimeout(2300);
    ok(!(await page.locator('[role="status"]').filter({ hasText: "₸ —" }).count()), "всплывашка исчезла сама через 2 с");
    const heart = page.locator("[data-heart]").first();
    await hold(page, heart);
    ok((await heart.getAttribute("aria-pressed")) === "false", "долгое нажатие на ♡ не сохраняет");
    ok(await page.getByText(T.catalog.tipSave).isVisible(), "♡ — «Сақлаш» подсказка");
    const cam = page.locator(`[data-hold="${T.catalog.tipPhoto}"]`).first();
    if (await cam.count()) {
      await cam.scrollIntoViewIfNeeded();
      await hold(page, cam);
      ok(await page.getByText(T.catalog.tipPhoto).isVisible(), "📷 — подсказка про своё фото");
      ok(!(await page.locator("iframe").count()), "после долгого нажатия дизайн не открылся");
    }
    await page.evaluate(() => scrollTo(0, 0));
    await page.locator("[data-prices]").click();
    await page.locator("[data-prices-sheet]").waitFor();
    ok((await page.locator("[data-prices-sheet] [data-format]").count()) === 3, "ℹ — три цены с примерами");
    await page.screenshot({ path: `${out}/${lang}-01-prices.png` });
    await page.locator('[data-format="scroll"] button').click();
    await page.locator('iframe[src^="/demo/"]').waitFor();
    ok(true, "«Мисол» открывает демо");
    await page.locator("[data-main-action]").click();

    // Анкета: превью
    await page.locator('input[name="groom"]').waitFor();
    const card = await page.locator("[data-preview-card]").boundingBox();
    ok(card.width >= 270, `превью крупнее (${Math.round(card.width)} px)`);
    await page.screenshot({ path: `${out}/${lang}-02-form.png` });
    await page.getByRole("button", { name: T.form.previewOpen }).click();
    const big = page.locator("[data-big-preview]");
    await big.waitFor();
    const bb = await big.boundingBox();
    const close = await big.getByRole("button", { name: T.form.previewClose }).boundingBox();
    ok(bb.width === 390 && bb.height === 844, "превью на весь экран");
    ok(close.y < 80, "«Ёпиш» сверху");
    ok((await page.locator("iframe").count()) === 1, "одно iframe на время большого превью");
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${out}/${lang}-03-big-preview.png` });
    await big.getByRole("button", { name: T.form.previewClose }).click();
    ok(!(await big.count()) && (await page.locator("[data-preview-card] iframe").count()) === 1, "закрылось, маленькое вернулось");

    // п.16: «Таклифнома матни» в анкете — «Бошқа вариант» листает, выбор доходит до итога
    const textBox = page.locator("[data-text-choice]");
    const id0 = await textBox.locator("[data-text-id]").getAttribute("data-text-id");
    await textBox.getByRole("button", { name: new RegExp(T.form.textOther(2, 9).split(" · ")[0]) }).click();
    const id1 = await textBox.locator("[data-text-id]").getAttribute("data-text-id");
    ok(id0 !== id1, `«Бошқа вариант»: ${id0} → ${id1}`);
    const chosenText = (await textBox.locator("[data-text-id] p").textContent()).replace(/\s+/g, " ").trim();
    await textBox.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${out}/${lang}-02b-text.png` });

    // Анкета → фото? → итог
    await page.locator('input[name="groom"]').fill("Азиз");
    await page.locator('input[name="bride"]').fill("Мадина");
    await page.locator('input[name="hosts"]').fill(lang === "ru" ? "Семья Каримовых" : "Каримовлар оиласи");
    await page.locator('input[name="date0"]').fill("2026-12-05");
    await page.locator(`[aria-label="${T.form.venue}"] button`).first().click();
    await page.locator("[data-main-action]").click();
    // Фото (если у дизайна есть) — пропускаем
    for (let i = 0; i < 3 && !(await page.getByText(T.summary.title).isVisible()); i++) {
      await page.waitForTimeout(1200);
      if ((await page.locator("[data-main-action]").textContent()) === T.photos.skip) await page.locator("[data-main-action]").click();
    }
    await page.getByText(T.summary.title).waitFor();
    const summaryText = (await page.getByRole("button", { name: new RegExp(T.summary.text) }).locator("small").textContent()).replace(/\s+/g, " ").trim();
    ok(chosenText.startsWith(summaryText.slice(0, 40)) || summaryText.startsWith(chosenText.slice(0, 40)), "текст в итоге = выбранному в анкете");
    // Музыка: ▶ → кружок → (файл песочницы не грузится) мягкая ошибка
    await page.getByRole("button", { name: new RegExp(T.summary.music) }).click();
    const play = page.locator("[data-state]").filter({ has: page.locator("svg") }).first();
    await play.click();
    const states = new Set();
    for (let i = 0; i < 20; i++) {
      states.add(await play.getAttribute("data-state"));
      await page.waitForTimeout(100);
    }
    ok(states.has("loading") || states.has("playing"), `▶ → загрузка/пауза (${[...states].join(",")})`);
    await page.waitForTimeout(1500);
    const err = await page.getByText(T.summary.musicError).isVisible();
    ok(err || (await play.getAttribute("data-state")) === "playing", "мелодия играет или мягкая ошибка");
    await page.screenshot({ path: `${out}/${lang}-04-music.png` });

    // Оплата → ожидание → готово
    await page.locator("[data-main-action]").click();
    // п.18: без «Шартларга розиман» кнопка закрыта; «Шартлар» открывает страницу условий
    await page.getByText(T.pay.termsAgree).waitFor();
    ok(await page.getByRole("button", { name: T.pay.checkYes }).isDisabled(), "без согласия «Ҳаммаси тўғри» закрыта");
    await page.screenshot({ path: `${out}/${lang}-04b-terms-check.png` });
    await page.getByRole("button", { name: T.pay.termsLink, exact: true }).click();
    const termsFrame = page.frameLocator('[role="dialog"] iframe');
    await termsFrame.locator("h1").waitFor();
    ok((await termsFrame.locator("section").count()) === 5, "страница условий: 5 разделов");
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${out}/${lang}-04c-terms.png` });
    await page.locator('[role="dialog"] button').first().click();
    await page.locator('input[name="terms"]').check();
    await page.getByRole("button", { name: T.pay.checkYes }).click();
    await page.getByText(T.pay.how).waitFor();
    await page.locator('input[type="file"]').setInputFiles([{ name: "chek.jpg", mimeType: "image/jpeg", buffer: photo }]);
    await page.getByText(T.pay.waitTitle).waitFor();
    await page.screenshot({ path: `${out}/${lang}-05-wait.png` });
    const o = server.st.orders[0];
    Object.assign(o, { status: "active", paid: true, rejectReason: null });
    await page.getByText(T.pay.readyTitle).waitFor({ timeout: 16_000 });
    ok(await page.getByText(o.url.replace(/^https?:\/\//, "")).isVisible(), "экран «Тайёр»: ссылка крупно (сам обновился)");
    await page.screenshot({ path: `${out}/${lang}-06-ready.png` });

    // «Мои»: статусы и отмена черновика
    await page.locator("[data-main-action]").click();
    await page.getByText(T.orders.statuses.active).first().waitFor();
    server.st.orders.push({ ...o, id: "o-draft", number: 999, status: "preview", paid: false, canEdit: true, canPay: true, title: "Бобур & Лола" });
    server.st.orders.push({ ...o, id: "o-rej", number: 998, status: "rejected", paid: false, canEdit: true, canPay: true, title: "Али & Вали", rejectReason: lang === "ru" ? "Деньги не пришли" : "Пул келмади" });
    await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
    await page.getByText(T.orders.statuses.rejected).waitFor();
    ok(await page.getByText(T.orders.statuses.preview).first().isVisible(), "статусы: Қоралама / Тайёр / Рад этилди");
    await page.screenshot({ path: `${out}/${lang}-07-orders.png`, fullPage: true });
    const draftCard = page.locator("article").filter({ hasText: "Бобур & Лола" });
    await draftCard.getByRole("button", { name: T.orders.cancel }).click();
    ok(await draftCard.getByText(T.orders.cancelAsk).isVisible(), "«Аниқми?»");
    await page.screenshot({ path: `${out}/${lang}-08-cancel-ask.png` });
    await draftCard.getByRole("button", { name: T.orders.cancelYes }).click();
    await page.getByText(T.orders.cancelled).waitFor();
    ok(!(await page.locator("article").filter({ hasText: "Бобур & Лола" }).count()), "черновик отменён и исчез");
    // Отказ → причина и «Чекни қайта юбориш»
    await page.locator("article").filter({ hasText: "Али & Вали" }).getByRole("button", { name: T.pay.status }).click();
    await page.getByText(T.pay.rejectedTitle).waitFor();
    ok(await page.getByRole("button", { name: T.pay.resend }).isVisible(), "отказ: причина и «Чекни қайта юбориш»");
    await page.screenshot({ path: `${out}/${lang}-09-rejected.png` });
    ok(!(await overflow()), "нет горизонтальной прокрутки");
  } catch (e) {
    fails.push(`${lang}: ${e.message.split("\n")[0]}`);
    console.log("  FAIL", e.message.split("\n")[0]);
    await page.screenshot({ path: `${out}/${lang}-error.png` }).catch(() => undefined);
  }
  ok(!errors.length, `консоль без ошибок ${errors.slice(0, 2).join(" | ")}`);
  await ctx.close();
}

// Панели
for (const [role, lang] of [["manager", "ru"], ["partner", "uz"], ["none", "uz"]]) {
  const { ctx, page, server, errors } = await open(lang, "/app/panel");
  const now = new Date().toISOString();
  server.st.rolePanel =
    role === "manager"
      ? { role, period: "m", label: "ноябрь", cards: { paid: 3, revenue: 22000, partners: 2, sleeping: 1 }, earn: { month: "2026-11", orders: 3, amount: 1500, goal: 30, bonus: 15000, perOrder: 500 }, payments: [{ number: 108, paidAt: now, amount: 8000, initial: "А", partner: "Салон Малика" }], partners: [{ id: 1, name: "Салон Малика", status: "active", rate: 1000, ratePercent: null, scanned: 12, paid: 3, due: 3000, sleeping: false }, { id: 2, name: "Тўйхона Наврўз", status: "active", rate: 0, ratePercent: 15, scanned: 0, paid: 0, due: 0, sleeping: true }] }
      : role === "partner"
        ? { role, period: "m", label: "ноябрь", name: "Салон Малика", pending: false, rate: 0, ratePercent: 15, schedule: "ҳар душанба", cards: { scanned: 12, paid: 3, earned: 3600, paidOut: 1200, due: 2400 }, payments: [{ number: 108, paidAt: now, amount: 8000, initial: "А", partner: null }], link: "https://t.me/inviteizi_bot?start=p_malika11", posterLangs: ["uz", "ru"] }
        : null;
  try {
    await page.locator("[data-phase=denied], [data-role]").first().waitFor({ timeout: 60_000 });
    if (role === "none") ok(await page.locator("[data-phase=denied]").isVisible(), "панель без роли — «нет доступа»");
    else {
      ok((await page.locator(`[data-role=${role}]`).count()) === 1, `панель ${role}`);
      if (role === "partner") {
        await page.locator("[data-share] img").waitFor();
        await page.getByRole("button", { name: /Постер · Ўзбекча/ }).click();
        await page.getByText(appUz.partnerPanel.posterSent).waitFor();
        ok(true, "постер — «ботга юборилди»");
      } else {
        await page.getByRole("tab", { name: /Спящие/ }).click();
        ok(await page.getByText("Тўйхона Наврўз").isVisible(), "менеджер: «Спящие»");
      }
      await page.screenshot({ path: `${out}/panel-${role}.png`, fullPage: true });
    }
  } catch (e) {
    fails.push(`panel ${role}: ${e.message.split("\n")[0]}`);
  }
  ok(!errors.length, `панель ${role}: консоль без ошибок ${errors.slice(0, 2).join(" | ")}`);
  await ctx.close();
}
await browser.close();
console.log(fails.length ? `FAIL ${fails.length}:\n${fails.join("\n")}` : "check-app-2: всё ок");
process.exit(fails.length ? 1 : 0);
