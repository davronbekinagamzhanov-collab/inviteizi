import { beforeAll, describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { activeDesigns, longSample } from "./registry";
import { t } from "@/texts/uz-cyrl";
import { mapLink } from "@/lib/map-link";
import { loadDesign } from "@/templates/design-modules";
vi.mock("next/font/local", () => ({ default: () => ({ variable: "test-font" }) }));
vi.mock("next/font/google", () => {
  const font = () => ({ variable: "test-font" });
  return {
    Source_Sans_3: font,
    Alegreya: font,
    Alegreya_Sans: font,
    Bitter: font,
    Merriweather: font,
    Piazzolla: font,
    Vollkorn: font,
    Cormorant_Garamond: font,
    PT_Serif: font,
    Playfair: font,
    Cormorant_Unicase: font,
    Source_Serif_4: font,
    PT_Sans: font,
    EB_Garamond: font,
    Noto_Serif: font,
    Noto_Sans: font,
    Gentium_Book_Plus: font,
    Marck_Script: font,
    Viaoda_Libre: font,
    Podkova: font,
  };
});

describe("accepted non-Nikoh designs retain all supplied events and person data", () => {
  // Холодная загрузка шаблонов (motion, шрифты, общий набор) — подготовка, а не время одного теста:
  // иначе её целиком оплачивает первый случай и при параллельном прогоне он не укладывается в лимит
  beforeAll(() => Promise.all(activeDesigns().map((d) => loadDesign(d))), 120_000);
  for (const d of activeDesigns().filter((d) => d.occasion !== "nikoh"))
    for (const mode of ["demo", "full"] as const)
      it(`${d.id} / ${mode}`, async () => {
        const { default: Design } = await loadDesign(d);
        const data = { ...longSample(d), noMusic: true };
        const html = renderToStaticMarkup(createElement(Design, { data, mode }));
        const plain = html
          .replace(/<[^>]*>/g, "")
          .replace(/&#x27;/g, "'")
          .replace(/&quot;/g, '"')
          .replace(/\s+/g, " ");
        expect(plain).toContain(data.person);
        expect(plain).toContain(data.hosts);
        if (data.age) expect(plain).toContain(String(data.age));
        for (const e of data.events) {
          expect(plain).toContain(e.venueName);
          expect(plain).toContain(e.address);
          expect(html).toContain(mapLink(e));
        }
        expect(plain.includes("НАМУНА")).toBe(mode === "demo");
      });
});
describe("every accepted Nikoh design renders both families", () => {
  for (const d of activeDesigns().filter((d) => d.occasion === "nikoh"))
    for (const mode of ["demo", "full"] as const)
      it(`${d.id} / ${mode}`, async () => {
        const { default: Design } = await loadDesign(d);
        // Hosts can differ from both families: do not let an identical fixture hide data loss.
        const data = { ...longSample(d), hosts: "Самандар ва Мавлуда — тўй мезбонлари", noMusic: true };
        const html = renderToStaticMarkup(createElement(Design, { data, mode }));
        expect(html).toContain(t.sides.groom);
        expect(html).toContain(t.sides.bride);
        const plain = html
          .replace(/<[^>]*>/g, "")
          .replace(/&#x27;/g, "'")
          .replace(/\s+/g, " ");
        expect(plain).toContain(data.sides!.groom);
        expect(plain).toContain(data.sides!.bride);
        expect(plain).toContain(data.hosts);
        for (const e of data.events) expect(html).toContain(mapLink(e));
        if (mode === "demo") expect(html).toContain("НАМУНА");
      });
});
describe("Nikoh designs hide family blocks when the client gave none", () => {
  for (const d of activeDesigns().filter((d) => d.occasion === "nikoh"))
    it(d.id, async () => {
      const { default: Design } = await loadDesign(d);
      const data = { ...longSample(d), noMusic: true };
      delete data.sides;
      const html = renderToStaticMarkup(createElement(Design, { data, mode: "full" }));
      expect(html).not.toContain(t.sides.groom);
      expect(html).not.toContain(t.sides.bride);
    });
});
