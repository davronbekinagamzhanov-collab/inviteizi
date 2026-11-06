import { afterEach, expect, it, vi } from "vitest";
import { GET } from "./route";

const { getOrderBySlug } = vi.hoisted(() => ({ getOrderBySlug: vi.fn() }));
vi.mock("@/bot/repo-pg", () => ({ PgRepo: class { getOrderBySlug = getOrderBySlug; } }));
afterEach(() => getOrderBySlug.mockReset());

const order = (status: string) => ({ status, createdAt: new Date(), expiresAt: null, data: { events: [{ date: "2099-01-01" }] } });
const get = (slug: string) => GET(new Request(`https://inviteizi.vercel.app/api/status?slug=${slug}`));

it("НАМУНА до подтверждения → demo; сразу после подтверждения та же ссылка → full, без кэша", async () => {
  getOrderBySlug.mockResolvedValueOnce(order("receipt_sent"));
  const before = await get("aziz-madina");
  expect(await before.json()).toEqual({ mode: "demo" });
  expect(before.headers.get("cache-control")).toContain("no-store");
  getOrderBySlug.mockResolvedValueOnce(order("active"));
  expect(await (await get("aziz-madina")).json()).toEqual({ mode: "full" });
});

it("плохой и чужой адрес: 400 / 404, база не падает наружу", async () => {
  expect((await get("../etc")).status).toBe(400);
  getOrderBySlug.mockResolvedValueOnce(null);
  expect((await get("net-takogo")).status).toBe(404);
  getOrderBySlug.mockRejectedValueOnce(new Error("db"));
  expect((await get("aziz-madina")).status).toBe(503);
});
