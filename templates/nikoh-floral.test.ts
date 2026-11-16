import { it, expect, vi } from "vitest";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getDesign, longSample } from "./registry";
import { mapLink } from "@/lib/map-link";

import InvitationPage from "@/app/[slug]/page";
import { loadDesign } from "@/templates/design-modules";
const paid = vi.hoisted(() => ({ id: "muhr" }));
vi.mock("@/templates/design-loaders", () =>
  import("@/templates/testing/sync-design-view").then((m) => m.syncDesignViews()),
);
vi.mock("next/font/local", () => ({ default: () => ({ variable: "fixture-font" }) }));
vi.mock("@/lib/orders", () => ({
  currentSlugFor: async () => null,
  getInvitationBySlug: async () => {
    const { getDesign, longSample } = await import("./registry");
    return {
      mode: "full",
      order: { status: "active", templateId: paid.id },
      data: { ...longSample(getDesign(paid.id)!), noMusic: true },
    };
  },
}));
const ids = ["girih-barg", "gul-doira", "suvbuyoq-tuman", "suvbuyoq-zumrad", "suvbuyoq-upa"];
for (const id of ids)
  for (const mode of ["demo", "full"] as const)
    for (const count of [1, 2, 3])
      it(`${id}/${mode}: ${count} events, long client fields and maps survive`, async () => {
        const d = getDesign(id)!,
          { default: Design } = await loadDesign(d),
          data = { ...longSample(d), hosts: "Мезбонлар Абдураҳмоновлар оиласи", noMusic: true };
        data.events = data.events.slice(0, count);
        const html = renderToStaticMarkup(createElement(Design, { data, mode })),
          text = html
            .replace(/<[^>]+>/g, "")
            .replace(/&#x27;/g, "'")
            .replace(/\s+/g, " ");
        for (const value of [data.groom, data.bride, data.hosts, data.sides?.groom, data.sides?.bride])
          if (value) expect(text).toContain(value);
        for (const e of data.events) {
          expect(text).toContain(e.venueName);
          expect(text).toContain(e.address);
          expect(html).toContain(mapLink(e));
        }
        expect(html.includes("data-watermark")).toBe(mode === "demo");
        expect(html.includes("data-open=")).toBe(!id.startsWith("suvbuyoq"));
        expect(html).not.toContain("<video");
      });
for (const id of ids)
  it(`${id}: three unique artworks, no unsupported client photos`, async () => {
    const d = getDesign(id)!,
      { default: Design } = await loadDesign(d),
      html = renderToStaticMarkup(
        createElement(Design, {
          data: { ...d.sample, noMusic: true, photos: ["https://example.test/private.jpg"] },
          mode: "full",
        }),
      );
    expect(d.clientPhotos).toBeFalsy();
    expect(html).not.toContain("private.jpg");
    const srcs = [...html.matchAll(/<img[^>]*src="([^"]+)"/g)].map((x) => x[1]);
    expect(srcs.filter((src) => src.includes("/art/floral-polish/")).length).toBe(3);
    expect(new Set(srcs).size).toBe(srcs.length);
  });
for (const id of ids)
  it(`${id}: actual existing paid-slug route still renders full invitation`, async () => {
    paid.id = id;
    const shell = InvitationPage({
      params: Promise.resolve({ slug: "fixture-envelope-paid" }),
      searchParams: Promise.resolve({}),
    }) as unknown as { props: { children: { type: (p: unknown) => Promise<ReactElement>; props: unknown } } };
    const body = await shell.props.children.type(shell.props.children.props),
      html = renderToStaticMarkup(body);
    expect(html).not.toContain("data-watermark");
    expect(html.includes("data-open=")).toBe(!id.startsWith("suvbuyoq"));
    expect(html.length).toBeGreaterThan(1000);
  });

it("formats and prices follow the registry without changing PRICES", async () => {
  const { PRICES } = await import("./registry");
  for (const id of ids) expect(getDesign(id)!.format).toBe(id.startsWith("suvbuyoq") ? "scroll" : "animated");
  expect(PRICES).toEqual({ animated: 7990, scroll: 4990, simple: 2990 });
});

// Preserve the owner's distinct reading paths, rather than allowing one shared section order to return.
for (const [id, order] of [
  ["gul-doira", ["calendar", "program", "map"]],
  ["suvbuyoq-zumrad", ["program", "map", "calendar"]],
  ["suvbuyoq-upa", ["map", "program", "calendar"]],
] as const)
  it(`${id}: keeps its own guest reading order`, async () => {
    const d = getDesign(id)!,
      { default: Design } = await loadDesign(d);
    const html = renderToStaticMarkup(createElement(Design, { data: { ...d.sample, noMusic: true }, mode: "full" }));
    const positions = {
      calendar: html.indexOf('role="img"'),
      program: html.indexOf("data-event="),
      map: html.search(/<a[^>]*href="[^"]*2gis/),
    };
    const actual = order.map((key) => positions[key]);
    expect(actual.every((n) => n >= 0)).toBe(true);
    expect(actual).toEqual([...actual].sort((a, b) => a - b));
  });
