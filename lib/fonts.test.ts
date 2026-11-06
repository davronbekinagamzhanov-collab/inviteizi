/**
 * Шрифты только локальные (next/font/local), без Google Fonts. В каждом используемом файле есть узбекские
 * ў қ ғ ҳ (и заглавные) и казахские ә ғ қ ң ө ұ ү һ і. Проверка по таблице cmap внутри WOFF2.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { brotliDecompressSync } from "node:zlib";
import { describe, expect, it, vi } from "vitest";

// style.ts дизайнов вызывает next/font/local — в тесте нужен только экспорт правил
vi.mock("next/font/local", () => ({ default: () => ({ variable: "--f", className: "f", style: {} }) }));

const UZ = "ўқғҳЎҚҒҲ";
const KK = "әғқңөұүһіӘҒҚҢӨҰҮҺІ";
const BASIC = "АаЯяЁё";

function sources(dir: string, out: string[] = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) sources(p, out);
    else if (/\.(tsx?|css)$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

/** Все woff2, на которые ссылается код (next/font/local src.path и @font-face url) */
function usedFonts() {
  const files = new Set<string>();
  for (const f of [...sources("app"), ...sources("templates"), ...sources("lib")]) {
    const text = readFileSync(f, "utf8");
    for (const m of text.matchAll(/["'(]((?:\.\.?\/)+assets\/fonts\/[^"')]+\.(?:woff2|ttf|otf))["')]/g)) files.add(join(f, "..", m[1]));
  }
  return [...files].sort();
}

function base128(b: Buffer, at: { i: number }) {
  let v = 0;
  for (let k = 0; k < 5; k++) {
    const x = b[at.i++];
    v = (v << 7) | (x & 0x7f);
    if (!(x & 0x80)) return v >>> 0;
  }
  throw Error("bad UIntBase128");
}

/** cmap из TTF/OTF (таблицы без сжатия) */
function sfntCmap(b: Buffer) {
  const n = b.readUInt16BE(4);
  for (let t = 0; t < n; t++) {
    const rec = 12 + t * 16;
    if (b.toString("latin1", rec, rec + 4) === "cmap") return b.subarray(b.readUInt32BE(rec + 8), b.readUInt32BE(rec + 8) + b.readUInt32BE(rec + 12));
  }
  throw Error("no cmap");
}

/** Символы из cmap (формат 4 и 12) шрифта WOFF2 / TTF / OTF */
export function fontChars(file: string): Set<number> {
  const b = readFileSync(file);
  if (b.toString("latin1", 0, 4) !== "wOF2") return cmapChars(sfntCmap(b));
  const numTables = b.readUInt16BE(12);
  const compressed = b.readUInt32BE(20);
  const at = { i: 48 };
  let offset = 0;
  let cmap: { off: number; len: number } | null = null;
  for (let t = 0; t < numTables; t++) {
    const flags = b[at.i++];
    const tagIndex = flags & 0x3f;
    if (tagIndex === 0x3f) at.i += 4;
    const version = (flags >> 6) & 3;
    const orig = base128(b, at);
    const glyfLoca = tagIndex === 10 || tagIndex === 11;
    const transformed = glyfLoca ? version === 0 : version !== 0;
    const len = transformed ? base128(b, at) : orig;
    if (tagIndex === 0) cmap = { off: offset, len };
    offset += len;
  }
  if (!cmap) throw Error(`${file}: no cmap`);
  const data = brotliDecompressSync(b.subarray(at.i, at.i + compressed));
  return cmapChars(data.subarray(cmap.off, cmap.off + cmap.len));
}

