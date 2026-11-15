import { it, expect, vi, afterEach } from "vitest";
vi.mock("next/font/local", () => ({ default: () => ({ variable: "fixture-font" }) }));
vi.mock("@/bot/deps", () => ({
  createBotDeps: () => {
    throw Error("Must not construct live dependencies in Preview");
  },
}));
vi.mock("@/bot/repo-pg", () => ({
  PgRepo: class {
    constructor() {
      throw Error("Must not connect Preview to live DB");
    }
  },
}));
afterEach(() => vi.unstubAllEnvs());
for (const [name, load] of [
  ["bot", () => import("@/app/api/bot/route")],
  ["cron", () => import("@/app/api/cron/route")],
  ["app", () => import("@/app/api/app/route")],
  ["upload", () => import("@/app/api/app/upload/route")],
  ["rsvp", () => import("@/app/api/rsvp/route")],
] as const)
  it(`Preview ${name}: no mutation, credential read or live dependency construction`, async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    const { POST } = await load();
    expect(
      (await POST(new Request("https://fixture.invalid/api/" + name, { method: "POST", body: "{}" }))).status,
    ).toBe(404);
  });
