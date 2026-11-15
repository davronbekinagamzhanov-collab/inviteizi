import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getDesign, ACCEPTED, activeDesigns, PRICES } from "./registry";
import { ON_SALE_IDS } from "./catalog";
import { masterpieceIds, photos, initials } from "./themes/vip-masterpiece/model";
import { luxuryWeddingCopy } from "@/texts/uz-cyrl";
import { parseWeddingDate } from "@/lib/wedding-date";
import { longSamples } from "@/lib/samples";
vi.mock("next/font/local", () => ({ default: () => ({ variable: "font-test" }) }));
const own = ["https://example.com/a.webp", "https://example.com/b.webp", "https://example.com/c.webp"];
describe("bespoke wedding data contracts", () => {
  it("only the cinematic design permits the three client photographs", () => {
    expect(
      photos({ photos: [...own, "https://example.com/ignored.webp"] }, "vip-ipak-ziyosi").map((p) => p.src),
    ).toEqual(own);
    expect(photos({ photos: own }, "vip-zarbof")).toEqual(photos({}, "vip-zarbof"));
    expect(photos({}, "vip-ipak-ziyosi")).toHaveLength(3);
    expect(photos({ photos: [own[0]] }, "vip-ipak-ziyosi").map((p) => p.client)).toEqual([true, false, false]);
    expect(initials({ groom: "Ғайрат", bride: "Ўғилой" })).toEqual(["G", "O"]);
  });
  it("keeps every caption translated and the accepted catalogue unchanged", () => {
    expect(luxuryWeddingCopy("ru").forever).toBe("Два сердца. Одна судьба.");
    expect(Object.keys(luxuryWeddingCopy("ru"))).toEqual(Object.keys(luxuryWeddingCopy("uz")));
    for (const id of masterpieceIds) expect(ACCEPTED.has(id)).toBe(ON_SALE_IDS.includes(id));
    expect(activeDesigns().map((d) => d.id)).toEqual([...ON_SALE_IDS]);
    expect(PRICES).toEqual({ animated: 8000, scroll: 6000, simple: 5000 });
  });
});
for (const id of masterpieceIds)
  describe(id, () => {
    it("has an independent composition with real maps and three correctly sourced images", async () => {
      const d = getDesign(id)!;
      const { default: Design } = await d.load();
      const html = renderToStaticMarkup(
        createElement(Design, { data: { ...d.sample, photos: own, noMusic: true }, mode: "full" }),
      );
      const sections = [...html.matchAll(/data-vip-section="([^"]+)"/g)].map((m) => m[1]);
      expect(sections).toEqual(
        id === "vip-ipak-ziyosi"
          ? ["hero", "greeting", "date", "program", "venue", "memory", "closing"]
          : ["hero", "program", "date", "venue", "greeting", "memory", "closing"],
      );
      expect(html.match(/data-vip-photo-slot=/g) ?? []).toHaveLength(3);
      for (const src of own) expect(html.split(`src="${src}"`).length - 1).toBe(id === "vip-ipak-ziyosi" ? 1 : 0);
      expect(html.match(/href="https:\/\/2gis.kz/g) ?? []).toHaveLength(d.sample.events.length);
      expect(html).toContain('aria-current="date"');
      expect(html).toContain('aria-label="A M"');
      expect(html).not.toMatch(/hall-[12]|data-vip-sheet|dress.code/i);
      expect(d.clientPhotos).toBe(id === "vip-ipak-ziyosi");
      const reception = d.sample.events.find((e) => e.kind === "nikohBazm") ?? d.sample.events[0];
      expect(html).toContain(
        `data-target-at="${parseWeddingDate(reception.date, reception.time).startsAt.toISOString()}"`,
      );
      expect(html.match(/data-count-value/g) ?? []).toHaveLength(4);
      if (id === "vip-zarbof") {
        const date = html.slice(html.indexOf('data-vip-section="date"'), html.indexOf('data-vip-section="venue"'));
        expect(date).toContain('data-wedding-calendar="embroidered-cloth"');
        expect(date).not.toMatch(/<ellipse|<textPath/);
      }
    });
    it("handles long names, custom text and all three real events", async () => {
      const { default: Design } = await getDesign(id)!.load();
      const data = { ...longSamples.nikoh, noMusic: true, customText: "Махсус таклиф матни." };
      const html = renderToStaticMarkup(createElement(Design, { data, mode: "full" }));
      expect(html.match(/<time /g) ?? []).toHaveLength(3);
      expect(html.replaceAll(" ", " ")).toContain(data.customText);
      expect(html).toContain(data.groom);
      expect(html).toContain(data.bride);
    });
  });
