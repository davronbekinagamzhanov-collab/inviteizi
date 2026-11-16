import { describe, expect, it } from "vitest";
import { ON_SALE, ON_SALE_IDS } from "./catalog";
import { templateRows } from "./catalog-rows";
import { existsSync } from "node:fs";
import { ACCEPTED, activeDesigns, CATALOG_ORDER, designs, getDesign, isOnSale, PRICES, thumbOf } from "./registry";
import { t } from "@/texts/uz-cyrl";

// Витрина — единственный источник «что продаётся и в каком порядке». Числа не зашиты: всё сверяется с ней.
describe("витрина templates/catalog.ts", () => {
  it("каждый id существует в реестре, стоит в своём тадбире и встречается один раз", () => {
    expect(new Set(ON_SALE_IDS).size).toBe(ON_SALE_IDS.length);
    for (const [occasion, ids] of Object.entries(ON_SALE)) {
      for (const id of ids) {
        const d = getDesign(id);
        expect(d, `${id}: нет в реестре`).toBeDefined();
        expect(d!.occasion, id).toBe(occasion);
        expect(t.designs[id], `${id}: нет названия`).toBeTruthy();
      }
    }
  });

  it("продажа, порядок каталога и активные дизайны выводятся только из витрины", () => {
    expect([...ACCEPTED]).toEqual([...ON_SALE_IDS]);
    expect(CATALOG_ORDER).toBe(ON_SALE);
    expect(activeDesigns().map((d) => d.id)).toEqual([...ON_SALE_IDS]);
    for (const d of designs) expect(isOnSale(d.id), d.id).toBe(ON_SALE_IDS.includes(d.id));
  });

  it("у каждого дизайна реестра есть название (его можно включить в витрину без пустой кнопки)", () => {
    expect(designs.filter((d) => !t.designs[d.id]).map((d) => d.id)).toEqual([]);
  });

  it("у каждого дизайна реестра есть обложка каталога (webp, миниатюра), JPG для бота и OG-превью ссылки", () => {
    const missing = designs.flatMap((d) =>
      [d.cover, thumbOf(d.cover).split("?")[0], `/covers/${d.id}.jpg`, `/og/${d.id}.jpg`]
        .filter((f) => !existsSync(`public${f}`))
        .map((f) => `${d.id}: ${f}`),
    );
    expect(missing).toEqual([]);
  });

  it("скрытый с замечаниями anor-bogi не в продаже", () => {
    expect(ON_SALE_IDS).not.toContain("anor-bogi");
  });

  it("строки db:seed-templates: все дизайны реестра, в продаже = витрина, цена только по формату, порядок = витрина", () => {
    const rows = templateRows();
    expect(rows.map((r) => r.id).sort()).toEqual(designs.map((d) => d.id).sort());
    expect(
      rows
        .filter((r) => r.is_active)
        .map((r) => r.id)
        .sort(),
    ).toEqual([...ON_SALE_IDS].sort());
    for (const r of rows) expect(r.price, r.id).toBe(PRICES[r.format]);
    const active = rows.filter((r) => r.is_active).sort((a, b) => a.sort - b.sort);
    expect(active.map((r) => r.id)).toEqual([...ON_SALE_IDS]);
    expect(new Set(rows.map((r) => r.number)).size).toBe(rows.length);
  });

  it("отдельной VIP-цены нет: базовые цены форматов прежние", () => {
    expect(PRICES).toEqual({ animated: 8_000, scroll: 6_000, simple: 5_000 });
  });
});
