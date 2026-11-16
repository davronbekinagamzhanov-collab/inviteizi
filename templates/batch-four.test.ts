import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { everAccepted, ACCEPTED, HIDDEN_03_11, designs, getDesign, longSample, PRICES } from "./registry";
import { t } from "@/texts/uz-cyrl";
import { Sim } from "@/bot/testing/sim";
import { startUz, selectCatalogDesign } from "@/bot/testing/paths";
import { catalogList, PAGE } from "@/bot/flow/steps-order";
import { uz } from "@/texts/bot-uz";

const batch = [
  ["oq-chinni", "nahorgi", "simple", 77],
  ["doppicha", "sunnat", "simple", 78],
  ["sayram-hovli", "sunnat", "scroll", 79],
  ["zarvaraq", "yubiley", "simple", 80],
  ["umr-daraxti", "yubiley", "scroll", 81],
] as const;

describe("batch four: exactly five new complete designs", () => {
  it("preserves previous accepted designs and fills five empty category/format cells", () => {
    const previous = everAccepted().filter((d) => d.number <= 81);
    expect(previous).toHaveLength(25);
    expect(designs.filter((d) => d.number <= 81)).toHaveLength(26);
    expect(ACCEPTED.has("anor-bogi")).toBe(false);
    expect(
      previous
        .filter((d) => d.number > 76)
        .map((d) => d.id)
        .sort(),
    ).toEqual(batch.map(([id]) => id).sort());
    for (const [o, counts] of [
      ["nikoh", [4, 1, 6]],
      ["nahorgi", [1, 2, 4]],
      ["sunnat", [1, 1, 2]],
      ["yubiley", [1, 1, 1]],
    ] as const)
      expect(
        ["simple", "scroll", "animated"].map((f) => previous.filter((d) => d.occasion === o && d.format === f).length),
      ).toEqual(counts);
  });
  for (const [id, occasion, format, number] of batch) {
    it(`${id}: accepted identity, covers/OG and genuinely difficult sample data`, async () => {
      const d = getDesign(id)!;
      // umr-daraxti перерисован в коллекции «Юбилей» (PR #19): встроенная иллюстрация есть, загрузки фото клиента нет
      expect(d).toMatchObject({ occasion, format, number, withPhoto: id === "umr-daraxti" });
      expect(Boolean(d.clientPhotos)).toBe(false);
      expect(ACCEPTED.has(id) || HIDDEN_03_11.includes(id)).toBe(true);
      expect(t.designs[id]).toMatch(/[ўқғҳа-я]/i);
      expect(longSample(d).events).toHaveLength(3);
      expect(longSample(d).person!.length).toBeGreaterThan(10);
      expect(longSample(d).events.every((e) => e.location && e.venueName && e.address)).toBe(true);
      expect(await sharp(`public${d.cover}`).metadata()).toMatchObject({ width: 1080, height: 1920, format: "webp" });
      expect(await sharp(`public/covers/${id}.jpg`).metadata()).toMatchObject({
        width: 1080,
        height: 1920,
        format: "jpeg",
      });
      // OG umr-daraxti перевыпущен вместе с коллекцией «Юбилей» (PR #19) в её размере 800×1422
      const og = id === "umr-daraxti" ? { width: 800, height: 1422 } : { width: 420, height: 620 };
      expect(await sharp(`public/og/${id}.jpg`).metadata()).toMatchObject({ ...og, format: "jpeg" });
    });
    it(`${id}: existing bot catalog selects the right component and price (or hides it after 03.11)`, async () => {
      if (!ACCEPTED.has(id)) {
        expect(HIDDEN_03_11).toContain(id);
        expect(getDesign(id)).toBeDefined();
        return;
      }
      const s = new Sim();
      await startUz(s, 17);
      await s.click(17, uz.category[occasion]);
      const list = catalogList({ s: { occasion } }),
        i = list.findIndex((d) => d.id === id);
      for (let k = 0; k < Math.floor(i / PAGE); k++) await s.click(17, "▶");
      expect(
        s.tg
          .to(17)
          .filter((m) => m.type === "photo")
          .some((m) => String(m.media).split("?")[0].endsWith(`/covers/${id}.jpg`)),
      ).toBe(true);
      const line = s
        .lastText(17)
        .split("\n")
        .find((l) => l.includes(`№${getDesign(id)!.number} `))!;
      const sp = (x: string) => x.replace(/[\u00a0\u202f]/g, " ");
      expect(sp(line)).toContain(sp(t.price(PRICES[format])));
      await selectCatalogDesign(s, 17, id);
      expect(await s.user(17)).toMatchObject({ step: "person", state: { templateId: id, format, occasion } });
    });
  }
});
