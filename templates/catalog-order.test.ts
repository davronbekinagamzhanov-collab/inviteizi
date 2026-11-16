/** Порядок каталога: решение владельца 15.11.2026 — новые дизайны сверху, прежние ниже в прежнем порядке */
import { describe, expect, it } from "vitest";
import { activeDesigns, CATALOG_ORDER, getDesign, PRICES } from "./registry";
import type { Occasion } from "@/lib/types";

const OCCASIONS: Occasion[] = ["nikoh", "sunnat", "nahorgi", "yubiley"];
const list = (o: Occasion) => activeDesigns().filter((d) => d.occasion === o);

/** Порядок до 15.11.2026 (06.11 — юбилей: два последних подняты наверх) */
const PREVIOUS: Record<Occasion, string[]> = {
  nikoh: [
    "muhr",
    "ipak",
    "gul-doira",
    "suzani-medalyon",
    "suvbuyoq-tuman",
    "suvbuyoq-zumrad",
    "suvbuyoq-upa",
    "nur-varaq",
    "girih-barg",
    "oq-maktub",
    "xotira-albom",
    "muhrli-maktub",
    "ipak-albom",
    "oltin-monogramma",
    "sapfir",
  ],
  sunnat: ["ganch-darvoza", "bog", "lola-medalyon", "lola-bodom", "doppi-kitob", "doppicha"],
  nahorgi: ["qozon-tongi", "tong-dasturxon", "non-albom", "tonggi-piyola", "tong-varaq", "choy-maktub"],
  yubiley: ["umr-daraxti", "bordo-guldasta", "zarhal-lavha", "umr-kitobi", "hurmat-maktub", "pion-guldasta"],
};
const NEW_FIRST: Record<Occasion, string[]> = {
  nikoh: [
    "vip-zarrin-ahd",
    "vip-marvarid",
    "vip-zarbof",
    "vip-bogi-visol",
    "vip-ipak-ziyosi",
    "vip-visol-nuri",
    "vip-tilla-muhr",
    "vip-osmon",
    "vip-suzana",
  ],
  sunnat: ["vip-oq-tulpor", "zarhal-duo", "moviy-ayvon", "tulpor-quvonchi", "kashta-tilagi"],
  nahorgi: ["sahar-sabosi", "subhi-safo", "bog-nasimi", "tong-naqshi"],
  yubiley: ["vip-umr-ziyosi", "umr-durdonasi", "qadr-surati"],
};

describe("порядок каталога", () => {
  it("каждый дизайн в продаже стоит в своём списке, чужих тадбиров нет", () => {
    for (const d of activeDesigns()) expect(CATALOG_ORDER[d.occasion]).toContain(d.id);
    for (const o of OCCASIONS)
      for (const id of CATALOG_ORDER[o]) {
        const d = getDesign(id);
        if (d) expect(d.occasion).toBe(o);
      }
  });

  it("15.11.2026: сначала новые в заданном порядке, затем прежние в прежнем порядке", () => {
    for (const o of OCCASIONS) expect(list(o).map((d) => d.id)).toEqual([...NEW_FIRST[o], ...PREVIOUS[o]]);
  });

  it("в каждом тадбире есть дизайны всех трёх цен", () => {
    for (const o of OCCASIONS) {
      const prices = new Set(list(o).map((d) => PRICES[d.format]));
      expect([...prices].sort(), o).toEqual([2990, 4990, 7990]);
    }
  });
});
