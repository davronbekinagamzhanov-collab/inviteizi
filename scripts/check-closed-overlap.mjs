// Закрытый экран приглашения: тексты и печать не должны налезать друг на друга.
// Для каждого дизайна в продаже × язык × размер окна (в т.ч. «низкое» окно Mini App) × обычные и длинные имена
// собирает прямоугольники видимых текстовых строк и печатей на закрытом экране; пересечение > 2 px — ошибка.
// Запуск на production-сборке: npm run build && npx next start -p 3130, затем
//   node scripts/check-closed-overlap.mjs [--base=http://localhost:3130] [--only=id1,id2] [--sizes=375x600,390x844]
// Отчёт: $CHECK_OVERLAP_REPORT или <tmpdir>/inviteizi-closed-overlap.json; скриншоты ошибок рядом. Только чтение.
import "./ts-hooks.mjs";
import { chromium } from "playwright-core";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const arg = (name, def) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? def;
const BASE = arg("base", "http://localhost:3130");
if (!["localhost", "127.0.0.1"].includes(new URL(BASE).hostname)) throw Error("Только локальный сервер");
const { activeDesigns } = await import("../templates/registry.ts");
const only = arg("only", "");
const targets = activeDesigns().filter((d) => !only || only.split(",").includes(d.id));
const SIZES = arg("sizes", "320x560,375x600,390x640,430x700,390x844,430x932")
  .split(",")
  .map((s) => s.split("x").map(Number));
const LANGS = arg("langs", "uz,ru").split(",");
const VARIANTS = arg("variants", "demo,long").split(",");
const OUT = process.env.CHECK_OVERLAP_REPORT ?? path.join(tmpdir(), "inviteizi-closed-overlap.json");
const SHOTS = path.join(path.dirname(OUT), "closed-overlap-shots");
await mkdir(SHOTS, { recursive: true });
const musicFixture = await readFile("public/music/namuna-kuy.wav");

/** В браузере: прямоугольники строк текста и печатей закрытого экрана, затем пересечения */
function collect() {
  const visible = (el) => {
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      if (n.hasAttribute("inert")) return false;
      const s = getComputedStyle(n);
      if (s.display === "none" || s.visibility === "hidden" || Number(s.opacity) < 0.05) return false;
    }
    return true;
  };
  const skip = "[data-lang-switch],[data-brand-badge],[data-tap-hint],[data-watermark],script,style,noscript";
  const boxes = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let t = walker.nextNode(); t; t = walker.nextNode()) {
    const el = t.parentElement;
    if (!el || !t.textContent.trim() || el.closest(skip) || !visible(el)) continue;
    const r = document.createRange();
    r.selectNodeContents(t);
    for (const rect of r.getClientRects()) {
      if (rect.width < 2 || rect.height < 2) continue;
      if (rect.bottom < 0 || rect.top > innerHeight || rect.right < 0 || rect.left > innerWidth) continue;
      boxes.push({
        kind: "text",
        text: t.textContent.trim().slice(0, 40),
        el,
        x: rect.left,
        y: rect.top,
        w: rect.width,
        h: rect.height,
      });
    }
  }
  const seals = [
    ...document.querySelectorAll("[data-seal],[class*='seal' i],[class*='wax' i],[data-envelope-seal]"),
  ].filter((el) => !el.closest(skip) && visible(el));
  for (const el of seals) {
    const rect = el.getBoundingClientRect();
    if (rect.width < 8 || rect.height < 8 || rect.bottom < 0 || rect.top > innerHeight) continue;
    // круглая печать: берём вписанный квадрат, чтобы не считать пустые углы
    const k = 0.15;
    boxes.push({
      kind: "seal",
      text: "печать",
      el,
      x: rect.left + rect.width * k,
      y: rect.top + rect.height * k,
      w: rect.width * (1 - 2 * k),
      h: rect.height * (1 - 2 * k),
    });
  }
  const hits = [];
  for (let i = 0; i < boxes.length; i++)
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i],
        b = boxes[j];
      if (a.el === b.el || a.el.contains(b.el) || b.el.contains(a.el)) continue;
      if (a.kind === "seal" && b.kind === "seal") continue; // слои одной печати
      // буквы монограммы «AM» задуманно сплетены
      if (a.text.length <= 2 && b.text.length <= 2 && a.el.parentElement?.closest("*")?.parentElement?.contains(b.el))
        continue;
      // одна и та же надпись в двух слоях (лицевая и обратная сторона при открытии)
      if (a.text === b.text && Math.abs(a.x - b.x) < 4 && Math.abs(a.y - b.y) < 4) continue;
      // надпись внутри печати («А · М» на сургуче) — часть печати
      const own = (t, s) => s.kind === "seal" && s.el.contains(t.el);
      if (own(a, b) || own(b, a)) continue;
      const ix = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const iy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ix > 2 && iy > 2)
        hits.push(`${a.kind}:«${a.text}» × ${b.kind}:«${b.text}» (${Math.round(ix)}×${Math.round(iy)})`);
    }
  // текст за краем экрана по горизонтали тоже ошибка
  for (const b of boxes)
    if (b.kind === "text" && (b.x < -2 || b.x + b.w > innerWidth + 2)) hits.push(`за краем: «${b.text}»`);
  return { hits: [...new Set(hits)], opener: Boolean(document.querySelector("[data-open]")) };
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const results = [];
try {
  for (const d of targets) {
    for (const variant of VARIANTS) {
      for (const lang of LANGS) {
        for (const [w, h] of SIZES) {
          const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true });
          await ctx.route("**/storage/v1/object/public/music/**", (r) =>
            r.fulfill({ status: 200, contentType: "audio/wav", body: musicFixture }),
          );
          const page = await ctx.newPage();
          const url = `${BASE}/demo/${d.id}${variant === "long" ? "/long" : ""}?lang=${lang}`;
          await page.goto(url, { waitUntil: "networkidle", timeout: 120000 });
          await page.evaluate(async () => {
            await document.fonts.ready;
            const imgs = [...document.images].filter((i) => i.loading !== "lazy");
            const wait = Promise.all(imgs.map((i) => (i.complete ? null : i.decode().catch(() => null))));
            await Promise.race([wait, new Promise((r) => setTimeout(r, 3000))]);
          });
          await page.waitForTimeout(1500);
          const r = await page.evaluate(collect);
          const id = `${d.id}-${variant}-${lang}-${w}x${h}`;
          if (r.hits.length) await page.screenshot({ path: path.join(SHOTS, `${id}.png`) });
          results.push({ id: d.id, variant, lang, size: `${w}x${h}`, opener: r.opener, hits: r.hits });
          if (r.hits.length) console.log(`FAIL ${id}: ${r.hits.slice(0, 3).join(" | ")}`);
          await ctx.close();
        }
      }
    }
    console.log(`done ${d.id}`);
  }
} finally {
  await browser.close();
}
await writeFile(OUT, JSON.stringify(results, null, 2));
const bad = results.filter((r) => r.hits.length);
console.log(
  `\nПроверок: ${results.length}, с наложениями: ${bad.length} (${new Set(bad.map((r) => r.id)).size} дизайнов). Отчёт: ${OUT}`,
);
process.exitCode = bad.length ? 1 : 0;
