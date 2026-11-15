import { it, expect, vi } from "vitest";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { existsSync } from "node:fs";
import { getDesign, activeDesigns, PRICES, isOnSale, CATALOG_ORDER } from "./registry";
import { ON_SALE_IDS } from "./catalog";
import { longSamples } from "@/lib/samples";
import { mapLink } from "@/lib/map-link";
import { previewData } from "@/lib/preview-data";
import { photoStepFor } from "@/bot/flow/steps-photo";
import InvitationPage from "@/app/[slug]/page";
const paid = vi.hoisted(() => ({ id: "zarhal-duo" }));
vi.mock("next/font/local", () => ({ default: () => ({ variable: "fixture-font" }) }));
vi.mock("@/lib/orders", () => ({
  currentSlugFor: async () => null,
  getInvitationBySlug: async () => {
    const { getDesign } = await import("./registry");
    return {
      mode: "full",
      order: { status: "active", templateId: paid.id },
      data: {
        ...getDesign(paid.id)!.sample,
        noMusic: true,
        photos: [
          "https://photo.test/customer-1.webp",
          "https://photo.test/customer-2.webp",
          "https://photo.test/customer-3.webp",
        ],
      },
    };
  },
}));
const ids = ["zarhal-duo", "moviy-ayvon", "tulpor-quvonchi", "kashta-tilagi"] as const;
const old = CATALOG_ORDER.sunnat;
const own = [1, 2, 3, 4].map((n) => `https://photo.test/customer-${n}.webp`);
it("stages four distinct identities, correct prices and photo contracts without activating or retiring sales", () => {
  expect(PRICES).toEqual({ animated: 8000, scroll: 6000, simple: 5000 });
  expect(activeDesigns().map((d) => d.id)).toEqual([...ON_SALE_IDS]);
  expect(
    activeDesigns()
      .filter((d) => d.occasion === "sunnat")
      .map((d) => d.id),
  ).toEqual(old);
  for (const [id, i] of ids.map((x, i) => [x, i] as const)) {
    const d = getDesign(id)!;
    expect(d.occasion).toBe("sunnat");
    expect(d.format).toBe(["animated", "scroll", "simple", "simple"][i]);
    expect(Boolean(d.clientPhotos)).toBe(id === "tulpor-quvonchi");
    // 15.11.2026: включены в продажу владельцем — сверяемся с витриной
    expect(isOnSale(id)).toBe(ON_SALE_IDS.includes(id));
    expect(Object.values(CATALOG_ORDER).flat().includes(id)).toBe(ON_SALE_IDS.includes(id));
    for (const file of [
      `public${d.art}`,
      `public${d.cover}`,
      `public/covers/${id}.jpg`,
      `public/covers/thumb/${id}.webp`,
      `public/og/${id}.jpg`,
    ])
      expect(existsSync(file), file).toBe(true);
  }
  expect(new Set(ids.map((id) => getDesign(id)!.number)).size).toBe(4);
});
for (const id of ids)
  for (const mode of ["demo", "full"] as const)
    for (const count of [1, 2, 3])
      it(`${id}/${mode}: preserves ${count} events, custom Cyrillic text, hosts and maps`, async () => {
        const d = getDesign(id)!,
          { default: Design } = await d.load(),
          data = {
            ...longSamples.sunnat,
            events: longSamples.sunnat.events.slice(0, count),
            customText: "Ў қ ғ ҳ — меҳр ва эҳтиром билан. ".repeat(24).slice(0, 600),
            noMusic: true,
            langs: ["ru" as const],
          };
        const html = renderToStaticMarkup(createElement(Design, { data, mode })),
          plain = html
            .replace(/<[^>]+>/g, " ")
            .replaceAll(" ", " ")
            .replace(/\s+/g, " ");
        for (const value of [data.person, data.hosts, ...(d.format === "simple" ? [] : [data.customText.trim()])])
          expect(plain).toContain(value);
        expect(html.includes("data-watermark")).toBe(mode === "demo");
        expect(html.includes("data-open=")).toBe(id === "zarhal-duo");
        expect(html.match(/data-event="true"/g)).toHaveLength(count);
        for (const event of data.events) {
          expect(plain).toContain(event.venueName);
          expect(plain).toContain(event.address);
          expect(html).toContain(mapLink(event));
        }
        if (d.format === "simple") {
          expect(html).not.toContain("data-celebration-countdown");
          expect(html).not.toContain("data-calendar-grid");
          expect(html).not.toContain('data-section="letter"');
        }
        expect(html).not.toMatch(/undefined|src="[^"]*\.svg"/);
      });
for (const id of ids)
  it(`${id}: no repeated imagery and only the supported photo slots`, async () => {
    const d = getDesign(id)!,
      { default: Design } = await d.load();
    for (const photos of [undefined, [], [""], own.slice(0, 1), own.slice(0, 2), own, [own[0], own[0], own[1]]]) {
      const html = renderToStaticMarkup(
        createElement(Design, { data: { ...d.sample, photos, noMusic: true }, mode: "full" }),
      );
      const srcs = [...html.matchAll(/<img[^>]*src="([^"]+)"/g)].map((x) => x[1]);
      expect(new Set(srcs).size).toBe(srcs.length);
      for (const src of own.slice(0, 3))
        expect(srcs.includes(src)).toBe(id === "tulpor-quvonchi" && Boolean(photos?.includes(src)));
      expect(html).not.toContain(own[3]);
    }
  });
for (const id of [...old, ...ids])
  it(`${id}: existing/paid route resolves irrespective of catalogue visibility`, async () => {
    paid.id = id;
    const shell = InvitationPage({
      params: Promise.resolve({ slug: "fixture-paid" }),
      searchParams: Promise.resolve({}),
    }) as unknown as { props: { children: { type: (p: unknown) => Promise<ReactElement>; props: unknown } } };
    const html = renderToStaticMarkup(await shell.props.children.type(shell.props.children.props));
    expect(html).not.toContain("data-watermark");
    expect(
      html
        .replace(/<[^>]+>/g, " ")
        .replaceAll(" ", " ")
        .replace(/\s+/g, " "),
    ).toContain(getDesign(id)!.sample.hosts);
    if (ids.includes(id as (typeof ids)[number]))
      for (const src of own.slice(0, 3)) expect(html.includes(src)).toBe(id === "tulpor-quvonchi");
  });
it("retains the same existing photo step and preview-data input contract for future activation", () => {
  for (const id of ids) {
    const fake = { s: { templateId: id }, deps: { savePhoto: async () => own[0] } } as unknown as Parameters<
      typeof photoStepFor
    >[0];
    expect(photoStepFor(fake)).toBe(id === "tulpor-quvonchi");
  }
  const d = getDesign("tulpor-quvonchi")!,
    data = previewData(d.sample, { person: "Муҳаммадали", hosts: "Қодировлар оиласи" }, { photos: own.slice(0, 3) });
  expect(data.photos).toEqual(own.slice(0, 3));
  expect(data.person).toBe("Муҳаммадали");
});
