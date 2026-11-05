/**
 * Постер A4: размер, оба QR читаются (в том числе с картинки, уменьшенной вдвое — как фото постера телефоном),
 * PDF — одна страница A4. SAVE_POSTER=1 сохраняет образцы в docs/reviews/poster/.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import jsQR from "jsqr";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { uz } from "@/texts/bot-uz";
import { ru } from "@/texts/bot-ru";
import { POSTER, posterPdf, renderPosterPng } from "./poster";

const BOT = "https://t.me/inviteizi_uz_bot?start=p_abcd2345";
const DEMO = "https://inviteizi.vercel.app/demo/muhr#p=abcd2345";

/** Прочитать QR в области картинки (доли ширины/высоты), scale — уменьшение */
async function read(png: Uint8Array, box: [number, number, number, number], scale = 1) {
  const [x, y, w, h] = box;
  const { data, info } = await sharp(png)
    .extract({ left: Math.round(x * POSTER.width), top: Math.round(y * POSTER.height), width: Math.round(w * POSTER.width), height: Math.round(h * POSTER.height) })
    .resize({ width: Math.round(w * POSTER.width * scale) })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return jsQR(new Uint8ClampedArray(data), info.width, info.height)?.data ?? null;
}

describe("постер A4", () => {
  for (const [lang, tx] of [["uz", uz], ["ru", ru]] as const) {
    it(`${lang}: A4 200 dpi, крупный QR — бот с кодом партнёра, маленький — демо`, async () => {
      const png = await renderPosterPng({ text: tx.role.poster, botUrl: BOT, demoUrl: DEMO, partner: "Салон Малика · Сайрам", minPrice: 5000 });
      const meta = await sharp(png).metadata();
      expect([meta.width, meta.height]).toEqual([POSTER.width, POSTER.height]);
      expect(await read(png, [0.2, 0.3, 0.6, 0.42])).toBe(BOT);
      expect(await read(png, [0.2, 0.3, 0.6, 0.42], 0.5)).toBe(BOT);
      expect(await read(png, [0.7, 0.8, 0.28, 0.18])).toBe(DEMO);
      const pdf = await posterPdf(png);
      const head = Buffer.from(pdf.slice(0, 8)).toString("latin1");
      expect(head).toBe("%PDF-1.4");
      expect(Buffer.from(pdf).toString("latin1")).toContain("/MediaBox [0 0 595.28 841.89]");
      expect(pdf.length).toBeLessThan(3_000_000);
      if (process.env.SAVE_POSTER) {
        const dir = path.join(process.cwd(), "docs/reviews/poster");
        await mkdir(dir, { recursive: true });
        await writeFile(path.join(dir, `poster-${lang}.png`), png);
        await writeFile(path.join(dir, `poster-${lang}.pdf`), pdf);
      }
    }, 30_000);
  }
});
