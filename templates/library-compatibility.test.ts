import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { existsSync, readFileSync } from "node:fs";
import cohort from "@/docs/reviews/library/manifest.json";
import { getDesign, activeDesigns, ACCEPTED, CATALOG_ORDER, PRICES } from "./registry";
import { ON_SALE_IDS } from "./catalog";
import { loadOrderDesign } from "./order-design";
import { photoStepFor } from "@/bot/flow/steps-photo";
import { longSamples } from "@/lib/samples";
import type { InvitationData } from "@/lib/types";
vi.mock("next/font/local", () => ({ default: () => ({ variable: "font-test" }) }));
const own = [
  "https://example.com/own-1.webp",
  "https://example.com/own-2.webp",
  "https://example.com/own-3.webp",
  "https://example.com/ignored.webp",
];
describe("9-template future bot/order compatibility", () => {
  it("preserves accepted catalogue/price contracts and keeps every new identity unlisted", () => {
    expect(cohort).toHaveLength(9);
    expect(new Set(cohort.map((x) => x.id)).size).toBe(9);
    expect(activeDesigns().map((d) => d.id)).toEqual([...ON_SALE_IDS]);
    expect(PRICES).toEqual({ animated: 8000, scroll: 6000, simple: 5000 });
    for (const row of cohort) {
      const d = getDesign(row.id)!;
      expect(d.occasion).toBe(row.occasion);
      expect(d.format).toBe(row.format);
      expect(Boolean(d.clientPhotos)).toBe(row.clientPhotos);
      expect(ACCEPTED.has(d.id)).toBe(ON_SALE_IDS.includes(d.id));
      expect(Object.values(CATALOG_ORDER).flat().includes(d.id)).toBe(ON_SALE_IDS.includes(d.id));
    }
  });
  it("provides every web, Telegram JPEG, thumbnail and private-data-free OG asset before future activation", () => {
    for (const row of cohort) {
      const d = getDesign(row.id)!;
      for (const path of [
        `public${d.cover}`,
        `public/covers/${d.id}.jpg`,
        `public/covers/thumb/${d.id}.webp`,
        `public/og/${d.id}.jpg`,
        `public${d.art}`,
      ]) {
        expect(existsSync(path), path).toBe(true);
        expect(readFileSync(path).length, path).toBeGreaterThan(100);
      }
    }
  });
  for (const row of cohort) {
    it(`${row.id}: keeps the main bot photo step aligned with rendering and order versions`, async () => {
      const d = getDesign(row.id)!,
        fake = { s: { templateId: d.id }, deps: { savePhoto: async () => own[0] } } as unknown as Parameters<
          typeof photoStepFor
        >[0];
      expect(photoStepFor(fake)).toBe(row.clientPhotos);
      expect(photoStepFor({ ...fake, deps: { ...fake.deps, savePhoto: undefined } })).toBe(false);
      const data: InvitationData = {
        ...d.sample,
        photos: own,
        noMusic: true,
        langs: ["ru"],
        designVersion: "premium-v1",
      };
      const { default: Design } = await loadOrderDesign(d, data.designVersion);
      const html = renderToStaticMarkup(createElement(Design, { data, mode: "full" }));
      expect(html).not.toContain("data-watermark");
      expect(html).not.toContain(own[3]);
      for (const src of own.slice(0, 3)) expect(html.includes(`src="${src}"`)).toBe(row.clientPhotos);
      const preview = renderToStaticMarkup(createElement(Design, { data, mode: "demo" }));
      expect(preview).toContain("data-watermark");
      expect(preview).not.toContain("data-music-button");
    });
    it(`${row.id}: accepts the main order shape, 600 characters and every supplied event`, async () => {
      const d = getDesign(row.id)!,
        data: InvitationData = {
          ...longSamples[d.occasion],
          customText: "Ўзбекча: ў қ ғ ҳ. Қадрдонларимизга меҳр ва эҳтиром билан. ".repeat(20).slice(0, 600),
          customTexts: { ru: "Русский текст для гостей. ".repeat(24).slice(0, 600) },
          noMusic: true,
          langs: ["ru"],
        };
      const { default: Design } = await loadOrderDesign(d);
      const events = JSON.stringify(data.events);
      const html = renderToStaticMarkup(createElement(Design, { data, mode: "full" })),
        plain = html
          .replace(/<[^>]*>/g, " ")
          .replaceAll(" ", " ")
          .replace(/\s+/g, " ");
      expect(plain).toContain(data.customText!.trim());
      for (const e of data.events) {
        expect(plain).toContain(e.venueName);
        expect(plain).toContain(e.address);
      }
      expect(html.match(/href="https:\/\/2gis.kz/g) ?? []).toHaveLength(data.events.length);
      expect(JSON.stringify(data.events)).toBe(events);
    });
  }
});
