// Финальный аудит всех активных дизайнов каталога (03.11.2026), Chrome через playwright-core.
// Для каждого дизайна: /demo/<id> (360 и 430), /demo/<id>/long (длинные имена, 3 тадбира, 360), /demo/<id>/namuna (375).
// Проверяет: ошибки консоли; горизонтальную прокрутку; календарь (дни недели Ду…Як, ровная сетка, отметка по центру,
// размер ≥ 14 px, календарь по центру и не у края); висящие «ва/ҳам/билан» в конце строки; обрезанные слова;
// чёткость фото (натуральная ширина ≥ 2× показанной); кнопка музыки/бейдж поверх текста; музыка вкл/выкл.
// Запуск при работающем dev-сервере: BASE=http://localhost:3100 node scripts/check-final-audit.mjs [id …]
// Результат: docs/reviews/final/audit.json, снимки календарей и первых экранов — docs/reviews/final/shots/.
import { chromium } from "playwright-core";
import { createJiti } from "jiti";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3000";
const root = process.cwd().split("\\").join("/");
const jiti = createJiti(`${root}/scripts/check-final-audit.mjs`, { alias: { "@": root } });
const { activeDesigns } = await jiti.import(`${root}/templates/registry.ts`);
const only = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const list = activeDesigns().filter((d) => !only.length || only.includes(d.id));
const OUT = "docs/reviews/final";
mkdirSync(`${OUT}/shots`, { recursive: true });

