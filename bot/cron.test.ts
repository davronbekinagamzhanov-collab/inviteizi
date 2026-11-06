import { describe, expect, it } from "vitest";
import { uz } from "@/texts/bot-uz";
import { runCron } from "./cron";
import { ADMIN, ADMIN2, Sim } from "./testing/sim";
import { buttonLabels } from "./testing/fake-tg";
import { nikohOrder, nikohWithReceipt } from "./testing/paths";

const BASE = "https://inviteizi.vercel.app";

describe("cron: напоминания и архив", () => {
  it("админу — один раз, когда чек ждёт больше 30 минут", async () => {
    const sim = new Sim();
    const o = await nikohWithReceipt(sim, 1);
    sim.advance(20);
    expect(await runCron(sim.deps)).toMatchObject({ adminReminded: 0 });
    sim.advance(11);
    const mark = sim.mark();
    expect(await runCron(sim.deps)).toMatchObject({ adminReminded: 1 });
    for (const a of [ADMIN, ADMIN2]) {
      const msgs = sim.tg.to(a).filter((m) => m.id >= mark);
      expect(msgs).toHaveLength(1);
      expect(msgs[0].text).toContain(uz.admin.remind(o.number, 31));
      expect(buttonLabels(msgs[0])).toEqual([uz.admin.approve, uz.admin.reject]);
    }
    expect((await sim.repo.getOrder(o.id))?.adminRemindedAt).toEqual(sim.clock);
    sim.advance(60);
    expect(await runCron(sim.deps)).toMatchObject({ adminReminded: 0 });
    expect(sim.tg.to(ADMIN).filter((m) => m.id >= mark)).toHaveLength(1);
  });

  it("клиенту — один раз, если пропал на оплате больше 3 часов", async () => {
    const sim = new Sim();
    const o = await nikohOrder(sim, 1);
    sim.advance(170);
    expect(await runCron(sim.deps)).toMatchObject({ clientReminded: 0 });
    sim.advance(11);
    const mark = sim.mark();
    expect(await runCron(sim.deps)).toMatchObject({ clientReminded: 1 });
    const msgs = sim.tg.to(1).filter((m) => m.id >= mark);
    expect(msgs.map((m) => m.text)).toEqual([uz.pay.reminder(`${BASE}/aziz-madina`)]);
    expect(buttonLabels(msgs[0]).some((l) => l.startsWith("💳 Тўлаш"))).toBe(true);
    expect((await sim.repo.getOrder(o.id))?.paymentRemindedAt).toEqual(sim.clock);
    sim.advance(300);
    expect(await runCron(sim.deps)).toMatchObject({ clientReminded: 0 });
  });

  it("чек уже отправлен — клиенту о оплате не напоминаем", async () => {
    const sim = new Sim({ admins: [] });
    await nikohWithReceipt(sim, 1);
    sim.advance(24 * 60);
    expect(await runCron(sim.deps)).toMatchObject({ clientReminded: 0 });
  });

  it("архив: после expiresAt (последний тадбир + 30 дней) active → archived", async () => {
    const sim = new Sim();
    const o = await nikohWithReceipt(sim, 1);
    await sim.click(ADMIN, uz.admin.approve);
    sim.clock = new Date("2026-12-14T18:00:00Z");
    expect(await runCron(sim.deps)).toMatchObject({ archived: 0 });
    expect((await sim.repo.getOrder(o.id))?.status).toBe("active");
    // Тяжёлые задания — только в первом запуске часа (экономия Vercel): в 19:20 ещё не архивируем
    sim.clock = new Date("2026-12-14T19:20:00Z");
    expect(await runCron(sim.deps)).toMatchObject({ archived: 0 });
    sim.clock = new Date("2026-12-14T20:00:00Z");
    expect(await runCron(sim.deps)).toMatchObject({ archived: 1 });
    expect((await sim.repo.getOrder(o.id))?.status).toBe("archived");
  });

  it("ошибка отправки одному не ломает остальных", async () => {
    const sim = new Sim();
    await nikohOrder(sim, 1);
    await nikohOrder(sim, 2, ["Жасур", "Нилуфар"]);
    sim.advance(181);
    const orig = sim.tg.sendMessage.bind(sim.tg);
    sim.tg.sendMessage = async (chatId, text, opts) => {
      if (chatId === 2) throw new Error("Forbidden: bot was blocked by the user");
      return orig(chatId, text, opts);
    };
    const r = await runCron(sim.deps);
    expect(r.clientReminded).toBe(1);
    expect(r.errors).toBe(1);
  });
});
