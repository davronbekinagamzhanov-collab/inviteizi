import { it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { getDesign, isOnSale, activeDesigns, everAccepted, PRICES } from "./registry";
import { loadOrderDesign } from "./order-design";
import { longSamples } from "@/lib/samples";
import { loadDesign } from "@/templates/design-modules";
vi.mock("next/font/local", () => ({ default: () => ({ variable: "font" }) }));
for (const id of ["shohona-baxmal", "ganch-peshtoq", "visol-hikoya"])
  it(`${id}: retired from sales, paid fixture still renders`, async () => {
    expect(isOnSale(id)).toBe(false);
    expect(activeDesigns().some((d) => d.id === id)).toBe(false);
    expect(everAccepted().some((d) => d.id === id)).toBe(true);
    const d = getDesign(id)!;
    const { default: Design } = await loadOrderDesign(d);
    expect(
      renderToStaticMarkup(createElement(Design, { data: { ...d.sample, noMusic: true }, mode: "full" })),
    ).toContain(d.sample.groom);
  });
for (const id of ["oq-maktub", "suzani-medalyon"])
  it(`${id}: compact direct Simple preserves order fields`, async () => {
    const d = getDesign(id)!;
    expect(d.format).toBe("simple");
    expect(PRICES[d.format]).toBe(5000);
    const { default: Design } = await loadOrderDesign(d);
    const html = renderToStaticMarkup(
      createElement(Design, { data: { ...longSamples.nikoh, noMusic: true }, mode: "full" }),
    );
    expect(html).toContain('data-opened="true"');
    expect(html).toContain("data-simple-card");
    expect(html).not.toMatch(/data-count|data-open=|data-reveal|data-section/);
    expect(html.match(/data-card-event/g) ?? []).toHaveLength(3);
    for (const e of longSamples.nikoh.events) expect(html).toContain(e.venueName);
  });

for (const id of ["shohona-baxmal", "ganch-peshtoq", "visol-hikoya"])
  it(`${id}: new Mini App/API order is rejected before persistence`, async () => {
    const { submitDraft } = await import("@/bot/app/service");
    expect(
      await submitDraft(
        {} as Parameters<typeof submitDraft>[0],
        { id: 1 } as Parameters<typeof submitDraft>[1],
        { templateId: id } as Parameters<typeof submitDraft>[2],
      ),
    ).toEqual({ error: "design" });
  });
it("retains all three customer photo slots only for the photo design", async () => {
  const photos = ["/photos/one.webp", "/photos/two.webp", "/photos/three.webp"];
  for (const id of ["oq-maktub", "suzani-medalyon"]) {
    const d = getDesign(id)!,
      { default: Design } = await loadDesign(d);
    const html = renderToStaticMarkup(
      createElement(Design, { data: { ...d.sample, photos, noMusic: true }, mode: "full" }),
    );
    for (const src of photos) expect(html.includes(`src="${src}"`)).toBe(id === "suzani-medalyon");
  }
});
it("suzani art revision uses a coherent new set, retaining partial customer replacements", async () => {
  const d = getDesign("suzani-medalyon")!,
    { default: Design } = await loadDesign(d);
  const html = renderToStaticMarkup(createElement(Design, { data: { ...d.sample, noMusic: true }, mode: "full" }));
  for (const slot of [1, 2, 3]) expect(html).toContain(`/art/suzani-medalyon/${slot}.webp`);
  expect(html).not.toMatch(/b3-suzani|w-peony-garden|x-roses-vase/);
  const own = renderToStaticMarkup(
    createElement(Design, { data: { ...d.sample, noMusic: true, photos: ["/own.webp"] }, mode: "full" }),
  );
  expect(own).toContain('src="/own.webp"');
  expect(own).toContain("/art/suzani-medalyon/2.webp");
  expect(own).toContain("/art/suzani-medalyon/3.webp");
});