/** Всё измерение — внутри страницы */
function measure() {
  const res = { overflowX: 0, calendars: [], hanging: [], clipped: [], blurry: [], covered: [] };
  res.overflowX = Math.max(0, document.documentElement.scrollWidth - innerWidth);
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    for (let e = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) === 0) return false;
    }
    return true;
  };
  const textRect = (node) => { const r = document.createRange(); r.selectNodeContents(node); return r.getBoundingClientRect(); };
  const own = (el) => [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").trim();

  // ── Календари: ищем 7 подряд стоящих «Ду Се Чо Па Жу Ша Як» ──
  const WD = ["Ду", "Се", "Чо", "Па", "Жу", "Ша", "Як"];
  const heads = [...document.querySelectorAll("body *")].filter((e) => own(e) === "Ду" && e.children.length === 0);
  for (const du of heads) {
    let grid = du.parentElement;
    while (grid && !WD.every((w) => [...grid.querySelectorAll("*")].some((e) => own(e) === w))) grid = grid.parentElement;
    if (!grid) continue;
    const labels = WD.map((w) => [...grid.querySelectorAll("*")].find((e) => own(e) === w && e.children.length === 0));
    const order = labels.map((l) => l.getBoundingClientRect()).map((r) => r.left + r.width / 2);
    const gaps = order.slice(1).map((x, i) => x - order[i]);
    const gapAvg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const gapSpread = Math.max(...gaps) - Math.min(...gaps);
    const days = [...grid.querySelectorAll("*")].filter((e) => /^\d{1,2}$/.test(own(e)) && visible(e));
    const offColumn = days.filter((e) => { const c = textRect([...e.childNodes].find((n) => n.nodeType === 3)); const x = c.left + c.width / 2; return Math.min(...order.map((o) => Math.abs(o - x))) > 3; }).length;
    const fs = (e) => parseFloat(getComputedStyle(e).fontSize);
    // Отмеченный день: у ячейки или её потомка есть svg / рамка / фон
    let marked = null;
    for (const d of days) {
      const svg = d.querySelector("svg") ?? (d.parentElement?.children.length < 4 ? d.parentElement.querySelector("svg") : null);
      const cs = getComputedStyle(d);
      const ring = parseFloat(cs.borderTopWidth) > 0 || (cs.backgroundColor !== "rgba(0, 0, 0, 0)" && cs.backgroundColor !== "transparent");
      if (!svg && !ring) continue;
      const tn = [...d.childNodes].find((n) => n.nodeType === 3);
      const t = textRect(tn);
      const m = (svg ?? d).getBoundingClientRect();
      marked = { day: own(d), dx: +((t.left + t.width / 2) - (m.left + m.width / 2)).toFixed(1), dy: +((t.top + t.height / 2) - (m.top + m.height / 2)).toFixed(1), marker: svg ? "svg" : "box", markerW: Math.round(m.width) };
      break;
    }
    // Колонка страницы: ближайший предок шириной ≥ 300 px
    let col = grid.parentElement;
    while (col && col.getBoundingClientRect().width < 300) col = col.parentElement;
    const g = grid.getBoundingClientRect();
    const c = (col ?? document.body).getBoundingClientRect();
    res.calendars.push({
      headPx: Math.min(...labels.map(fs)),
      dayPx: days.length ? Math.min(...days.map(fs)) : 0,
      gapAvg: +gapAvg.toFixed(1), gapSpread: +gapSpread.toFixed(1), offColumn,
      centerDx: +((g.left + g.width / 2) - (c.left + c.width / 2)).toFixed(1),
      edge: Math.round(Math.min(g.left - c.left, c.right - g.right)),
      width: Math.round(g.width),
      marked,
    });
    grid.setAttribute("data-audit-cal", String(res.calendars.length - 1));
  }

  // ── Висящие «ва / ҳам / билан» в конце строки и обрезанные слова ──
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const el = n.parentElement;
    if (!el || el.closest("[data-watermark],[aria-hidden='true'],svg,script,style") || !visible(el)) continue;
    const text = n.textContent;
    // «ва» — союз: плохо, если он последний в строке (оторван от следующего слова)
    for (const m of text.matchAll(/(^|\s)(ва)\s+(\S)/g)) {
      const at = m.index + m[1].length;
      const r1 = document.createRange(); r1.setStart(n, at); r1.setEnd(n, at + m[2].length);
      const next = at + m[0].length - m[1].length - 1;
      const r2 = document.createRange(); r2.setStart(n, next); r2.setEnd(n, next + 1);
      const a = r1.getBoundingClientRect(), b = r2.getBoundingClientRect();
      if (a.height && b.height && b.top > a.top + a.height * 0.6) res.hanging.push(`ва| ${text.trim().slice(0, 50)}`);
    }
    // «ҳам», «билан» — относятся к предыдущему слову: плохо, если строка начинается с них
    for (const m of text.matchAll(/(\S)\s+(ҳам|билан)(?=[\s.,!?:;]|$)/g)) {
      const r1 = document.createRange(); r1.setStart(n, m.index); r1.setEnd(n, m.index + 1);
      const at = m.index + m[0].length - m[2].length;
      const r2 = document.createRange(); r2.setStart(n, at); r2.setEnd(n, at + m[2].length);
      const a = r1.getBoundingClientRect(), b = r2.getBoundingClientRect();
      if (a.height && b.height && b.top > a.top + a.height * 0.6) res.hanging.push(`|${m[2]} ${text.trim().slice(0, 50)}`);
    }
  }
  // «ва» отдельным элементом между именами (Names) — смотрим, не в конце ли он строки рядом с именем
  for (const el of document.querySelectorAll("body *")) {
    if (el.children.length || !visible(el)) continue;
    if (el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflow !== "visible" && own(el).length > 2) res.clipped.push(own(el).slice(0, 40));
  }

  // ── Фото: натуральная ширина ≥ 2× показанной ──
  for (const img of document.querySelectorAll("img")) {
    if (!visible(img) || !img.naturalWidth) continue;
    const r = img.getBoundingClientRect();
    const need = r.width * 2;
    if (img.naturalWidth + 1 < need && r.width > 80) res.blurry.push({ src: img.currentSrc.split("/").pop().slice(0, 60), shown: Math.round(r.width), natural: img.naturalWidth });
  }
  return res;
}

/** Кнопка музыки и бейдж не закрывают текст (в текущей прокрутке) */
function covered() {
  const out = [];
  const blockers = [...document.querySelectorAll("[aria-label^='Мусиқани'],[data-brand-badge]")].filter((b) => b.getBoundingClientRect().width > 0);
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const el = n.parentElement;
    if (!el || !n.textContent.trim() || el.closest("[aria-label^='Мусиқани'],[data-brand-badge],[data-watermark],[aria-hidden='true']")) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || Number(cs.opacity) < 0.2) continue;
    const r = document.createRange(); r.selectNodeContents(n);
    for (const t of r.getClientRects()) {
      if (t.bottom < 0 || t.top > innerHeight) continue;
      for (const b of blockers) {
        const q = b.getBoundingClientRect();
        const w = Math.min(t.right, q.right) - Math.max(t.left, q.left), h = Math.min(t.bottom, q.bottom) - Math.max(t.top, q.top);
        if (w > 4 && h > 4) out.push(n.textContent.trim().slice(0, 30));
      }
    }
  }
  return [...new Set(out)];
}

