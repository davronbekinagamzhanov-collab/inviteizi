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

describe("одно сообщение после оплаты (ночная задача, п.1)", () => {
  it("подпись к QR укладывается в 1024 знака на всех языках", async () => {
    const { ru } = await import("@/texts/bot-ru");
    const { kk } = await import("@/texts/bot-kk");
    const url = `https://inviteizi.vercel.app/${"a".repeat(60)}`;
    for (const tx of [uz, ru, kk]) for (const t of [tx.pay.paidPack(url), tx.pay.linkPack(url)]) expect(t.length).toBeLessThanOrEqual(1024);
  });
});

describe("сигнал об ошибках владельцу (ночь п.5)", () => {
  const err = { step: "review", updateKind: "callback", errorName: "TimeoutError", errorCode: null, message: "db timeout", stack: null, outcome: "retry" as const };
  it("≥3 ошибок за час — одно сообщение; повтор не раньше чем через 2 часа; 2 ошибки — тишина", async () => {
    const s = new Sim();
    await prepare(s, ADMIN, uz.langRu);
    const alerts = () => s.tg.to(ADMIN).filter((m) => m.text?.startsWith("⚠️ Бот:"));
    await s.repo.logBotError(err);
    await s.repo.logBotError(err);
    await runCron(s.deps);
    expect(alerts()).toHaveLength(0);
    await s.repo.logBotError(err);
    await runCron(s.deps);
    await runCron(s.deps);
    expect(alerts()).toHaveLength(1);
    expect(alerts()[0].text).toContain("3 ошибки за час — TimeoutError: db timeout");
    s.advance(60);
    for (let i = 0; i < 3; i++) await s.repo.logBotError(err);
    await runCron(s.deps);
    expect(alerts()).toHaveLength(1);
    s.advance(61);
    for (let i = 0; i < 3; i++) await s.repo.logBotError(err);
    await runCron(s.deps);
    expect(alerts()).toHaveLength(2);
  });

  it("ночью — молчит, утром в 08:xx — сообщает про ночь", async () => {
    const s = new Sim({ now: "2026-11-01T18:00:00Z" }); // 23:00
    await prepare(s, ADMIN, uz.langRu);
    for (let i = 0; i < 4; i++) await s.repo.logBotError(err);
    await runCron(s.deps);
    expect(s.tg.to(ADMIN).some((m) => m.text?.startsWith("⚠️ Бот:"))).toBe(false);
    s.clock = new Date("2026-11-02T03:05:00Z"); // 08:05
    await runCron(s.deps);
    expect(s.tg.to(ADMIN).filter((m) => m.text?.startsWith("⚠️ Бот:")).at(-1)?.text).toContain("4 ошибки за ночь");
  });
});

describe("ночной ревьюер: исправления", () => {
  it("№1: НАМУНА закрылась (24 ч) — проверка перед оплатой без мёртвой ссылки", async () => {
    const { nikohOrder } = await import("./testing/paths");
    const s = new Sim();
    const o = await nikohOrder(s, 1);
    s.advance(25 * 60);
    await s.callback(1, `pay:${o.number}`, 1);
    expect(s.lastText(1)).toContain("24 соатдан кейин ёпилган");
    expect(s.lastText(1)).not.toContain(`/${o.slug}`);
  });

  it("№2: приложение — после смены дизайна (цены) подтверждение сбрасывается", async () => {
    const s = new Sim();
    const u: AppUser = { id: 5, firstName: "Апа", username: "u5", languageCode: "uz" };
    const nikoh = activeDesigns().filter((d) => d.occasion === "nikoh");
    const a = nikoh.find((d) => d.format === "animated")!;
    const b = nikoh.find((d) => d.format === "simple")!;
    const form = { hosts: "Оила", groom: "Азиз", bride: "Мадина", events: [{ date: "2027-06-12", time: "18:00", venueName: "Зал", address: "Сайрам" }] };
    const r = await app.submitDraft(s.deps, u, { templateId: a.id, form });
    if (!("ok" in r)) throw new Error(JSON.stringify(r));
    await app.confirmPay(s.deps, u, r.order.id);
    const r2 = await app.submitDraft(s.deps, u, { templateId: b.id, form, orderId: r.order.id });
    if (!("ok" in r2)) throw new Error(JSON.stringify(r2));
    expect(r2.order.amount).not.toBe(r.order.amount);
    expect(r2.order.confirmed).toBe(false);
  });

  it("№2б: чат — старая кнопка «✅ …тўлаймиз» после правки снова показывает проверку", async () => {
    const { nikohOrder } = await import("./testing/paths");
    const s = new Sim();
    const o = await nikohOrder(s, 1);
    await s.click(1, /^💳 Тўлаш/);
    const btn = s.last(1)!;
    const data = (btn.markup as { inline: { text: string; data?: string }[][] }).inline[0][0].data!;
    const fresh = (await s.repo.getOrder(o.id))!;
    await s.repo.updateOrder(o.id, { data: { ...fresh.data, groom: "Сардор" } });
    await s.callback(1, data, btn.id);
    expect(s.lastText(1)).toContain("Тўловдан олдин текширинг");
    expect(s.lastText(1)).toContain("Сардор");
  });

  it("№3: вчерашняя кнопка «✅ Да, выплатил» в карточке не проводит новую выплату", async () => {
    const s = new Sim();
    const p = await s.repo.createPartner({ code: "dokon333", name: "Дўкон", telegramId: null, username: null, rate: 500, status: "active" });
    await prepare(s, ADMIN, uz.langRu);
    await s.start(1, partnerSource("dokon333"));
    const a = await nikohWithReceipt(s, 1);
    await s.callback(ADMIN, `ok:${a.number}`, 1);
    await s.callback(ADMIN, `pa:paid:${p.id}:500:0`, 1);
    expect(s.repo.payouts).toHaveLength(1);
    await s.start(2, partnerSource("dokon333"));
    const b = await nikohWithReceipt(s, 2);
    await s.callback(ADMIN, `ok:${b.number}`, 1);
    await s.callback(ADMIN, `pa:paid:${p.id}:500:0`, 1);
    expect(s.repo.payouts).toHaveLength(1);
  });

  it("№4: «100 ₸» и «50 тг» — сумма, а не процент", async () => {
    const { parseRate } = await import("./flow/partners");
    expect(parseRate("100 ₸")).toEqual({ rate: 100, pct: null });
    expect(parseRate("50 тг")).toEqual({ rate: 50, pct: null });
    expect(parseRate("50")).toEqual({ rate: 0, pct: 50 });
  });
});
