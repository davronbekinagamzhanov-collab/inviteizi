/**
 * «Сақлаб олиш» (19.11.2026): снимает с каждого дизайна в продаже то, из чего строятся фото и PDF клиента.
 *   - подложка: первый экран дизайна после открытия, БЕЗ текста (рамка, орнамент, картина, фон) —
 *     assets/keepsake/plates/<id>.webp, 1080×1920;
 *   - цвета: бумага, цвет имён, цвет даты/места; шрифты имён и текста (из самого дизайна) —
 *     lib/keepsake/looks.json + assets/keepsake/fonts/*.ttf.
 * Запуск (нужен dev-сервер): npx next dev -p 3121 & ; KEEPSAKE_BASE=http://localhost:3121 npx tsx scripts/keepsake/capture-looks.ts [id …]
 * Повторный запуск безопасен; после смены дизайна — запустить для него.
 */
import { chromium, type Page } from "playwright-core";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { ON_SALE_IDS } from "@/templates/catalog";
import { getDesign } from "@/templates/registry";
import { paperColor, quietZone } from "./zone";

const BASE = process.env.KEEPSAKE_BASE ?? "http://localhost:3121";
const LOOKS = "lib/keepsake/looks.json";
const PLATES = "assets/keepsake/plates";
const FONTS = "assets/keepsake/fonts";
mkdirSync(PLATES, { recursive: true });
mkdirSync(FONTS, { recursive: true });

export type CapturedLook = {
  paper: string;
  ink: string;
  accent: string;
  namesFont: string;
  namesItalic: boolean;
  bodyFont: string;
  dark: boolean;
  /** Тихая зона подложки [верх, низ] долями высоты — там нет рисунка */
  zone: [number, number];
};

type Probe = { family: string; weight: string; style: string; color: string; src: string | null };

const looks: Record<string, CapturedLook> = existsSync(LOOKS) ? JSON.parse(readFileSync(LOOKS, "utf8")) : {};
const only = process.argv.slice(2);
const ids = only.length ? only : [...ON_SALE_IDS];

function rgbHex(c: string) {
  const m = c.match(/[\d.]+/g);
  if (!m) return "#000000";
  return "#" + m.slice(0, 3).map((v) => Math.round(Number(v)).toString(16).padStart(2, "0")).join("");
}

