import { existsSync, readFileSync } from "node:fs";
import { describe, it, expect, vi } from "vitest";
import {
  ACCEPTED,
  activeDesigns,
  designs,
  everAccepted,
  getDesign,
  HIDDEN_NIKOH_POLISH,
  HIDDEN_03_11,
  HIDDEN_BATCH3,
  PRICES,
} from "./registry";
import { photoAttributions } from "@/texts/uz-cyrl";

vi.mock("next/font/local", () => ({ default: () => ({ variable: "test-font" }) }));

describe("catalog acceptance integrity", () => {
  it("after the 03.11 clean-up: 18 designs (12 + «Гулли рамка» 117–122) + batch 3 (123–138) + «Пятно» 139–141; 48 hidden ones stay in code", () => {
    const base = [1, 23, 51, 78, 81, 87, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122];
    const nums = activeDesigns()
      .map((d) => d.number)
      .sort((a, b) => a - b);
    expect(ACCEPTED.size).toBe(activeDesigns().length);
    expect(ACCEPTED.has("anor-bogi")).toBe(false);
    expect(nums.filter((n) => n < 123)).toEqual(base);
    const b3 = nums.filter((n) => n >= 123 && n <= 138);
    expect(b3.length).toBeLessThanOrEqual(16);
    // «Пятно» (v2) 139–141 и новые дизайны после 141 — всё, что после батча 3, берётся из витрины
    expect(nums.filter((n) => n > 138)).toEqual(expect.arrayContaining([139, 140, 141]));
    expect(new Set(nums).size).toBe(nums.length);
    expect(HIDDEN_03_11).toHaveLength(48);
    expect(HIDDEN_BATCH3).toEqual(["islimi-varaq"]);
    expect(nums).not.toContain(131);
    expect(everAccepted()).toHaveLength(48 + HIDDEN_BATCH3.length + nums.length + HIDDEN_NIKOH_POLISH.length);
    expect(activeDesigns()).toHaveLength(ACCEPTED.size);
    for (const id of HIDDEN_03_11) {
      const d = getDesign(id);
      expect(d, id).toBeDefined();
      expect(ACCEPTED.has(id)).toBe(false);
    }
    expect(getDesign("saodat-kaliti")?.number).toBe(106);
    expect(getDesign("kabutar-salom")?.number).toBe(96);
    // Every format the bot offers for an occasion has at least one design (formatsFor hides empty ones)
    for (const occasion of ["nikoh", "nahorgi", "sunnat", "yubiley"] as const) {
      const list = activeDesigns().filter((d) => d.occasion === occasion);
      expect(list.length, occasion).toBeGreaterThan(0);
    }
  });
  it("classifies by functionality and preserves ambiguous tariffs pending owner review", async () => {
    expect(
      everAccepted()
        .filter((d) => d.format === "scroll" && d.number <= 81)
        .map((d) => d.id)
        .sort(),
    ).toEqual(["paxta-gul", "sayram-hovli", "shohona-baxmal", "tonggi-choy", "umr-daraxti"]);
    for (const id of ["sapfir", "ipak-romol", "rishton-koshin", "atirgul"])
      expect(designs.find((d) => d.id === id)?.format).toBe("simple");
    for (const d of everAccepted().filter((d) => d.format === "scroll")) {
      const { createElement } = await import("react");
      const { renderToStaticMarkup } = await import("react-dom/server");
      const { default: Component } = await d.load();
      const html = renderToStaticMarkup(
        createElement(Component, { data: { ...d.sample, noMusic: true }, mode: "full" }),
      );
      expect(html).not.toContain('data-open="');
      for (const event of d.sample.events) expect(html).toContain(event.venueName);
    }
  }, 30000); // рендерит все «варақланадиган» дизайны — на холодную сборку не хватает 5 с
  it("retains required public attribution in each downloadable preview", () => {
    for (const d of everAccepted()) {
      const credit = photoAttributions[d.id];
      if (!credit) continue;
      expect(readFileSync("public/art/CREDITS.md", "utf8")).toContain(credit.source);
      for (const file of [`public${d.cover}`, `public/covers/${d.id}.jpg`, `public/og/${d.id}.jpg`]) {
        const bytes = readFileSync(file);
        expect(bytes.includes(Buffer.from(credit.author)), file).toBe(true);
        expect(bytes.includes(Buffer.from(credit.source)), file).toBe(true);
      }
    }
  });
  it("has unique registered identities and no unknown accepted design", () => {
    expect(new Set(designs.map((d) => d.id)).size).toBe(designs.length);
    expect(new Set(designs.map((d) => d.number)).size).toBe(designs.length);
    for (const id of ACCEPTED)
      expect(
        designs.some((d) => d.id === id),
        id,
      ).toBe(true);
    expect(ACCEPTED.has("anor-bogi")).toBe(false);
    expect(PRICES).toEqual({ animated: 8000, scroll: 6000, simple: 5000 });
  });
  it("only publishes completed code with both bot and web covers and private-data-free OG art", () => {
    const pilots: Record<string, string> = {
      "oltin-monogramma": "OltinMonogramma",
      sapfir: "Sapfir",
      "oq-ot": "OqOt",
      "tonggi-qozon": "TonggiQozon",
      "pion-guldasta": "PionGuldasta",
    };
    for (const d of everAccepted()) {
      const source = readFileSync(`templates/themes/${d.id}/${pilots[d.id] ?? "Design"}.tsx`, "utf8");
      expect(source, d.id).not.toMatch(/ЗАГЛУШКА|дизайн в работе/);
      for (const file of [`public${d.cover}`, `public/covers/${d.id}.jpg`, `public/og/${d.id}.jpg`])
        expect(existsSync(file), file).toBe(true);
      if (d.withPhoto) expect(existsSync(`public${d.art ?? `/art/${d.id}.webp`}`), d.id).toBe(true);
    }
  });
});