function cmapChars(c: Buffer): Set<number> {
  const chars = new Set<number>();
  const n = c.readUInt16BE(2);
  for (let r = 0; r < n; r++) {
    const platform = c.readUInt16BE(4 + r * 8);
    const sub = c.readUInt32BE(8 + r * 8);
    if (platform !== 0 && platform !== 3) continue;
    const format = c.readUInt16BE(sub);
    if (format === 4) {
      const segX2 = c.readUInt16BE(sub + 6);
      const ends = sub + 14;
      const starts = ends + segX2 + 2;
      const deltas = starts + segX2;
      const ranges = deltas + segX2;
      for (let s = 0; s < segX2 / 2; s++) {
        const end = c.readUInt16BE(ends + s * 2);
        const start = c.readUInt16BE(starts + s * 2);
        const delta = c.readUInt16BE(deltas + s * 2);
        const rangeOff = c.readUInt16BE(ranges + s * 2);
        for (let ch = start; ch <= end && ch !== 0xffff; ch++) {
          let g: number;
          if (rangeOff === 0) g = (ch + delta) & 0xffff;
          else {
            const gi = c.readUInt16BE(ranges + s * 2 + rangeOff + (ch - start) * 2);
            g = gi === 0 ? 0 : (gi + delta) & 0xffff;
          }
          if (g) chars.add(ch);
        }
      }
    } else if (format === 12) {
      const groups = c.readUInt32BE(sub + 12);
      for (let g = 0; g < groups; g++) {
        const p = sub + 16 + g * 12;
        const start = c.readUInt32BE(p);
        const end = c.readUInt32BE(p + 4);
        for (let ch = start; ch <= end; ch++) chars.add(ch);
      }
    }
  }
  return chars;
}

const PARTIAL: { file: string; rule: () => Promise<RegExp> }[] = [
  { file: "greatvibes/GreatVibes-Regular.woff2", rule: async () => (await import("@/templates/themes/natural/kit")).MISSING_IN_SCRIPT },
  { file: "marckscript/MarckScript-Regular.woff2", rule: async () => (await import("@/templates/themes/ipak-romol/style")).MISSING_IN_SCRIPT },
];

describe("шрифты", () => {
  const fonts = usedFonts();

  it("Google Fonts по сети не подключаются нигде", () => {
    for (const f of [...sources("app"), ...sources("templates"), ...sources("lib")]) {
      const text = readFileSync(f, "utf8");
      expect(/next\/font\/google|fonts\.googleapis\.com|fonts\.gstatic\.com/.test(text), f).toBe(false);
    }
  });

  it("код ссылается на локальные шрифты, все файлы на месте", () => {
    expect(fonts.length).toBeGreaterThan(10);
    for (const f of fonts) expect(statSync(f).size, f).toBeGreaterThan(1000);
  });

  it.each(usedFonts().filter((f) => !PARTIAL.some((p) => f.endsWith(p.file))))("%s: кириллица, ў қ ғ ҳ и казахские ә ғ қ ң ө ұ ү һ і", (file) => {
    const have = fontChars(file);
    const missing = [...(BASIC + UZ + KK)].filter((ch) => !have.has(ch.codePointAt(0)!));
    expect(missing.join(" "), file).toBe("");
  });

  // Рукописные акценты без части букв: слово с такой буквой дизайн набирает другим шрифтом (проверяем правило)
  it.each(PARTIAL)("$file: недостающие буквы закрыты запасным шрифтом дизайна", async ({ file, rule }) => {
    const have = fontChars(fonts.find((f) => f.endsWith(file))!);
    const missing = [...(UZ + KK)].filter((ch) => !have.has(ch.codePointAt(0)!));
    const re = await rule();
    for (const ch of missing) expect(re.test(ch), `${file}: ${ch}`).toBe(true);
    for (const ch of BASIC) expect(have.has(ch.codePointAt(0)!), `${file}: ${ch}`).toBe(true);
  });

  it("Ипак рўмол: казахское «және» — не рукописным Marck Script", async () => {
    const { MISSING_IN_SCRIPT } = await import("@/templates/themes/ipak-romol/style");
    expect(MISSING_IN_SCRIPT.test("және")).toBe(true);
    expect(MISSING_IN_SCRIPT.test("ва")).toBe(false);
    expect(MISSING_IN_SCRIPT.test("и")).toBe(false);
  });
});
