// Этап 3.1: форма ответов на всех активных дизайнах (demo и full), без скриншотов.
// После открытия форма в DOM, до неё можно долистать обычной прокруткой, поле и кнопки не перекрыты.
// Запуск: INVITEIZI_CHECK=1 next build --webpack, INVITEIZI_CHECK=1 next start -p 3105, затем node scripts/check-rsvp.mjs [id...]
// Только локальный сайт. WIDTHS=360,430 — другие ширины.
import "./ts-hooks.mjs";
import { chromium } from "playwright-core";
const { activeDesigns } = await import("../templates/registry.ts");

const ids = process.argv.slice(2);
const list = activeDesigns().filter((d) => !ids.length || ids.includes(d.id));
const base = process.env.CHECK_BASE_URL ?? "http://localhost:3105";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw Error("Только локальный сайт");
const widths = (process.env.WIDTHS ?? "360").split(",").map(Number);
const TABS = 6;
const LIMIT_MS = 20000;
const browser = await chromium.launch({ channel: "chrome", headless: true });

async function reach(page, form) {
  const inView = () => form.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return r.height > 0 && r.top < innerHeight && r.bottom > 0;
  });
  await page.mouse.move(180, 400);
  for (let i = 0; i < 80; i++) {
    if (await inView()) return true;
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(40);
  }
  return false;
}

// Что реально лежит над центром элемента, докрутив его к середине экрана
const covered = (form) => form.evaluate(async (el) => {
  const bad = [];
  for (const c of el.querySelectorAll("input:not([aria-hidden]), button")) {
    c.scrollIntoView({ block: "center" });
    await new Promise((d) => setTimeout(d, 30));
    const r = c.getBoundingClientRect();
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if (!top || !(top === c || c.contains(top) || top.contains(c))) bad.push(c.textContent || c.tagName);
  }
  return bad;
});

async function check(page, d, mode, state) {
  await page.goto(`${base}/dev/invitation/${d.id}?mode=${mode}`, { waitUntil: "load", timeout: LIMIT_MS });
  // Нажатие раньше готовности страницы теряется: повторяем, пока не откроется
  const opened = page.locator('[data-opened="true"]');
  const opener = page.locator("[data-open]").first();
  for (let i = 0; i < 8 && !(await opened.count()); i++) {
    if (await opener.count()) await opener.click({ timeout: 1500 }).catch(() => {});
    await page.waitForTimeout(1000);
  }
  if (!(await opened.count())) throw Error("не открылось");
  const form = page.locator("[data-rsvp]");
  if ((await form.count()) !== 1) throw Error("формы нет в DOM");
  if (!(await reach(page, form))) throw Error("не долистать до формы");
  // Заставка уходит с анимацией: перекрытием считаем только то, что не исчезло
  let bad = await covered(form);
  for (let i = 0; bad.length && i < 5; i++) {
    await page.waitForTimeout(1000);
    bad = await covered(form);
  }
  if (bad.length) throw Error(`перекрыто: ${bad.join(", ").slice(0, 60)}`);
  await form.locator("input").first().fill("Анвар");
  await form.getByRole("button", { name: "Келаман", exact: true }).click({ timeout: 2000 });
  await form.getByText("Раҳмат").first().waitFor({ timeout: 2000 });
  if (mode === "demo" && state.posted) throw Error("намуна отправила ответ");
  if (mode === "full" && !state.posted) throw Error("ответ не отправлен");
}

const jobs = list.flatMap((d) => ["demo", "full"].flatMap((mode) => widths.map((width) => ({ d, mode, width }))));
const failed = [];
let passed = 0;
let next = 0;

async function tab() {
  while (next < jobs.length) {
    const { d, mode, width } = jobs[next++];
    const context = await browser.newContext({ viewport: { width, height: 760 } });
    const page = await context.newPage();
    const state = { posted: 0 };
    const errors = [];
    await page.route("**/api/rsvp", (r) => { state.posted++; r.fulfill({ status: 204 }); });
    page.on("pageerror", (e) => errors.push(e.message.slice(0, 80)));
    let timer;
    try {
      await Promise.race([
        check(page, d, mode, state),
        new Promise((_, no) => { timer = setTimeout(() => no(Error(`дольше ${LIMIT_MS / 1000} с`)), LIMIT_MS); }),
      ]);
      if (errors.length) throw Error(`ошибка страницы: ${errors[0]}`);
      passed++;
    } catch (e) {
      failed.push(`${d.number} ${d.id} ${mode} ${width}: ${String(e.message).split("\n")[0].slice(0, 110)}`);
    }
    clearTimeout(timer);
    await context.close().catch(() => {});
  }
}

await Promise.all(Array.from({ length: TABS }, tab));
await browser.close();
for (const f of failed.sort((a, b) => parseInt(a) - parseInt(b))) console.log("FAIL", f);
console.log(`${passed} из ${jobs.length} прошли`);
process.exit(failed.length ? 1 : 0);
