import { describe, it, expect, vi } from "vitest";
import { DESIGN_MODULES, LEGACY_MODULES } from "./design-modules";
vi.mock("next/font/local", () => ({ default: () => ({ variable: "font" }) }));
import { monogram, initial } from "./themes/premium/monogram";
import { usesLegacyDesign, loadOrderDesign } from "./order-design";
import type { Design } from "./registry";
describe("premium monograms", () => {
  it.each([
    ["Давронбек", "Нозима", "D & N"],
    ["  💐 Қодир", "Ўғилой", "Q & O"],
    ["Ғани", "Ҳалима", "G & H"],
    ["Élodie", "John", "E & J"],
    ["---", "123", "♡"],
    [undefined, "Нозима", "N"],
    ["ьЪШоҳ", "Чарос", "S & C"],
  ])("%s + %s", (a, b, want) => expect(monogram(a, b)).toBe(want));
  it("never manufactures initials from missing data", () => expect(initial("123 💍")).toBe(""));
});
describe("order appearance preservation", () => {
  for (const id of ["kabutar-salom", "yelpigich-ziynat", "samarqand-kitob", "qosh-uzuk", "saodat-kaliti"]) {
    it(`${id}: absent version preserves all old orders, regardless of status`, () => {
      expect(usesLegacyDesign(id)).toBe(true);
      expect(usesLegacyDesign(id, "premium-v1")).toBe(false);
    });
  }
  it("leaves other designs alone", () => expect(usesLegacyDesign("sapfir")).toBe(false));
  it("loads new design only with explicit opt-in", async () => {
    const design = { id: "kabutar-salom" } as Design;
    const [now, old] = await Promise.all([DESIGN_MODULES["kabutar-salom"](), LEGACY_MODULES["kabutar-salom"]()]);
    expect((await loadOrderDesign(design, "premium-v1")).default).toBe(now.default);
    expect((await loadOrderDesign(design)).default).toBe(old.default);
    expect(now.default).not.toBe(old.default);
  });
});
