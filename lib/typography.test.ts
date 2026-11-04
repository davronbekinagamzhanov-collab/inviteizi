import { describe, expect, it } from "vitest";
import { glueData, glueWords } from "./typography";

const NB = "\u00a0";

describe("склейка слов: «ва / ҳам / билан» не висят", () => {
  it("«ва», «ҳам» — к следующему слову; «билан», «учун» — к предыдущему", () => {
    expect(glueWords("Абдураҳмоновлар ва Нуриддиновлар оилалари")).toBe(`Абдураҳмоновлар ва${NB}Нуриддиновлар оилалари`);
    expect(glueWords("Сиз ҳам келинг")).toBe(`Сиз ҳам${NB}келинг`);
    expect(glueWords("ҳурмат билан, Каримовлар")).toBe(`ҳурмат${NB}билан, Каримовлар`);
    expect(glueWords("тўйи муносабати билан")).toBe(`тўйи муносабати${NB}билан`);
  });
  it("слова внутри других слов не трогает", () => {
    expect(glueWords("Вали Валиев")).toBe("Вали Валиев");
    expect(glueWords("Ҳамида Ҳамроева")).toBe("Ҳамида Ҳамроева");
  });
  it("данные заказа: имена, семьи, свой текст; остальное без изменений", () => {
    const d = glueData({ occasion: "sunnat", person: "Али ва Вали", hosts: "Каримовлар ва Юсуповлар", customText: "Келинг ва кутамиз", sides: { groom: "А ва Б" }, events: [] } as never);
    expect(d.person).toBe(`Али ва${NB}Вали`);
    expect(d.hosts).toBe(`Каримовлар ва${NB}Юсуповлар`);
    expect(d.customText).toBe(`Келинг ва${NB}кутамиз`);
    expect(d.sides?.groom).toBe(`А ва${NB}Б`);
    expect(d.events).toEqual([]);
  });
});
