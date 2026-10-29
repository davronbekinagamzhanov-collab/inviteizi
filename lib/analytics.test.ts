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

describe("owner report periods and dimensions", () => {
  it("always includes all four sales categories and three formats", () => {
    const s = summarize(input([]), "all", now);
    expect(s.categories.map(c => c.id)).toEqual(["nikoh", "nahorgi", "sunnat", "yubiley"]);
    expect(s.formats.map(f => f.id)).toEqual(["simple", "scroll", "animated"]);
    expect(s.categories.every(c => c.paid === 0 && c.revenue === 0)).toBe(true);
    expect(s.formats.every(f => f.share === 0)).toBe(true);
  });
  it("keeps financial totals separate from activity and creation dates; shares use payments", () => {
    const i = input([
      {...base, amount: 5000, format: "simple", occasion: "nikoh", createdAt: new Date("2026-01-01Z")},
      {...base, id: "b", amount: 6000, format: "scroll", occasion: "nahorgi"},
      {...base, id: "c", amount: 8000, occasion: "yubiley"},
      {...base, id: "d", status: "receipt_sent"},
    ]);
    i.events = [{kind:"demo_opened", userId:1, target:"oq-ot", createdAt:now}, {kind:"design_favorited", userId:1, target:"oq-ot", createdAt:now}];
    const s = summarize(i, "today", now);
    expect(s).toMatchObject({ paid:3, orders:3, revenue:19000, unpaid:1, waiting:1 });
    expect(s.categories.map(c=>c.revenue)).toEqual([5000,6000,0,8000]);
    expect(s.formats.reduce((n,f)=>n+f.share,0)).toBeCloseTo(100);
    for (const f of s.formats) expect(f.share).toBeCloseTo(100/3);
    expect(s.funnel.demos).toBe(1);
    expect(s.designs[0].favorites).toBe(1);
  });
  it("yesterday and selected ranges include midnight start and exclude next midnight", () => {
    const i = input([
      {...base, paidAt: new Date("2026-10-23T19:00:00Z"), createdAt:new Date("2026-10-01Z")},
      {...base, id:"b", paidAt: new Date("2026-10-24T18:59:59.999Z"), createdAt:new Date("2026-10-01Z")},
      {...base, id:"c", paidAt: new Date("2026-10-24T19:00:00Z"), createdAt:new Date("2026-10-01Z")},
    ]);
    expect(summarize(i,"yesterday",now).paid).toBe(2);
    expect(summarize(i,"date=2026-10-24",now).paid).toBe(2);
    expect(summarize(i,"date=2026-10-24..2026-10-25",now).paid).toBe(3);
    expect(summarize(i,"today",new Date("2026-10-24T19:00:00Z")).paid).toBe(1);
  });
  it.each(["date=2026-02-30", "date=2026-13-01", "date=2026-10-25..2026-10-24", "date=bad", "date=2026-10-01..2026-10-02..2026-10-03"])("rejects invalid range %s", value => {
    expect(() => summarize(input([]), value as import("./analytics").Period, now)).toThrow("Invalid analytics period");
  });
  it("never substitutes updatedAt for an unknown historical payment date", () => {
    const i = input([{...base, paidAt:null, createdAt:new Date("2026-01-01Z"), updatedAt:now}]);
    expect(summarize(i,"today",now)).toMatchObject({paid:0,revenue:0,unknownPaidDates:1});
    const all = summarize(i,"all",now,true);
    expect(all).toMatchObject({paid:1,revenue:10000,unknownPaidDates:1});
    expect(all.daily.every(d=>d.value === 0)).toBe(true);
    expect(all.customers?.[0].last).toBeNull();
    expect(all.details[0].paidAt).toBeNull();
  });
  it("returns no customer identifiers in order details", () => {
    const s = summarize(input([base]), "all", now);
    expect(s.details[0]).not.toHaveProperty("userId");
    expect(s.details[0]).not.toHaveProperty("music");
    expect(JSON.stringify(s)).not.toContain("@buyer");
    expect(JSON.stringify(s)).not.toContain("Имя");
  });
});


it("uses historical IANA offsets for selected dates across the Almaty 2024 change", () => {
  expect(periodStart("date=2024-02-29", now).toISOString()).toBe("2024-02-28T18:00:00.000Z");
  expect(periodStart("date=2024-03-01", now).toISOString()).toBe("2024-02-29T19:00:00.000Z");
});
