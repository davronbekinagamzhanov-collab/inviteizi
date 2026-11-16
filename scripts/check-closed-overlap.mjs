// Закрытый экран приглашения: надписи и печать не должны налезать друг на друга.
// Для каждого дизайна в продаже × язык × размер окна (в т.ч. «низкое» окно Mini App) × обычные и длинные имена:
//  1) собирает прямоугольники видимых надписей (по границам букв, не строки) и печатей;
//  2) для каждой пересекающейся пары (> 2 px) проверяет по пикселям, что обе надписи действительно видны
//     (если надпись спрятать, кадр в её прямоугольнике меняется) — так не считается текст, закрытый обложкой.
// Запуск на production-сборке: npm run build && INVITEIZI_CHECK=1 npx next start -p 3130, затем
//   node scripts/check-closed-overlap.mjs [--base=...] [--only=id1,id2] [--sizes=375x600] [--langs=uz,ru] [--variants=demo,long]
// Отчёт: $CHECK_OVERLAP_REPORT или <tmpdir>/inviteizi-closed-overlap.json; скриншоты ошибок рядом. Только чтение.
import "./ts-hooks.mjs";
import { chromium } from "playwright-core";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";

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

/** В браузере: надписи и печати закрытого экрана, пары с пересечением */
function collect() {
  const SKIP =
    "[data-lang-switch],[data-brand-badge],[data-watermark],[data-music-hint]," +
    "[aria-label^='Мусиқани'],[aria-label^='Музык'],script,style,noscript";
  const shown = (el) => {
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      if (n.hasAttribute("inert")) return false;
      const s = getComputedStyle(n);
      if (s.display === "none" || s.visibility === "hidden" || Number(s.opacity) < 0.05) return false;
    }
    return true;
  };
  const ctx = document.createElement("canvas").getContext("2d");
  const boxes = [];
  const tag = (el) => {
    const t = `o${boxes.length}`;
    el.setAttribute("data-ovl", `${el.getAttribute("data-ovl") ?? ""} ${t}`.trim());
    return t;
  };
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const el = node.parentElement;
    if (!el || !node.textContent.trim() || el.closest(SKIP) || !shown(el)) continue;
    const st = getComputedStyle(el);
    ctx.font = `${st.fontStyle} ${st.fontWeight} ${st.fontSize} ${st.fontFamily}`;
    const r = document.createRange();
    r.selectNodeContents(node);
    for (const rect of r.getClientRects()) {
      if (rect.width < 2 || rect.height < 2 || rect.bottom < 0 || rect.top > innerHeight) continue;
      const str = (st.textTransform === "uppercase" ? node.textContent.toUpperCase() : node.textContent).trim();
      const m = ctx.measureText(str || "x");
      const area = m.fontBoundingBoxAscent + m.fontBoundingBoxDescent || rect.height;
      const base = rect.top + (m.fontBoundingBoxAscent * rect.height) / area;
      const top = Math.max(rect.top, base - m.actualBoundingBoxAscent);
      const bottom = Math.min(rect.bottom, base + m.actualBoundingBoxDescent);
      boxes.push({
        kind: "text",
        text: node.textContent.trim().slice(0, 40),
        el,
        tag: tag(el),
        x: rect.left,
        y: top,
        w: rect.width,
        h: Math.max(1, bottom - top),
      });
    }
  }
  const sealSel = "[data-seal],[class*='seal' i],[class*='wax' i],[class*='medallion' i]";
  for (const el of document.querySelectorAll(sealSel)) {
    if (el.closest(SKIP) || !shown(el)) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width < 8 || rect.height < 8 || rect.bottom < 0 || rect.top > innerHeight) continue;
    const k = 0.15; // круглая печать: вписанный квадрат
    boxes.push({
      kind: "seal",
      text: "печать",
      el,
      tag: tag(el),
      x: rect.left + rect.width * k,
      y: rect.top + rect.height * k,
      w: rect.width * (1 - 2 * k),
      h: rect.height * (1 - 2 * k),
    });
  }
  const hits = [];
  const inside = (t, s) =>
    s.kind === "seal" &&
    t.kind === "text" &&
    t.x >= s.x - 10 &&
    t.y >= s.y - 10 &&
    t.x + t.w <= s.x + s.w + 10 &&
    t.y + t.h <= s.y + s.h + 10;
  const gp = (e) => e.parentElement?.parentElement;
  for (let i = 0; i < boxes.length; i++)
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i],
        b = boxes[j];
      if (a.el === b.el || a.el.contains(b.el) || b.el.contains(a.el)) continue;
      if (a.kind === "seal" && b.kind === "seal") continue;
      if (inside(a, b) || inside(b, a)) continue; // надпись на самой печати
      // буквы монограммы «AM» задуманно сплетены
      if (a.text.length <= 2 && b.text.length <= 2 && gp(a.el) && gp(a.el) === gp(b.el)) continue;
      // одна надпись двумя слоями (тиснение/тень): тот же текст почти в том же месте
      if (a.text === b.text && Math.abs(a.x - b.x) < 6 && Math.abs(a.y - b.y) < 6) continue;
      const ix = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const iy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ix > 2 && iy > 2)
        hits.push({
          msg: `${a.kind}:«${a.text}» × ${b.kind}:«${b.text}» (${Math.round(ix)}×${Math.round(iy)})`,
          boxes: [a, b].map(({ tag, x, y, w, h }) => ({ tag, x, y, w, h })),
        });
    }
  // за краем — ошибка, кроме карточек горизонтальной ленты (альбом листается вбок, соседняя карточка заглядывает)
  const inStrip = (el) => {
    for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
      const ox = getComputedStyle(n).overflowX;
      if ((ox === "auto" || ox === "scroll") && n.scrollWidth > n.clientWidth + 4) return true;
    }
    return false;
  };
  for (const b of boxes)
    if (b.kind === "text" && (b.x < -2 || b.x + b.w > innerWidth + 2) && !inStrip(b.el))
      hits.push({ msg: `за краем: «${b.text}»`, boxes: [{ tag: b.tag, x: b.x, y: b.y, w: b.w, h: b.h }] });
  return { hits, opener: Boolean(document.querySelector("[data-open]")) };
}

