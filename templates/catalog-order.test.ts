/** Порядок каталога: сильнейший 8 000 первым, недорогие рядом, никого не потеряли */
import { describe, expect, it } from "vitest";
import { activeDesigns, CATALOG_ORDER, getDesign, PRICES } from "./registry";
import type { Occasion } from "@/lib/types";

const OCCASIONS: Occasion[] = ["nikoh", "sunnat", "nahorgi", "yubiley"];
const list = (o: Occasion) => activeDesigns().filter((d) => d.occasion === o);

describe("порядок каталога", () => {
  it("каждый дизайн в продаже стоит в своём списке, чужих тадбиров нет", () => {
    for (const d of activeDesigns()) expect(CATALOG_ORDER[d.occasion]).toContain(d.id);
    for (const o of OCCASIONS) for (const id of CATALOG_ORDER[o]) { const d = getDesign(id); if (d) expect(d.occasion).toBe(o); }
  });

  it("первым — дизайн за 8 000 ₸; в никоҳ первые 113 и 114", () => {
    for (const o of OCCASIONS) expect(PRICES[list(o)[0].format]).toBe(8_000);
    expect(list("nikoh").slice(0, 2).map((d) => d.number)).toEqual([113, 114]);
  });

  it("в первых шести есть 5 000 и 6 000 ₸ (никоҳ: 5 000 в первых четырёх, 6 000 — в первых восьми: места 5–7 у «Пятен»)", () => {
    for (const o of ["sunnat", "nahorgi", "yubiley"] as Occasion[]) {
      const prices = list(o).slice(0, 6).map((d) => PRICES[d.format]);
      expect(prices).toContain(5_000);
      expect(prices).toContain(6_000);
    }
    const nikoh = list("nikoh").map((d) => PRICES[d.format]);
    expect(nikoh.slice(0, 4)).toContain(5_000);
    expect(CATALOG_ORDER.nikoh.slice(0, 8).map((id) => getDesign(id)?.format).filter(Boolean).map((f) => PRICES[f!])).toContain(6_000);
  });
});
