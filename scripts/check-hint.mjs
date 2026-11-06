// fix/app-polish-2, п.8: подсказка открытия во всех дизайнах (через InvitationShell).
// Для каждого активного дизайна /demo/<id> на 390×844: через 3 с без касаний подсказка видна (если есть заставка),
// не пересекает имена и дату, после первого касания исчезает. Без заставки — подсказки нет.
// Запуск: npx next dev -p 3121, затем node scripts/check-hint.mjs. Снимки → docs/reviews/app-polish-2/hint/
import "./ts-hooks.mjs";
import { chromium } from "playwright-core";
import { mkdir, writeFile } from "node:fs/promises";

const { activeDesigns } = await import("../templates/registry.ts");
const base = process.env.CHECK_BASE_URL ?? "http://localhost:3121";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw Error("Local checks only");
const out = "docs/reviews/app-polish-2/hint";
await mkdir(out, { recursive: true });
const only = process.argv.slice(2);
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : { executablePath: "/opt/pw-browsers/chromium" });
const rows = [];
for (const d of activeDesigns().filter((x) => !only.length || only.includes(x.id))) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${base}/demo/${d.id}`, { waitUntil: "networkidle", timeout: 120_000 }).catch(() => undefined);
  await page.waitForTimeout(3600);
  const r = await page.evaluate((names) => {
    const hint = document.querySelector('[data-tap-hint="on"] [role="status"]');
    const box = hint?.getBoundingClientRect();
    const hits = [];
    if (box) {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const txt = n.textContent ?? "";
        if (!names.some((x) => x && txt.includes(x)) && !/\d{1,2}[./]\d{1,2}[./]\d{2,4}|\d{1,2}\s\S+\s20\d\d/.test(txt)) continue;
        const el = n.parentElement;
        if (!el || el.closest("[data-tap-hint]")) continue;
        const st = getComputedStyle(el);
        if (st.visibility === "hidden" || +st.opacity === 0) continue;
        const range = document.createRange();
        range.selectNodeContents(n);
        for (const rc of range.getClientRects()) {
          if (!(rc.width && rc.bottom > box.top && rc.top < box.bottom && rc.right > box.left && rc.left < box.right && rc.top < innerHeight)) continue;
          // Текст под заставкой (конверт закрыт) гость не видит — считаем только то, что сверху
          const top = document.elementFromPoint(rc.left + rc.width / 2, Math.min(rc.top + rc.height / 2, innerHeight - 1));
          if (top && el.contains(top)) hits.push(txt.trim().slice(0, 30));
        }
      }
    }
    return { shown: !!box, hits, overflow: box ? box.left < 0 || box.right > innerWidth : false };
  }, [d.sample.groom, d.sample.bride, d.sample.person].filter(Boolean));
  if (r.shown) await page.screenshot({ path: `${out}/${d.id}.png` });
  let gone = true;
  if (r.shown) {
    await page.mouse.click(195, 300);
    await page.waitForTimeout(900);
    gone = (await page.locator('[data-tap-hint="on"]').count()) === 0;
  }
  const ok = !errors.length && !r.hits.length && !r.overflow && gone && (r.shown || !(await page.locator("[data-tap-hint]").count()));
  rows.push({ id: d.id, format: d.format, shown: r.shown, hits: r.hits, gone, errors: errors.slice(0, 2), ok });
  console.log(ok ? "ok  " : "FAIL", d.id, r.shown ? "hint" : "no-hint", r.hits.join(" | "), errors[0] ?? "");
  await ctx.close();
}
await browser.close();
await writeFile(`${out}/report.json`, JSON.stringify(rows, null, 2));
const bad = rows.filter((x) => !x.ok);
console.log(`hint: ${rows.length - bad.length}/${rows.length} ok, shown in ${rows.filter((x) => x.shown).length}`);
process.exit(bad.length ? 1 : 0);
