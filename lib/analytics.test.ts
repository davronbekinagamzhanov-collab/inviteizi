import { describe, it, expect } from "vitest";
import { summarize, periodStart, type AnalyticsInput, type MetricOrder } from "./analytics";
const now = new Date("2026-10-25T12:00:00Z");
const base: MetricOrder = { id: "a", userId: 1, status: "active", templateId: "oq-ot", occasion: "sunnat", format: "animated", amount: 10000, createdAt: now, paidAt: now, updatedAt: now, music: { kind: "list", musicId: "hidden-track" } };
const input = (orders: MetricOrder[]): AnalyticsInput => ({ orders, users: [{ id: 1, username: "buyer", firstName: "Имя", createdAt: now }], events: [], since: new Date("2026-10-24T00:00:00Z"), music: [{ id: "hidden-track", titleRu: "Скрытый трек", titleUz: "Яширин куй" }] });
describe("analytics financial truth", () => {
  it("calendar boundaries use Almaty; seven days include today", () => {
    expect(periodStart("today", now).toISOString()).toBe("2026-10-24T19:00:00.000Z");
    expect(periodStart("week", now).toISOString()).toBe("2026-10-18T19:00:00.000Z");
    expect(periodStart("month", now).toISOString()).toBe("2026-09-25T19:00:00.000Z");
  });
  it("only active and archived paid orders contribute, each once", () => {
    const s = summarize(input([base, { ...base, id: "b", status: "archived", amount: 7000 }, { ...base, id: "c", status: "receipt_sent" }, { ...base, id: "d", status: "rejected" }]), "all", now, true);
    expect(s.paid).toBe(2); expect(s.revenue).toBe(17000); expect(s.average).toBe(8500);
    expect(s.waiting).toBe(1); expect(s.rejected).toBe(1); expect(s.repeat).toBe(1);
    expect(s.customers?.[0].paid).toBe(2); expect(s.customers?.[0].name).toBe("@buyer");
    expect(summarize(input([base]), "all", now).customers).toBeUndefined();
  });
  it("music preserves historical hidden IDs, own clients are unique, no music counted separately", () => {
    const s = summarize(input([base, { ...base, id: "b", music: { kind: "own", fileId: "secret" } }, { ...base, id: "c", music: { kind: "own", fileId: "secret" }, status: "preview" }, { ...base, id: "d", music: { kind: "none" } }]), "all", now);
    expect(s.music.find(m => m.id === "hidden-track")).toMatchObject({ orders: 1, paid: 1, titleRu: "Скрытый трек" });
    expect(s.music.find(m => m.id === "own")).toMatchObject({ orders: 2, paid: 1 });
    expect(s.ownMusicClients).toBe(1); expect(s.music.find(m => m.id === "none")?.orders).toBe(1);
    expect(JSON.stringify(s)).not.toContain("secret");
  });
  it("paid date drives period revenue; historical orders do not create funnel events", () => {
    const s = summarize(input([{ ...base, createdAt: new Date("2026-09-01T00:00:00Z") }]), "today", now);
    expect(s.revenue).toBe(10000); expect(s.orders).toBe(0); expect(s.funnel).toEqual({ demos: 0, selections: 0, orders: 0, paid: 0 });
  });
});
