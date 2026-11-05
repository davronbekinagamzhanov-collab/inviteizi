/** Находки финального ревьюера v2 (docs/reviews/v2-final/reviewer.md) — исправлены и закреплены тестами */
import { describe, expect, it } from "vitest";
import { uz } from "@/texts/bot-uz";
import { staff } from "@/texts/bot-ru";
import { partnerSource } from "@/lib/owner-panel";
import type { AppUser } from "@/lib/tg-init-data";
import { activeDesigns } from "@/templates/registry";
import * as app from "./app/service";
import { runCron } from "./cron";
import { nikohOrder, nikohWithReceipt } from "./testing/paths";
import { ADMIN, ADMIN2, Sim } from "./testing/sim";

const MANAGER = 700;
const prepare = async (s: Sim, id: number, lang = uz.langUz) => {
  await s.start(id);
  if (s.lastText(id)?.startsWith("Тилни танланг")) await s.click(id, lang);
};

describe("находки ревьюера v2", () => {
  it("№1: напоминание об оплате ночью не приходит — уходит утром", async () => {
    const s = new Sim({ now: "2026-11-01T14:30:00Z" }); // 19:30
    await nikohOrder(s, 1);
    s.clock = new Date("2026-11-01T17:30:00Z"); // 22:30
    await runCron(s.deps);
    expect(s.tg.to(1).some((m) => m.text?.startsWith("👋"))).toBe(false);
    s.clock = new Date("2026-11-02T03:30:00Z"); // 08:30
    await runCron(s.deps);
    expect(s.tg.to(1).some((m) => m.text?.startsWith("👋"))).toBe(true);
  });

  it("№4: снятый менеджер не получает за оплаты после снятия", async () => {
    const s = new Sim();
    await s.repo.addManager({ telegramId: MANAGER, code: "mgr1", username: "aziz", firstName: "Азиз", invitedBy: ADMIN });
    await s.repo.createPartner({ code: "salon111", name: "Салон", telegramId: null, username: null, rate: 1000, managedBy: MANAGER, status: "active" });
    await prepare(s, ADMIN, uz.langRu);
    await s.start(1, partnerSource("salon111"));
    const a = await nikohWithReceipt(s, 1);
    await s.callback(ADMIN, `ok:${a.number}`, 1);
    s.advance(1);
    await s.repo.removeManager(MANAGER, s.clock);
    s.advance(60);
    await s.start(2, partnerSource("salon111"));
    const b = await nikohWithReceipt(s, 2);
    await s.callback(ADMIN, `ok:${b.number}`, 1);
    s.clock = new Date("2026-12-01T05:05:00Z");
    await runCron(s.deps);
    const list = s.tg.to(ADMIN).filter((m) => m.text?.startsWith("💰 Выплаты")).at(-1)!;
    // За ноябрь — только оплата до снятия: 1 × 500 ₸
    expect(list.text).toContain("👤 @aziz · 500 ₸ · за ноябрь (1 оплата)");
  });

  it("№5: вчерашняя кнопка «✅ Оплатил» с той же суммой не проводит новую выплату", async () => {
    const s = new Sim();
    const p = await s.repo.createPartner({ code: "dokon222", name: "Дўкон", telegramId: null, username: null, rate: 500, schedule: "daily", status: "active" });
    for (const id of [ADMIN, ADMIN2]) await prepare(s, id, uz.langRu);
    await s.start(1, partnerSource("dokon222"));
    const a = await nikohWithReceipt(s, 1);
    await s.callback(ADMIN, `ok:${a.number}`, 1);
    s.clock = new Date("2026-11-02T05:05:00Z");
    await runCron(s.deps);
    const old = s.tg.to(ADMIN2).filter((m) => m.text?.startsWith("💰 Выплаты")).at(-1)!;
    await s.callback(ADMIN, `po:${p.id}:500:0`, s.tg.to(ADMIN).filter((m) => m.text?.startsWith("💰 Выплаты")).at(-1)!.id);
    expect(s.repo.payouts).toHaveLength(1);
    // Новая оплата на ту же сумму; второй админ жмёт вчерашнюю кнопку
    await s.start(2, partnerSource("dokon222"));
    const b = await nikohWithReceipt(s, 2);
    await s.callback(ADMIN, `ok:${b.number}`, 1);
    await s.callback(ADMIN2, `po:${p.id}:500:0`, old.id);
    expect(s.repo.payouts).toHaveLength(1);
    expect(s.tg.answers.at(-1)?.text).toBe(staff.n.payStale);
  });

  it("№6: после чека приложение не держит оплаченный заказ как черновик", async () => {
    const s = new Sim();
    const u: AppUser = { id: 5, firstName: "Апа", username: "u5", languageCode: "uz" };
    const design = activeDesigns().find((d) => d.occasion === "nikoh")!;
    const form = { hosts: "Оила", groom: "Азиз", bride: "Мадина", events: [{ date: "2027-06-12", time: "18:00", venueName: "Зал", address: "Сайрам" }] };
    const r = await app.submitDraft(s.deps, u, { templateId: design.id, form });
    if (!("ok" in r)) throw new Error(JSON.stringify(r));
    expect((await app.openSession(s.deps, u)).draft?.orderId).toBe(r.order.id);
    await s.repo.transition(r.order.id, ["preview"], "receipt_sent", { receiptAt: s.clock });
    expect((await app.openSession(s.deps, u)).draft).toBeNull();
  });
});