async function fontFile(p: Probe, fallback: string) {
  if (!p.src) return fallback;
  const res = await fetch(new URL(p.src, BASE).href);
  if (!res.ok) throw new Error(`шрифт ${p.src}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const weight = Number(p.weight) || 400;
  const name = `${createHash("sha256").update(buf).digest("hex").slice(0, 10)}-${weight}.ttf`;
  const out = `${FONTS}/${name}`;
  if (!existsSync(out)) {
    const tmp = `${FONTS}/.src-${name}`;
    writeFileSync(tmp, buf);
    try {
      execFileSync("python3", ["scripts/keepsake/font-ttf.py", tmp, out, String(weight)]);
    } finally {
      execFileSync("rm", ["-f", tmp]);
    }
  }
  return name;
}

/** Элемент с текстом needle: его шрифт (и файл @font-face), цвет */
async function probe(page: Page, needles: string[]): Promise<Probe | null> {
  return page.evaluate((needles) => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let el: HTMLElement | null = null;
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const text = n.textContent ?? "";
      if (!needles.some((x) => x && text.includes(x))) continue;
      const p = n.parentElement;
      if (!p) continue;
      const r = p.getBoundingClientRect();
      const cs = getComputedStyle(p);
      if (r.width === 0 || cs.visibility === "hidden" || Number(cs.opacity) === 0) continue;
      el = p;
      break;
    }
    if (!el) return null;
    const cs = getComputedStyle(el);
    const family = cs.fontFamily.split(",")[0].trim().replace(/^["']|["']$/g, "");
    let src: string | null = null;
    const weight = Number(cs.fontWeight) || 400;
    let best = Infinity;
    for (const sheet of Array.from(document.styleSheets)) {
      let rules: CSSRuleList;
      try {
        rules = sheet.cssRules;
      } catch {
        continue;
      }
      for (const r of Array.from(rules)) {
        if (!(r instanceof CSSFontFaceRule)) continue;
        const f = r.style.getPropertyValue("font-family").trim().replace(/^["']|["']$/g, "");
        if (f !== family) continue;
        const st = r.style.getPropertyValue("font-style") || "normal";
        if ((st.includes("italic") ? "italic" : "normal") !== (cs.fontStyle === "italic" ? "italic" : "normal")) continue;
        const ws = (r.style.getPropertyValue("font-weight") || "400").split(/\s+/).map(Number);
        const d = weight >= ws[0] && weight <= (ws[1] ?? ws[0]) ? 0 : Math.abs(weight - ws[0]);
        const m = r.style.getPropertyValue("src").match(/url\(["']?([^"')]+)["']?\)/);
        if (m && d < best) {
          best = d;
          src = new URL(m[1], sheet.href ?? location.href).href;
        }
      }
    }
    // градиентный/прозрачный текст: цвет из -webkit-text-fill-color или заливки
    const fill = cs.getPropertyValue("-webkit-text-fill-color");
    const color = fill && !/rgba\(0, 0, 0, 0\)|transparent/.test(fill) ? fill : cs.color;
    return { family, weight: cs.fontWeight, style: cs.fontStyle, color, src };
  }, needles);
}

async function main() {
const browser = await chromium.launch({ executablePath: process.env.CHROME || "/opt/pw-browsers/chromium" });
try {
  for (const id of ids) {
    const d = getDesign(id);
    if (!d) throw new Error(`нет дизайна ${id}`);
    const page = await browser.newPage({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3 });
    await page.goto(`${BASE}/demo/${id}?render=plate`, { waitUntil: "networkidle", timeout: 120_000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(4500); // открытие конверта и появление первого экрана
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(600);
    const s = d.sample;
    const nameNeedles = [s.groom, s.bride, s.person, s.hosts].filter(Boolean) as string[];
    const venue = s.events[0]?.venueName ?? "";
    const names = await probe(page, nameNeedles);
    const body = (await probe(page, [venue])) ?? names;
    // подложка: тот же экран, весь текст прозрачный; «плашки» под текстом (даты, кнопки) — без фона
    await page.evaluate(() => {
      const area = innerWidth * innerHeight;
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (!n.textContent?.trim()) continue;
        let el = n.parentElement;
        for (let i = 0; el && i < 3; i++, el = el.parentElement) {
          const r = el.getBoundingClientRect();
          if (r.width * r.height > area * 0.25) break;
          el.setAttribute("data-ks-clear", "");
        }
      }
    });
    await page.addStyleTag({
      content: `*{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;-webkit-text-stroke:0!important;caret-color:transparent!important}
        svg text,svg tspan{fill:transparent!important;stroke:none!important}
        button,a,[data-open],[data-opening-caption]{visibility:hidden!important}
        [data-ks-clear]{background:transparent!important;border-color:transparent!important;box-shadow:none!important;backdrop-filter:none!important}
        nextjs-portal{display:none!important}`,
    });
    await page.waitForTimeout(300);
    const png = await page.screenshot({ type: "png" });
    await page.close();
    const plate = await sharp(png).resize(1080, 1920, { fit: "cover" }).webp({ quality: 80 }).toBuffer();
    writeFileSync(`${PLATES}/${id}.webp`, plate);
    const paper = await paperColor(plate);
    const lum = (() => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(paper.slice(i, i + 2), 16) / 255);
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    })();
    looks[id] = {
      paper,
      ink: rgbHex(names?.color ?? (lum < 0.4 ? "rgb(247,240,228)" : "rgb(59,42,30)")),
      accent: rgbHex(body?.color ?? names?.color ?? "rgb(168,119,42)"),
      namesFont: names ? await fontFile(names, "lora-regular") : "lora-regular",
      namesItalic: names?.style === "italic",
      bodyFont: body ? await fontFile(body, "lora-regular") : "lora-regular",
      dark: lum < 0.4,
      zone: await quietZone(plate),
    };
    console.log(id, JSON.stringify(looks[id]));
    writeFileSync(LOOKS, JSON.stringify(looks, null, 2) + "\n");
  }
} finally {
  await browser.close();
}
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
