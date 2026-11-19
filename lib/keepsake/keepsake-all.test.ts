/**
 * «Сақлаб олиш» (19.11.2026): фото и PDF для всех дизайнов в продаже.
 *  - размеры: 1080×1920, 1080×1350; A5/A6 300 dpi с полями под обрез 3 мм; PDF — правильный размер и TrimBox;
 *  - QR открывает точную ссылку приглашения (фото и печать);
 *  - длинные имена и 3 тадбира: текст не вылезает из своей зоны и не налезает на QR
 *    (сравнение «с текстом / без текста» показывает, где на картинке текст).
 * KEEPSAKE_SHEET=<папка> — сохранить PNG для листа примеров.
 */
import { describe, expect, it, vi } from "vitest";
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";
import jsQR from "jsqr";
import { PDFDocument } from "pdf-lib";
import { activeDesigns } from "@/templates/registry";
import {
  BLEED_MM,
  canvasSize,
  faceBox,
  faceLayout,
  keepsakeFields,
  keepsakePdf,
  keepsakePng,
  lookOf,
  renderFace,
  SAFE_MM,
} from "./render";
import type { OrderRecord } from "@/lib/domain";
import type { InvitationEvent } from "@/lib/types";

vi.mock("next/font/local", () => ({ default: () => ({ variable: "fixture-font" }) }));

const URL_ = "https://inviteizi.vercel.app/abdurashidxon-gulchehraxon";
const order = (id: string, long = false): OrderRecord => {
  const d = activeDesigns().find((x) => x.id === id)!;
  const ev = d.sample.events[0];
  const events: InvitationEvent[] = long
    ? [
        { ...ev, kind: "nahorgi", time: "06:00", venueName: "«Ширин орзулар ва бахтли ҳаёт» тўйхонаси, Сайрам тумани" },
        { ...ev, venueName: "«Наврўз-Сайрам» ресторани ва тўйхонаси, Амир Темур кўчаси" },
        { ...ev, kind: "kelinSalom", time: "19:30", venueName: "Абдурашидовлар хонадони, Қорабулоқ қишлоғи" },
      ]
    : d.sample.events;
  return {
    id: "00000000-0000-4000-8000-000000000000",
    number: 120,
    templateId: id,
    occasion: d.occasion,
    format: d.format,
    status: "active",
    data: long
      ? {
          ...d.sample,
          groom: "Абдурашидхон Нуриддинович",
          bride: "Гулчеҳрахон Абдумажидовна",
          person: "Муҳаммадаминжон Абдурашидович",
          hosts: "Абдурашидовлар ва Нуриддиновлар оиласи",
          events,
        }
      : d.sample,
    slug: "abdurashidxon-gulchehraxon",
  } as unknown as OrderRecord;
};

async function qrOf(png: Uint8Array | Buffer) {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return jsQR(new Uint8ClampedArray(data), info.width, info.height)?.data;
}

/** Где текст: пиксели, которые меняются, когда текст становится невидимым */
async function textPixels(o: OrderRecord, W: number) {
  const [a, b] = await Promise.all([
    renderFace(o, URL_, W, "uz").then((x) => sharp(x).raw().toBuffer({ resolveWithObject: true })),
    renderFace(o, URL_, W, "uz", { hideText: true }).then((x) => sharp(x).raw().toBuffer()),
  ]);
  const { data, info } = a;
  const H = info.height,
    ch = info.channels;
  const at = (x: number, y: number) => {
    const i = (y * W + x) * ch;
    return Math.abs(data[i] - b[i]) + Math.abs(data[i + 1] - b[i + 1]) + Math.abs(data[i + 2] - b[i + 2]) > 60;
  };
  return { at, H };
}

const designs = activeDesigns();

