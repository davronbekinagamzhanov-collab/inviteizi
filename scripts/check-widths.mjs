// Все дизайны реестра на ширинах телефона 320/360/375/390/430: страница открывается (200), без ошибок консоли,
// после открытия и прокрутки до конца ничего не вылезает за экран по горизонтали.
// Запуск на production-сборке: npm run build && npx next start -p 3130, затем
//   node scripts/check-widths.mjs [--base=http://localhost:3130] [--only=id1,id2] [--lang=ru]
// Отчёт: $CHECK_WIDTHS_REPORT или <tmpdir>/inviteizi-widths.json. Только чтение, без записи в базу.
import "./ts-hooks.mjs";
import { chromium } from "playwright-core";
import { readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const arg = (name, def) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? def;
const BASE = arg("base", "http://localhost:3130");
const only = arg("only", "");
const lang = arg("lang", "");
if (!["localhost", "127.0.0.1"].includes(new URL(BASE).hostname)) throw Error("Только локальный сервер");
const { designs } = await import("../templates/registry.ts");
const targets = only ? designs.filter((d) => only.split(",").includes(d.id)) : designs;
const WIDTHS = [320, 360, 375, 390, 430];
// Демо-музыка лежит в Supabase Storage: подменяем локальным файлом, проверка не обращается к рабочему хранилищу
const musicFixture = await readFile("public/music/namuna-kuy.wav");

// CHROMIUM_PATH — свой Chromium, если playwright-core не нашёл браузер
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const results = [];
try {
  for (const d of targets) {
    for (const width of WIDTHS) {
      const context = await browser.newContext({ viewport: { width, height: 812 }, isMobile: true, hasTouch: true });
      await context.route("**/storage/v1/object/public/music/**", (r) =>
        r.fulfill({ status: 200, contentType: "audio/wav", body: musicFixture }),
      );
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (m) => {
        if (m.type() === "error") errors.push(m.text());
      });
      const res = await page.goto(`${BASE}/demo/${d.id}${lang ? `?lang=${lang}` : ""}`, {
        waitUntil: "networkidle",
        timeout: 120000,
      });
      const opener = page.locator("[data-open]:not(:disabled)").first();
      if (await opener.count()) {
        await opener.click({ timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(2000);
      }
      let overflow = 0;
      for (let y = 0, h = 1; y < h; y += 600) {
        h = await page.evaluate(() => document.documentElement.scrollHeight);
        await page.evaluate((v) => window.scrollTo(0, v), y);
        await page.waitForTimeout(60);
        overflow = Math.max(
          overflow,
          await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
        );
      }
      const ok = res?.status() === 200 && overflow <= 1 && errors.length === 0;
      results.push({ id: d.id, width, status: res?.status(), overflow, errors: errors.slice(0, 3), ok });
      if (!ok) console.log(`FAIL ${d.id} ${width}px status=${res?.status()} overflow=${overflow} ${errors[0] ?? ""}`);
      await context.close();
    }
    console.log(`done ${d.id}`);
  }
} finally {
  await browser.close();
}
const out = process.env.CHECK_WIDTHS_REPORT ?? path.join(tmpdir(), "inviteizi-widths.json");
await writeFile(out, JSON.stringify(results, null, 2));
const failed = results.filter((r) => !r.ok);
console.log(
  `\nПроверок: ${results.length} (${targets.length} дизайнов × ${WIDTHS.length}), с замечаниями: ${failed.length}.`,
);
console.log(`Отчёт: ${out}`);
process.exitCode = failed.length ? 1 : 0;
