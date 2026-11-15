// A4: в русской версии приглашения не должно быть узбекских интерфейсных строк.
// Открывает /demo/<id>?lang=ru каждого дизайна реестра (375×812), нажимает «открыть», прокручивает до конца,
// собирает весь текст страницы + aria-label/alt/title и убирает данные клиента (пример заказа дизайна).
// Остаток проверяется на узбекские буквы (ў қ ғ ҳ) и частые узбекские слова без этих букв.
// Запуск на production-сборке: npm run build && npx next start -p 3130, затем
//   node scripts/check-ru-strings.mjs [--base=http://localhost:3130] [--only=id1,id2]
// Отчёт: $CHECK_RU_REPORT или <tmpdir>/inviteizi-ru-strings.json. Только чтение, без записи в базу.
import "./ts-hooks.mjs";
import { chromium } from "playwright-core";
import { readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const arg = (name, def) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? def;
const BASE = arg("base", "http://localhost:3130");
const only = arg("only", "");
if (!["localhost", "127.0.0.1"].includes(new URL(BASE).hostname) && !BASE.includes(".vercel.app")) {
  throw Error("Только локальный сервер или Vercel Preview");
}
const { designs } = await import("../templates/registry.ts");
const { futureDemoData } = await import("../lib/marketing/demo-dates.ts");
const musicFixture = await readFile("public/music/namuna-kuy.wav");
const targets = only ? designs.filter((d) => only.split(",").includes(d.id)) : designs;

const UZ_LETTERS = /[ўқғҳЎҚҒҲ]/;
// Узбекские слова без особых букв, которые часто встречаются в интерфейсе приглашений
const UZ_WORDS =
  /(^|[^а-яё])(таклифнома\S*|сизни|кутамиз|манзил\S*|очинг|босинг|суринг|варақ\S*|тадбир\S*|оиласи|марҳамат|дастур\S*|санаси|куни)(?=$|[^а-яё])/i;

const norm = (s) =>
  String(s)
    .replace(/[   ⁠]/g, " ")
    .replace(/­/g, "")
    .replace(/\s+/g, " ")
    .trim();

/** Все строки данных клиента (имена, хозяева, места, свой текст) — их язык выбирает клиент */
function clientStrings(data) {
  const out = [];
  const walk = (v) => {
    if (typeof v === "string") {
      const s = norm(v);
      if (s.length > 1 && !/^https?:/.test(s)) out.push(s);
    } else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(data);
  // длинные первыми, чтобы «Азиз ва Мадина» вычеркнулось раньше «Азиз»
  return [...new Set(out)].sort((a, b) => b.length - a.length);
}

function findings(text, client) {
  let rest = ` ${norm(text)} `;
  for (const c of client) rest = rest.split(c).join(" ¦ ");
  const bad = [];
  for (const chunk of rest.split(/¦|\n|(?<=[.!?…])\s/)) {
    const c = chunk.trim();
    if (c && (UZ_LETTERS.test(c) || UZ_WORDS.test(c))) bad.push(c.slice(0, 120));
  }
  return [...new Set(bad)];
}

// CHROMIUM_PATH — свой Chromium, если playwright-core не нашёл браузер
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ["--autoplay-policy=no-user-gesture-required"],
});
const results = [];
try {
  for (const d of targets) {
    const context = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
    // демо-музыка из Supabase Storage подменяется локальным файлом: к рабочему хранилищу не обращаемся
    await context.route("**/storage/v1/object/public/music/**", (r) =>
      r.fulfill({ status: 200, contentType: "audio/wav", body: musicFixture }),
    );
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const res = await page.goto(`${BASE}/demo/${d.id}?lang=ru`, { waitUntil: "networkidle", timeout: 120000 });
    await page.waitForTimeout(600);
    const collect = () =>
      page.evaluate(() => {
        const parts = [];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          const p = n.parentElement;
          // переключатель языка намеренно называет каждый язык на нём самом («Ўзбекча · Русский»)
          if (!p || p.closest("script,style,noscript,template,[data-lang-switch]")) continue;
          if (n.textContent.trim()) parts.push(n.textContent);
        }
        for (const el of document.querySelectorAll("[aria-label],[alt],[title],[placeholder]")) {
          if (el.closest("[data-lang-switch]")) continue;
          for (const a of ["aria-label", "alt", "title", "placeholder"]) {
            const v = el.getAttribute(a);
            if (v && v.trim()) parts.push(v);
          }
        }
        return { text: parts.join("\n"), lang: document.documentElement.lang };
      });
    const before = await collect();
    const opener = page.locator("[data-open]:not(:disabled)").first();
    if (await opener.count()) {
      await opener.click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(2500);
    }
    for (let y = 0, h = 1; y < h; y += 500) {
      h = await page.evaluate(() => document.documentElement.scrollHeight);
      await page.evaluate((v) => window.scrollTo(0, v), y);
      await page.waitForTimeout(80);
    }
    await page.waitForTimeout(600);
    const after = await collect();
    const sample = futureDemoData(d.sample, new Date());
    const bad = findings(`${before.text}\n${after.text}`, clientStrings(sample));
    results.push({ id: d.id, number: d.number, status: res?.status(), lang: after.lang, errors, bad });
    console.log(
      `${bad.length || errors.length ? "FAIL" : "ok  "} ${d.id} ${after.lang} ${bad.slice(0, 4).join(" | ")}`,
    );
    await context.close();
  }
} finally {
  await browser.close();
}
const out = process.env.CHECK_RU_REPORT ?? path.join(tmpdir(), "inviteizi-ru-strings.json");
await writeFile(out, JSON.stringify(results, null, 2));
const failed = results.filter((r) => r.bad.length || r.errors.length || r.status !== 200 || r.lang !== "ru");
console.log(`\nДизайнов: ${results.length}, с замечаниями: ${failed.length}. Отчёт: ${out}`);
process.exitCode = failed.length ? 1 : 0;
