import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getDesign, ACCEPTED, activeDesigns } from "@/templates/registry";
import { ON_SALE_IDS } from "@/templates/catalog";
import { vipPhotos } from "./themes/vip-tilla-muhr/photos";

vi.mock("next/font/local", () => ({ default: () => ({ variable: "test-font" }) }));
const ids = ["vip-tilla-muhr", "vip-osmon", "vip-suzana"];
const photos = [
  "https://example.com/groom-bride.webp",
  "https://example.com/together.webp",
  "https://example.com/portrait.webp",
];
for (const id of ids)
  describe(id, () => {
    it("uses the three existing ordered customer slots and ignores a fourth image", () => {
      const result = vipPhotos({ photos: [...photos, "https://example.com/extra.webp"] }, id);
      expect(result.map((x) => x?.src)).toEqual(photos);
      expect(result.map((x) => x?.slot)).toEqual([1, 2, 3]);
      expect(result.every((x) => x?.client)).toBe(true);
    });
    it("keeps default photography restrained and never uses a venue as a couple photograph", () => {
      const result = vipPhotos({}, id);
      expect(result.filter(Boolean)).toHaveLength(3);
      expect(result[2]).toBeDefined();
      expect(result[0].src).not.toContain("vip-suzana/hero");
    });
    it("renders each uploaded photograph once, a short split cover, and data-driven map links", async () => {
      const design = getDesign(id)!;
      const { default: Design } = await design.load();
      const html = renderToStaticMarkup(
        createElement(Design, { data: { ...design.sample, photos, noMusic: true }, mode: "full" }),
      );
      expect(html.match(/data-vip-photo-slot=/g) ?? []).toHaveLength(3);
      photos.forEach((src) => expect(html).toContain(`src="${src}"`));
      expect(html).toContain('data-vip-opening="hinged-v4"');
      expect(html).not.toMatch(/data-vip-sheet|hall-[12]\.webp|\/glasses\.webp|\/table\.webp|\/music\.webp/);
      expect(html).toContain("https://2gis.kz/geo/");
      expect(html).toContain('aria-current="date"');
      for (const event of design.sample.events) {
        expect(html).toContain(event.venueName);
        expect(html).toContain(event.address);
      }
      const sections = [...html.matchAll(/data-vip-section="([^"]+)"/g)].map((x) => x[1]);
      expect(sections).toEqual(["hero", "greeting", "date", "program", "venue", "closing"]);
    });
    it("supports customer photo uploads without making the private design purchasable", () => {
      expect(getDesign(id)?.clientPhotos).toBe(true);
      expect(ACCEPTED.has(id)).toBe(ON_SALE_IDS.includes(id));
      expect(activeDesigns().map((d) => d.id)).toEqual([...ON_SALE_IDS]);
    });
  });
