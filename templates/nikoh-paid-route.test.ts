import { it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactElement } from "react";
import InvitationPage from "@/app/[slug]/page";
const state = vi.hoisted(() => ({ id: "shohona-baxmal" }));
vi.mock("@/templates/design-loaders", () =>
  import("@/templates/testing/sync-design-view").then((m) => m.syncDesignViews()),
);
vi.mock("next/font/local", () => ({ default: () => ({ variable: "font" }) }));
vi.mock("@/lib/orders", () => ({
  currentSlugFor: async () => null,
  getInvitationBySlug: async () => {
    const { getDesign } = await import("./registry");
    return {
      mode: "full",
      order: { status: "active", templateId: state.id },
      data: { ...getDesign(state.id)!.sample, noMusic: true, langs: ["ru"] },
    };
  },
}));
for (const id of ["shohona-baxmal", "ganch-peshtoq", "visol-hikoya"])
  it(`${id}: actual paid-slug route does not apply the sales filter`, async () => {
    state.id = id;
    const shell = InvitationPage({
      params: Promise.resolve({ slug: "fixture-paid" }),
      searchParams: Promise.resolve({}),
    }) as unknown as { props: { children: { type: (p: unknown) => Promise<ReactElement>; props: unknown } } };
    const content = await shell.props.children.type(shell.props.children.props);
    const html = renderToStaticMarkup(content);
    expect(html).not.toContain("data-watermark");
    expect(html.length).toBeGreaterThan(1000);
  });
