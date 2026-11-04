import { describe, expect, it } from "vitest";
import { t } from "@/texts/uz-cyrl";
import { FORMATS, PRICES } from "@/templates/registry";
import { designsFor, formatsFor } from "./flow/util";
import { OCCASIONS } from "./flow/steps-order";

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
          expect(typeof d.load).toBe("function");
        }
      }
      // после батча 3 у каждого тадбира есть все три формата
      expect(shown).toEqual([...FORMATS]);
    }
  });

  it("таблица тадбир × формат (сколько дизайнов, сколько с фото) — снимок каталога", () => {
    const table = Object.fromEntries(
      OCCASIONS.map((o) => [o, Object.fromEntries(FORMATS.map((f) => { const l = designsFor(o, f); return [f, `${l.length}/${l.filter((d) => d.clientPhotos).length}📷`]; }))]),
    );
    expect(table).toMatchSnapshot();
    expect(Object.keys(PRICES).sort()).toEqual([...FORMATS].sort());
  });
});