describe("«Сақлаб олиш» — фото и печать всех дизайнов в продаже", () => {
  it("в продаже 54 дизайна, у каждого есть снятый вид (подложка, цвета, шрифты)", () => {
    expect(designs.length).toBe(54);
    for (const d of designs) expect(lookOf(d.id).namesFont, d.id).toBeTruthy();
  });

  for (const d of designs)
    it(`${d.id}: фото 9:16 и 4:5, печать A6 — размеры и QR`, async () => {
      const o = order(d.id);
      for (const kind of ["story", "feed", "a6"] as const) {
        const png = await keepsakePng(o, URL_, kind);
        const meta = await sharp(png).metadata();
        const { w, h } = canvasSize(kind);
        expect([meta.width, meta.height], kind).toEqual([w, h]);
        if (kind !== "feed") expect(await qrOf(png), `${d.id} ${kind}`).toBe(URL_);
        if (process.env.KEEPSAKE_SHEET) {
          await mkdir(process.env.KEEPSAKE_SHEET, { recursive: true });
          await writeFile(`${process.env.KEEPSAKE_SHEET}/${d.id}-${kind}.png`, png);
        }
      }
    }, 60_000);

  for (const d of designs)
    it(`${d.id}: длинные имена и 3 тадбира — текст в своей зоне, не на QR`, async () => {
      const o = order(d.id, true);
      const W = 540;
      const L = faceLayout(lookOf(d.id), keepsakeFields(o, "uz"), W);
      const { at, H } = await textPixels(o, W);
      const qrTop = Math.round(H * 0.805);
      const pad = 3;
      let outside = 0,
        firstOutside = "";
      for (let y = 0; y < qrTop - 2; y++)
        for (let x = 0; x < W; x++) {
          if (!at(x, y)) continue;
          const inBox = x >= L.box.left - pad && x <= L.box.right + pad && y >= L.box.top - pad && y <= L.box.bottom + pad;
          if (!inBox) {
            outside++;
            firstOutside ||= `${x},${y}`;
          }
        }
      expect(outside, `${d.id}: текст вне зоны (первый пиксель ${firstOutside}), шкала ${L.scale}`).toBe(0);
      expect(L.scale, d.id).toBeGreaterThanOrEqual(0.42);
      // три тадбира все на месте
      expect(keepsakeFields(o, "uz").events).toHaveLength(3);
    }, 60_000);
});

describe("PDF для печати", () => {
  const pt = (mm: number) => (mm / 25.4) * 72;
  for (const kind of ["a5", "a6"] as const)
    it(`${kind.toUpperCase()}: страница = формат + 3 мм под обрез, TrimBox = формат, QR читается`, async () => {
      const d = designs.find((x) => x.format === "animated")!;
      const bytes = await keepsakePdf(order(d.id, true), URL_, kind);
      const doc = await PDFDocument.load(bytes);
      expect(doc.getPageCount()).toBe(1);
      const page = doc.getPage(0);
      const size = kind === "a5" ? { w: 148, h: 210 } : { w: 105, h: 148 };
      expect(page.getWidth()).toBeCloseTo(pt(size.w + 2 * BLEED_MM), 1);
      expect(page.getHeight()).toBeCloseTo(pt(size.h + 2 * BLEED_MM), 1);
      const trim = page.getTrimBox();
      expect(trim.x).toBeCloseTo(pt(BLEED_MM), 1);
      expect(trim.width).toBeCloseTo(pt(size.w), 1);
      expect(trim.height).toBeCloseTo(pt(size.h), 1);
      // 300 dpi: картинка страницы по размеру с полями
      const { w, h } = canvasSize(kind);
      expect(w).toBe(Math.round(((size.w + 6) / 25.4) * 300));
      expect(h).toBe(Math.round(((size.h + 6) / 25.4) * 300));
      // всё содержимое (лицо приглашения) — внутри безопасной зоны: обрез + 5 мм
      const box = faceBox(kind);
      const safe = Math.round(((BLEED_MM + SAFE_MM) / 25.4) * 300);
      expect(box.x).toBeGreaterThanOrEqual(safe - 1);
      expect(box.y).toBeGreaterThanOrEqual(safe - 1);
      expect(box.x + box.w).toBeLessThanOrEqual(w - safe + 1);
      expect(box.y + box.h).toBeLessThanOrEqual(h - safe + 1);
      expect(bytes.length).toBeLessThan(8 * 1024 * 1024);
      const png = await keepsakePng(order(d.id), URL_, kind);
      expect(await qrOf(png)).toBe(URL_);
    }, 60_000);

  it("русская страница — подписи по-русски, «Онлайн-приглашение»", () => {
    const d = designs[0];
    const o = order(d.id);
    const f = keepsakeFields({ ...o, data: { ...o.data, mainLang: "ru" } } as OrderRecord, "ru");
    expect(f.online).toBe("Онлайн-приглашение");
    expect(keepsakeFields(o, "uz").online).toBe("Онлайн таклифнома");
  });

  it("чужой адрес в QR не принимается", async () => {
    const o = order(designs[0].id);
    await expect(keepsakePng(o, "https://evil.example/abdurashidxon-gulchehraxon", "story")).rejects.toThrow();
    await expect(keepsakePng(o, `${URL_}?x=1`, "story")).rejects.toThrow();
  });
});
