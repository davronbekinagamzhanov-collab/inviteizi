import { describe, expect, it } from "vitest";
import { t } from "@/texts/uz-cyrl";
import { FORMATS, PRICES, getDesign } from "@/templates/registry";
import { ON_SALE } from "@/templates/catalog";
import { designsFor, formatsFor } from "./flow/util";
import { OCCASIONS } from "./flow/steps-order";
import { DESIGN_MODULES } from "@/templates/design-modules";

// Настоящий реестр: тадбирлар, которые бот показывает клиенту, и форматы каждого — без пустых кнопок.

describe("форматы бота × тадбирлар (реальный каталог)", () => {
  it("каждый показанный формат не пуст, у каждого дизайна есть имя, обложка, пример и загрузчик", () => {
    for (const o of OCCASIONS) {
      const shown = formatsFor(o);
      expect(shown.length, `${o}: нет ни одного формата`).toBeGreaterThan(0);
      for (const f of shown) {
        const list = designsFor(o, f);
        expect(list.length, `${o}/${f} пуст`).toBeGreaterThan(0);
        for (const d of list) {
          expect(t.designs[d.id], `${d.id}: нет имени`).toBeTruthy();
          expect(d.cover, `${d.id}: нет обложки`).toBeTruthy();
          expect(d.sample.occasion, `${d.id}: пример другого тадбира`).toBe(o);
          expect(typeof DESIGN_MODULES[d.id]).toBe("function");
        }
      }
      // после батча 3 у каждого тадбира есть все три формата
      expect(shown).toEqual([...FORMATS]);
    }
  });

  it("таблица тадбир × формат совпадает с витриной templates/catalog.ts (сколько дизайнов, сколько с фото клиента)", () => {
    const cell = (list: { clientPhotos?: boolean }[]) =>
      `${list.length}/${list.filter((d) => d.clientPhotos).length}📷`;
    const bot = Object.fromEntries(
      OCCASIONS.map((o) => [o, Object.fromEntries(FORMATS.map((f) => [f, cell(designsFor(o, f))]))]),
    );
    const catalog = Object.fromEntries(
      OCCASIONS.map((o) => {
        const listed = ON_SALE[o].map((id) => getDesign(id)!);
        return [o, Object.fromEntries(FORMATS.map((f) => [f, cell(listed.filter((d) => d.format === f))]))];
      }),
    );
    expect(bot).toEqual(catalog);
    // порядок внутри формата = порядок витрины
    for (const o of OCCASIONS) {
      for (const f of FORMATS) {
        const expected = ON_SALE[o].filter((id) => getDesign(id)!.format === f);
        expect(designsFor(o, f).map((d) => d.id)).toEqual(expected);
      }
    }
    expect(Object.keys(PRICES).sort()).toEqual([...FORMATS].sort());
  });
});
