/**
 * Картинка для статуса строится для каждого дизайна в продаже (17.11.2026): 1080×1920, QR ведёт на /<slug>,
 * заголовок «…таклиф қиламиз» на языке приглашения. STATUS_SHEET=<папка> — сохранить PNG для листа примеров.
 */
import { describe, expect, it, vi } from "vitest";
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";
import jsQR from "jsqr";
import { activeDesigns } from "@/templates/registry";
import { statusCaption, statusFields, statusPoster } from "./status-poster";
import type { OrderRecord } from "@/lib/domain";

vi.mock("next/font/local", () => ({ default: () => ({ variable: "fixture-font" }) }));

const order = (id: string, extra: Partial<OrderRecord["data"]> = {}) => {
  const d = activeDesigns().find((x) => x.id === id)!;
  return {
    id: "00000000-0000-4000-8000-000000000000",
    templateId: id,
    occasion: d.occasion,
    data: { ...d.sample, ...extra },
    slug: "aziz-madina",
  } as OrderRecord;
};

describe("картинка для статуса — все дизайны в продаже", () => {
  it("в продаже 54 дизайна", () => expect(activeDesigns().length).toBe(54));
  for (const d of activeDesigns())
    it(`${d.id}: 1080×1920, QR открывает приглашение`, async () => {
      const url = "https://inviteizi.vercel.app/aziz-madina",
        png = await statusPoster(order(d.id), url),
        meta = await sharp(png).metadata();
      expect([meta.width, meta.height]).toEqual([1080, 1920]);
      const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      expect(jsQR(new Uint8ClampedArray(data), info.width, info.height)?.data).toBe(url);
      if (process.env.STATUS_SHEET) {
        await mkdir(process.env.STATUS_SHEET, { recursive: true });
        await writeFile(`${process.env.STATUS_SHEET}/${d.id}.png`, png);
      }
    }, 30000);
});

it("язык приглашения: русская страница → русский заголовок; подпись — одна строка, ссылка, призыв", () => {
  const id = activeDesigns().find((d) => d.occasion === "nikoh")!.id;
  expect(statusFields(order(id)).invite).toBe("Тўйимизга таклиф қиламиз");
  expect(statusFields(order(id, { langs: ["ru"], mainLang: "ru" })).invite).toBe("Приглашаем на нашу свадьбу");
  const cap = statusCaption(order(id), "https://inviteizi.vercel.app/aziz-madina", "Статусга қўйинг").split("\n");
  expect(cap).toHaveLength(3);
  expect(cap[1]).toBe("https://inviteizi.vercel.app/aziz-madina");
  expect(cap[2]).toBe("Статусга қўйинг");
});
