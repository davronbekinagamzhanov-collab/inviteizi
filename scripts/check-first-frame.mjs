// Текст первого экрана виден ДО нажатия и с первого кадра: имена (или имя), тадбир и дата.
// Снимает /demo/<id> в 375×812 через 0 и 300 мс после загрузки, ничего не нажимая.
// Запуск при работающем dev-сервере:
//   BASE=http://localhost:3100 node scripts/check-first-frame.mjs [id …] [--shots=docs/reviews/batch3]
import { chromium } from "playwright-core";
import { createJiti } from "jiti";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3000";
const root = process.cwd().split("\\").join("/");
const jiti = createJiti(`${root}/scripts/check-first-frame.mjs`, { alias: { "@": root } });
const { activeDesigns } = await jiti.import(`${root}/templates/registry.ts`);
const { t } = await jiti.import(`${root}/texts/uz-cyrl.ts`);

const args = process.argv.slice(2);
const shotsDir = args.find((a) => a.startsWith("--shots="))?.slice(8);
const only = args.filter((a) => !a.startsWith("--"));
const list = activeDesigns().filter((d) => !only.length || only.includes(d.id));
if (shotsDir) mkdirSync(shotsDir, { recursive: true });

const browser = await chromium.launch({ channel: "chrome" });
let bad = 0;
for (const d of list) {
  const s = d.sample;
  const names = [s.groom, s.bride, s.person].filter(Boolean).map((n) => n.split(" ")[0]);
  const [y] = (s.events?.[0]?.date ?? s.date ?? "").split("-");
  const occasion = t.occasionTitles[d.occasion];
  const page = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 1 });
  // анимации не ускоряем: смотрим ровно то, что видит гость
  await page.goto(`${BASE}/demo/${d.id}`, { waitUntil: "domcontentloaded" });
  const result = {};
  for (const ms of [0, 300]) {
    if (ms) await page.waitForTimeout(ms);
    else await page.evaluate(() => document.fonts.ready.then(() => new Promise((r) => requestAnimationFrame(() => r()))));
    if (shotsDir) await page.screenshot({ path: `${shotsDir}/${d.id}-t${ms}.png` });
    result[ms] = await page.evaluate(
      ({ names, y, occasion }) => {
        const vh = innerHeight;
        const seen = (needle) => {
          const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
          for (let n = walker.nextNode(); n; n = walker.nextNode()) {
            const text = n.textContent.toLocaleLowerCase("uz");
            if (!text.includes(needle.toLocaleLowerCase("uz"))) continue;
            let el = n.parentElement;
            const r = el.getBoundingClientRect();
            if (r.width < 2 || r.height < 2 || r.bottom <= 0 || r.top >= vh) continue;
            let op = 1;
            let hidden = false;
            for (; el; el = el.parentElement) {
              const cs = getComputedStyle(el);
              op *= Number(cs.opacity);
              if (cs.visibility === "hidden" || cs.display === "none" || el.getAttribute("aria-hidden") === "true" && el.hasAttribute("data-watermark")) hidden = true;
              // золото градиентом: прозрачный цвет + фон по буквам — это видимый текст
              if (cs.color === "rgba(0, 0, 0, 0)" && !/text/.test(cs.webkitBackgroundClip || cs.backgroundClip)) hidden = true;
            }
            if (!hidden && op >= 0.6) return true;
          }
          return false;
        };
        // дата: год или месяц словом — дизайны пишут её по-разному
        return { names: names.map((n) => [n, seen(n)]), date: seen(y), occasion: seen(occasion) || seen(occasion.split(" ")[0]) };
      },
      { names, y, occasion },
    );
  }
  const fails = [];
  for (const ms of [0, 300]) {
    const r = result[ms];
    for (const [n, ok] of r.names) if (!ok) fails.push(`t=${ms}: имя «${n}»`);
    if (!r.date) fails.push(`t=${ms}: дата (${y})`);
    if (!r.occasion) fails.push(`t=${ms}: тадбир`);
  }
  if (fails.length) bad++;
  console.log(`${String(d.number).padStart(3)} ${d.id}: ${fails.length ? "НЕТ — " + fails.join("; ") : "ok"}`);
  await page.close();
}
await browser.close();
process.exit(bad ? 1 : 0);
