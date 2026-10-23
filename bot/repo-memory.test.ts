import { describe, expect, it } from "vitest";
import { repoContract } from "./repo.contract";
import { MemoryRepo } from "./repo-memory";

repoContract(async () => new MemoryRepo());

describe("MemoryRepo (своё, вне общего контракта)", () => {
  it("isAdmin и listAdminIds — из adminIds", async () => {
    const repo = new MemoryRepo({ adminIds: [111, 222] });
    expect(await repo.isAdmin(111)).toBe(true);
    expect(await repo.isAdmin(333)).toBe(false);
    expect((await repo.listAdminIds()).sort()).toEqual([111, 222]);
  });

  it("listMusic — по sort; setMusicTelegramFileId запоминает file_id", async () => {
    const repo = new MemoryRepo({
      music: [
        { id: "b", titleUz: "Б", titleRu: "Б", fileUrl: "https://x/b.mp3", telegramFileId: null, sort: 2 },
        { id: "a", titleUz: "А", titleRu: "А", fileUrl: "https://x/a.mp3", telegramFileId: null, sort: 1 },
      ],
    });
    expect((await repo.listMusic()).map((m) => m.id)).toEqual(["a", "b"]);
    await repo.setMusicTelegramFileId("b", "TG_B");
    expect((await repo.listMusic())[1].telegramFileId).toBe("TG_B");
  });

  it("stats: заказы и выручка за сегодня/неделю/месяц/всего, по статусам и источникам", async () => {
    let clock = new Date("2026-11-20T10:00:00Z");
    const repo = new MemoryRepo({ now: () => clock });
    await repo.touchUser({ id: 1, source: "insta" });
    await repo.touchUser({ id: 2, source: "insta" });
    await repo.touchUser({ id: 3 });
    const base = {
      occasion: "nikoh" as const,
      format: "animated" as const,
      templateId: "ganch-peshtoq",
      music: { kind: "none" as const },
      data: { occasion: "nikoh" as const, hosts: "Х", events: [] },
    };
    // 40 дней назад — оплачен (только «всего»)
    clock = new Date("2026-10-11T10:00:00Z");
    const old = await repo.createOrder({ ...base, userId: 3, amount: 7_000, slugBase: "old", status: "active" });
    await repo.updateOrder(old.id, { paidAt: clock });
    // 3 дня назад — оплачен (неделя, месяц)
    clock = new Date("2026-11-17T10:00:00Z");
    const week = await repo.createOrder({ ...base, userId: 1, amount: 10_000, slugBase: "week", status: "active" });
    await repo.updateOrder(week.id, { paidAt: clock });
    // сегодня — не оплачен
    clock = new Date("2026-11-20T09:00:00Z");
    await repo.createOrder({ ...base, userId: 2, amount: 10_000, slugBase: "today", status: "preview" });

    const s = await repo.stats(new Date("2026-11-20T10:00:00Z"));
    expect(s.orders).toEqual({ today: 1, week: 2, month: 2, total: 3 });
    expect(s.revenue).toEqual({ today: 0, week: 10_000, month: 10_000, total: 17_000 });
    expect(s.byStatus).toEqual({ active: 2, preview: 1 });
    expect(s.bySource).toEqual(
      expect.arrayContaining([
        { source: "insta", users: 2, paid: 1 },
        { source: "—", users: 1, paid: 1 },
      ]),
    );
  });
});