async function open(page) {
  await page.evaluate(() => document.fonts.ready);
  const btn = page.locator("[data-open]").first();
  if (await btn.count()) await btn.click({ timeout: 3000 }).catch(() => undefined);
  await page.waitForTimeout(2200);
}

/** Прокрутка до конца: и окно, и самый большой прокручиваемый блок (scroll-snap), и листание вбок (книга) */
async function scrollThrough(page, onStop) {
  const scroller = await page.evaluateHandle(() => {
    const all = [document.scrollingElement, ...document.querySelectorAll("*")].filter((e) => e && e.scrollHeight > e.clientHeight + 40 && /auto|scroll/.test(getComputedStyle(e).overflowY) || e === document.scrollingElement);
    return all.sort((a, b) => b.scrollHeight - a.scrollHeight)[0];
  });
  const total = await scroller.evaluate((e) => e.scrollHeight - e.clientHeight);
  const step = Math.round((page.viewportSize()?.height ?? 740) * 0.85);
  for (let y = 0; y <= total + step; y += step) {
    await scroller.evaluate((e, y) => e.scrollTo(0, y), y);
    await page.waitForTimeout(160);
    if (onStop) await onStop(y);
  }
  return total;
}

const browser = await chromium.launch({ channel: "chrome" });
const report = {};
for (const d of list) {
  const r = (report[d.id] = { number: d.number, occasion: d.occasion, format: d.format, errors: [], runs: {} });
  for (const [kind, path, width, height] of [
    ["w360", `/demo/${d.id}`, 360, 740],
    ["w430", `/demo/${d.id}`, 430, 860],
    ["long360", `/demo/${d.id}/long`, 360, 740],
    ["namuna375", `/demo/${d.id}/namuna`, 375, 812],
  ]) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    page.on("console", (m) => m.type() === "error" && r.errors.push(`${kind}: ${m.text().slice(0, 160)}`));
    page.on("pageerror", (e) => r.errors.push(`${kind}: ${String(e).slice(0, 160)}`));
    await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.waitForLoadState("load", { timeout: 15_000 }).catch(() => undefined);
    if (kind === "w360") await page.screenshot({ path: `${OUT}/shots/${d.id}-first.jpg`, type: "jpeg", quality: 70 });
    await open(page);
    const cover = new Set(await page.evaluate(covered));
    if (kind !== "namuna375") await scrollThrough(page);
    const m = await page.evaluate(measure);
    // в конце страницы (футер) и на первом экране после открытия кнопки не должны закрывать текст
    for (const x of await page.evaluate(covered)) cover.add(x);
    m.covered = [...cover];
    // музыка: вкл → выкл
    const music = page.locator("[aria-label^='Мусиқани']").first();
    if (await music.count()) {
      const a = await music.getAttribute("aria-label");
      await music.click({ force: true }).catch(() => undefined);
      await page.waitForTimeout(400);
      const b = await music.getAttribute("aria-label");
      await music.click({ force: true }).catch(() => undefined);
      await page.waitForTimeout(300);
      const c = await music.getAttribute("aria-label");
      m.music = a !== b && a === c ? "ok" : `не переключается: ${a} → ${b} → ${c}`;
    } else m.music = "нет кнопки";
    if (kind === "w360") {
      for (let i = 0; i < m.calendars.length; i++) {
        const cal = page.locator(`[data-audit-cal="${i}"]`);
        await cal.scrollIntoViewIfNeeded().catch(() => undefined);
        await page.waitForTimeout(900);
        await cal.screenshot({ path: `${OUT}/shots/${d.id}-cal${i}.png` }).catch(() => undefined);
      }
    }
    r.runs[kind] = m;
    await page.close();
  }
  const w = r.runs.w360;
  console.log(`${d.id}: err ${r.errors.length}, cal ${w.calendars.map((c) => `${c.headPx}/${c.dayPx}px Δ${c.marked?.dx},${c.marked?.dy} w${c.width}${c.width < 240 || c.gapAvg < 28 ? " ТЕСНО" : ""}`).join(" ")}, hang ${w.hanging.length + r.runs.long360.hanging.length}, cover ${w.covered.length}, blur ${w.blurry.length}, music ${w.music}`);
}
await browser.close();
writeFileSync(`${OUT}/audit.json`, JSON.stringify(report, null, 1));
console.log(`→ ${OUT}/audit.json`);
