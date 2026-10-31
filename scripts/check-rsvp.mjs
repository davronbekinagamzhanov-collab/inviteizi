// Этап 3.1: форма ответов на всех активных дизайнах (demo и full, 360 и 430 px), без скриншотов.
// После открытия форма в DOM, до неё можно долистать обычной прокруткой, поле и кнопки не перекрыты.
// Запуск: next dev -p 3105, затем node scripts/check-rsvp.mjs [id...]. Только локальный сайт.
import "./ts-hooks.mjs";
import { chromium } from "playwright-core";
const { activeDesigns } = await import("../templates/registry.ts");

const ids = process.argv.slice(2);
const list = activeDesigns().filter((d) => !ids.length || ids.includes(d.id));
const base = process.env.CHECK_BASE_URL ?? "http://localhost:3105";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw Error("Только локальный сайт");
const browser = await chromium.launch({ channel: "chrome", headless: true });
let passed = 0;
const failed = [];

async function reach(page, form) {
  const inView = () => form.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return r.height > 0 && r.top < innerHeight && r.bottom > 0;
  });
  await page.mouse.move(180, 400);
  for (let i = 0; i < 150; i++) {
    if (await inView()) return true;
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(60);
  }
  return false;
}

// Что реально лежит над центром элемента: проверяем, докрутив его к середине экрана
const covered = (form) => form.evaluate(async (el) => {
  const bad = [];
  for (const c of el.querySelectorAll("input:not([aria-hidden]), button")) {
    c.scrollIntoView({ block: "center" });
    await new Promise((d) => setTimeout(d, 40));
    const r = c.getBoundingClientRect();
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if (!top || !(top === c || c.contains(top) || top.contains(c))) bad.push(c.textContent || c.tagName);
  }
  return bad;
});

for (const d of list) {
  for (const mode of ["demo", "full"]) {
    for (const width of [360, 430]) {
      const context = await browser.newContext({ viewport: { width, height: 760 }, isMobile: false });
      const page = await context.newPage();
      const problems = [];
      let posted = 0;
      await page.route("**/api/rsvp", (r) => { posted++; r.fulfill({ status: 204 }); });
      page.on("pageerror", (e) => problems.push(`ошибка ${e.message.slice(0, 80)}`));
      try {
        await page.goto(`${base}/dev/invitation/${d.id}?mode=${mode}`, { waitUntil: "load", timeout: 90000 });
        const opener = page.locator("[data-open]").first();
        if (await opener.count()) await opener.click({ timeout: 10000 });
        await page.waitForSelector('[data-opened="true"]', { timeout: 30000 });
        const form = page.locator("[data-rsvp]");
        if ((await form.count()) !== 1) problems.push("формы нет в DOM");
        else {
          if (!(await reach(page, form))) problems.push("не долистать");
          const bad = await covered(form);
          if (bad.length) problems.push(`перекрыто: ${bad.join(", ").slice(0, 60)}`);
          await form.locator("input").first().fill("Анвар");
          await form.getByRole("button", { name: "Келаман", exact: true }).click({ timeout: 5000 });
          await form.getByText("Раҳмат").first().waitFor({ timeout: 3000 });
          if (mode === "demo" && posted) problems.push("намуна отправила ответ");
          if (mode === "full" && !posted) problems.push("ответ не отправлен");
        }
      } catch (e) {
        problems.push(String(e.message).split("\n")[0].slice(0, 110));
      }
      if (problems.length) {
        failed.push(`${d.number} ${d.id} ${mode} ${width}: ${problems.join("; ")}`);
        console.log("FAIL", failed.at(-1));
      } else passed++;
      await context.close();
    }
  }
}
await browser.close();
console.log(`${passed} из ${passed + failed.length} прошли`);
process.exit(failed.length ? 1 : 0);