/** Надпись действительно видна: если её спрятать, пиксели в её прямоугольнике меняются */
async function visibleOnScreen(page, b) {
  const vp = page.viewportSize();
  const x = Math.min(vp.width - 1, Math.max(0, Math.floor(b.x)));
  const y = Math.min(vp.height - 1, Math.max(0, Math.floor(b.y)));
  const clip = {
    x,
    y,
    width: Math.max(1, Math.min(Math.ceil(b.w), vp.width - x)),
    height: Math.max(1, Math.min(Math.ceil(b.h), vp.height - y)),
  };
  const sel = `[data-ovl~="${b.tag}"]`;
  const shot = () => page.screenshot({ clip, animations: "disabled" });
  const before = await shot();
  await page.$eval(sel, (el) => el.style.setProperty("visibility", "hidden", "important"));
  const after = await shot();
  await page.$eval(sel, (el) => el.style.removeProperty("visibility"));
  const [p, q] = await Promise.all([before, after].map((png) => sharp(png).raw().toBuffer()));
  let diff = 0;
  for (let i = 0; i < p.length; i++) if (Math.abs(p[i] - q[i]) > 24) diff++;
  return diff > 12;
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
          // длинные имена и три тадбира — служебная страница (сервер запущен с INVITEIZI_CHECK=1)
          const url =
            variant === "long"
              ? `${BASE}/dev/invitation/${d.id}?long=1&lang=${lang}`
              : `${BASE}/demo/${d.id}?lang=${lang}`;
          const res = await page.goto(url, {
            waitUntil: "networkidle",
            timeout: 120000,
          });
          if (res?.status() !== 200) throw Error(`${url}: ${res?.status()} (для long нужен INVITEIZI_CHECK=1)`);
          await page.evaluate(async () => {
            await document.fonts.ready;
            const imgs = [...document.images].filter((i) => i.loading !== "lazy");
            const wait = Promise.all(imgs.map((i) => (i.complete ? null : i.decode().catch(() => null))));
            await Promise.race([wait, new Promise((r) => setTimeout(r, 3000))]);
          });
          await page.waitForTimeout(1500);
          const raw = await page.evaluate(collect);
          const hits = [];
          for (const hit of raw.hits) {
            let all = true;
            for (const b of hit.boxes) if (!(await visibleOnScreen(page, b))) all = false;
            if (all) hits.push(hit.msg);
          }
          const uniq = [...new Set(hits)];
          const id = `${d.id}-${variant}-${lang}-${w}x${h}`;
          if (uniq.length) await page.screenshot({ path: path.join(SHOTS, `${id}.png`) });
          results.push({ id: d.id, variant, lang, size: `${w}x${h}`, opener: raw.opener, hits: uniq });
          if (uniq.length) console.log(`FAIL ${id}: ${uniq.slice(0, 3).join(" | ")}`);
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
const n = new Set(bad.map((r) => r.id)).size;
console.log(`\nПроверок: ${results.length}, с наложениями: ${bad.length} (${n} дизайнов). Отчёт: ${OUT}`);
process.exitCode = bad.length ? 1 : 0;
