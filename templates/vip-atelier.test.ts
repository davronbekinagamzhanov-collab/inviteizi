import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ACCEPTED, activeDesigns, getDesign, PRICES } from "./registry";
import { ON_SALE_IDS } from "./catalog";
import { atelierIds, atelierPhotos, latinInitial, partnerInitials } from "./themes/vip-atelier/model";
import { longSamples } from "@/lib/samples";
import { loadDesign } from "@/templates/design-modules";

vi.mock("next/font/local", () => ({ default: () => ({ variable: "test-font" }) }));
const uploads = ["https://example.com/first.webp", "https://example.com/second.webp", "https://example.com/third.webp"];
const orders = {
  "vip-marvarid": ["hero", "greeting", "portrait", "date", "venue", "memory", "program", "blessing", "closing"],
  "vip-bogi-visol": ["hero", "date", "portrait", "greeting", "program", "memory", "venue", "blessing", "closing"],
  "vip-oq-tulpor": ["hero", "greeting", "program", "date", "blessing", "venue", "closing"],
  "vip-umr-ziyosi": ["hero", "greeting", "portrait", "blessing", "date", "program", "venue", "memory", "closing"],
};
describe("VIP atelier data contracts", () => {
  it("uses Latin capitals for Uzbek Cyrillic, Latin and spaced names", () => {
    expect(partnerInitials({ groom: "  Ғайрат", bride: "Ўғилой" })).toEqual(["G", "O"]);
    expect(partnerInitials({ groom: "Шоҳруҳ", bride: "Ma’mura" })).toEqual(["S", "M"]);
    expect(latinInitial("Қодир")).toBe("Q");
    expect(latinInitial()).toBe("");
  });
  it("has three local defaults and replaces each slot independently", () => {
    for (const id of atelierIds.filter((x) => x !== "vip-oq-tulpor")) {
      expect(atelierPhotos({}, id)).toHaveLength(3);
      expect(atelierPhotos({}, id).every((x) => !x.client && x.src.startsWith("/vip/"))).toBe(true);
      expect(atelierPhotos({ photos: [...uploads, "https://example.com/ignored.webp"] }, id).map((x) => x.src)).toEqual(
        uploads,
      );
      const partial = atelierPhotos({ photos: [uploads[0]] }, id);
      expect(partial[0].client).toBe(true);
      expect(partial[1].client).toBe(false);
      expect(partial[2].client).toBe(false);
    }
  });
  it("never uses a customer photo for the immutable sunnat portrait", () => {
    expect(atelierPhotos({ photos: uploads }, "vip-oq-tulpor")).toEqual(atelierPhotos({}, "vip-oq-tulpor"));
    expect(atelierPhotos({}, "vip-oq-tulpor")).toHaveLength(1);
  });
  it("keeps the accepted catalogue and prices unchanged", () => {
    for (const id of atelierIds) expect(ACCEPTED.has(id)).toBe(ON_SALE_IDS.includes(id));
    expect(activeDesigns().map((d) => d.id)).toEqual([...ON_SALE_IDS]);
    expect(PRICES).toEqual({ animated: 8000, scroll: 6000, simple: 5000 });
  });
});
for (const id of atelierIds)
  describe(id, () => {
    it("renders its own structure with real event data, maps and a single use of each photo", async () => {
      const d = getDesign(id)!;
      const { default: Design } = await loadDesign(d);
      const html = renderToStaticMarkup(
        createElement(Design, { data: { ...d.sample, photos: uploads, noMusic: true }, mode: "full" }),
      );
      expect([...html.matchAll(/data-vip-section="([^"]+)"/g)].map((x) => x[1])).toEqual(orders[id]);
      expect(html).toContain("data-atelier-opening=");
      expect(html).toContain('aria-current="date"');
      expect(html).not.toMatch(/data-vip-sheet|hall-[12]\.webp|dress-code|drеss/);
      const expected = id === "vip-oq-tulpor" ? 1 : 3;
      expect(html.match(/data-vip-photo-slot=/g) ?? []).toHaveLength(expected);
      for (const src of uploads)
        expect(html.match(new RegExp(`src="${src}"`, "g")) ?? []).toHaveLength(id === "vip-oq-tulpor" ? 0 : 1);
      for (const ev of d.sample.events) {
        expect(html).toContain(ev.address);
        expect(html).toContain(ev.venueName);
        expect(html).toContain(ev.time);
      }
      expect(html).toContain("https://2gis.kz/geo/");
      expect(d.clientPhotos).toBe(id !== "vip-oq-tulpor");
      if (d.occasion === "nikoh") expect(html).toContain('aria-label="A M"');
      if (d.occasion === "yubiley") expect(html).toContain(String(d.sample.age));
    });
    it("renders long names and all three order events without inventing milestones", async () => {
      const d = getDesign(id)!;
      const { default: Design } = await loadDesign(d);
      const data = longSamples[d.occasion];
      const html = renderToStaticMarkup(createElement(Design, { data: { ...data, noMusic: true }, mode: "full" }));
      expect(html.match(/<time /g) ?? []).toHaveLength(3);
      expect(html.replaceAll(" ", " ")).toContain(data.hosts.replaceAll(" ", " "));
    });
  });
