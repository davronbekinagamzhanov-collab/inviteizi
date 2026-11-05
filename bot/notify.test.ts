/**
 * v2, часть 7: уведомления об оплате, отчёты 20:00, день выплаты 10:00, выплаты менеджеру 1-го,
 * напоминания о чеке, тихие часы, без дублей. Логины и имена клиентов партнёрам и менеджеру не показываем.
 */
import { describe, expect, it } from "vitest";
import { uz } from "@/texts/bot-uz";
import { ru, staff } from "@/texts/bot-ru";
import { partnerSource } from "@/lib/owner-panel";
import { managerSource } from "@/lib/roles";
import { maskName, ruPayments } from "@/lib/money";
import { runCron } from "./cron";
import { designName, price } from "./flow/util";
import { TG_LIMITS } from "./testing/fake-tg";
import { nikohWithReceipt } from "./testing/paths";
import { ADMIN, ADMIN2, Sim } from "./testing/sim";

const N = staff.n;
const MANAGER = 700;
const PARTNER = 900;
const OWN_PARTNER = 901;
const MONDAY_10 = "2026-11-02T05:05:00Z"; // понедельник, 10:05 в Сайраме

const prepare = async (s: Sim, id: number, lang = uz.langUz) => {
  await s.start(id);
  if (s.lastText(id) === uz.chooseLang) await s.click(id, lang);
};

/** Менеджер, его партнёр и партнёр владельца (оба подтверждены, у обоих есть Telegram) */
async function setup(s: Sim) {
  await s.repo.addManager({ telegramId: MANAGER, code: "mgr1", username: "aziz", firstName: "Азиз", invitedBy: ADMIN });
  const mine = await s.repo.createPartner({ code: "salon111", name: "Салон Малика", telegramId: PARTNER, username: null, rate: 1000, managedBy: MANAGER, schedule: "weekly", status: "active" });
  const own = await s.repo.createPartner({ code: "dokon222", name: "Дўкон", telegramId: OWN_PARTNER, username: null, rate: 500, schedule: "daily", status: "active" });
  for (const id of [ADMIN, ADMIN2]) await prepare(s, id, uz.langRu);
  await prepare(s, PARTNER);
  await prepare(s, OWN_PARTNER, uz.langRu);
  return { mine, own };
}

async function paid(s: Sim, client: number, source: string | null) {
  if (source) await s.start(client, source);
  const o = await nikohWithReceipt(s, client);
  await s.callback(ADMIN, `ok:${o.number}`, 1);
  return o;
}

const textsTo = (s: Sim, id: number) => s.tg.to(id).map((m) => m.text ?? "");

describe("оплата: сразу владельцу и менеджеру", () => {
  it("партнёр менеджера: «💳 №… · сумма · дизайн · Салон (@менеджер)», менеджеру «вам +500 ₸»; второму админу — тоже", async () => {
    const s = new Sim();
    await setup(s);
    const o = await paid(s, 1, partnerSource("salon111"));
    const line = N.paid(o.number, price(o.amount), designName(o.templateId), "Салон Малика (@aziz)");
    expect(s.lastText(ADMIN)).toContain(line);
    expect(textsTo(s, ADMIN2)).toContain(line);
    expect(textsTo(s, MANAGER)).toContain(N.mgrPaid("Салон Малика", o.number, price(o.amount), "500 ₸"));
    // Двойное нажатие не дублирует
    await s.callback(ADMIN, `ok:${o.number}`, 1);
    expect(textsTo(s, ADMIN2).filter((t) => t === line)).toHaveLength(1);
    expect(textsTo(s, MANAGER).filter((t) => t.startsWith("💳"))).toHaveLength(1);
    // Партнёру сразу ничего: только вечерний отчёт
    expect(textsTo(s, PARTNER).some((t) => t.includes(`№${o.number}`))).toBe(false);
  });

  it("партнёр владельца — без скобок, менеджеру ничего; без кода — «напрямую»", async () => {
    const s = new Sim();
    await setup(s);
    const a = await paid(s, 1, partnerSource("dokon222"));
    expect(s.lastText(ADMIN)).toContain(`${designName(a.templateId)} · Дўкон`);
    await paid(s, 2, null);
    expect(s.lastText(ADMIN)).toContain(`· ${N.direct}`);
    expect(textsTo(s, MANAGER).some((t) => t.startsWith("💳"))).toBe(false);
  });

  it("заказ для клиента от менеджера: владельцу «@менеджер · заказ для клиента», менеджеру +500 ₸", async () => {
    const s = new Sim();
    await setup(s);
    await prepare(s, 3);
    const o = await nikohWithReceipt(s, 3);
    s.repo.clientOrders.push({ orderId: o.id, createdBy: MANAGER, tokenHash: "x".repeat(64), refSource: managerSource("mgr1"), claimedBy: 3 });
    await s.callback(ADMIN, `ok:${o.number}`, 1);
    expect(s.lastText(ADMIN)).toContain(`@aziz · ${N.forClient}`);
    expect(textsTo(s, MANAGER).at(-1)).toBe(N.mgrPaid("Заказ для клиента", o.number, price(o.amount), "500 ₸"));
  });

  it("ночью менеджеру — после 08:00, один раз; заказ сотрудника не считается", async () => {
    const s = new Sim({ now: "2026-11-01T18:00:00Z" }); // 23:00
    await setup(s);
    const o = await paid(s, 1, partnerSource("salon111"));
    expect(textsTo(s, MANAGER).some((t) => t.startsWith("💳"))).toBe(false);
    await runCron(s.deps);
    expect(textsTo(s, MANAGER).some((t) => t.startsWith("💳"))).toBe(false);
    s.clock = new Date("2026-11-02T03:10:00Z"); // 08:10
    await runCron(s.deps);
    await runCron(s.deps);
    expect(textsTo(s, MANAGER).filter((t) => t.includes(`№${o.number}`) && t.startsWith("💳"))).toHaveLength(1);

    const staffOrder = await nikohWithReceipt(s, MANAGER);
    await s.callback(ADMIN, `ok:${staffOrder.number}`, 1);
    expect(s.lastText(ADMIN)).not.toContain("💳");
  });
});

describe("отчёт 20:00", () => {
  it("пустой день: владельцу «сегодня тихо», менеджеру и партнёру — ничего", async () => {
    const s = new Sim({ now: "2026-11-01T15:01:00Z" });
    await setup(s);
    const before = { m: s.tg.to(MANAGER).length, p: s.tg.to(PARTNER).length };
    // Клиенты из setup «новые» — сдвигаем на следующий день
    s.clock = new Date("2026-11-02T15:01:00Z");
    await runCron(s.deps);
    expect(s.lastText(ADMIN)).toBe(N.quiet("2 ноября"));
    expect(s.tg.to(MANAGER)).toHaveLength(before.m);
    expect(s.tg.to(PARTNER)).toHaveLength(before.p);
  });

  it("день с оплатами: владелец — цифры, шаг остановки, топ, к выплате; менеджер — сеть и цель; партнёр — номер, буква, сумма", async () => {
    const s = new Sim();
    await setup(s);
    const o1 = await paid(s, 1, partnerSource("salon111"));
    await s.start(2, partnerSource("salon111"));
    await nikohWithReceipt(s, 2); // чек на проверке
    s.clock = new Date("2026-11-01T15:02:00Z");
    await runCron(s.deps);
    await runCron(s.deps);

    const owner = textsTo(s, ADMIN).filter((t) => t.startsWith(N.evTitle("1 ноября")));
    expect(owner).toHaveLength(1);
    expect(owner[0]).toContain(N.payments(1, price(o1.amount)));
    expect(owner[0]).toContain(N.steps.receipt_sent);
    expect(owner[0]).toContain("🎨 Топ: №");
    expect(owner[0]).toContain("Салон Малика (@aziz) 1 000 ₸");

    const mgr = textsTo(s, MANAGER).filter((t) => t.startsWith("📋"));
    expect(mgr).toHaveLength(1);
    expect(mgr[0]).toContain(N.mgrLine("Салон Малика", 2, 1));
    expect(mgr[0]).toContain(N.goal(1, 30, "15 000 ₸"));
    expect(mgr[0]).not.toMatch(/user\d|Клиент/);

    const partner = textsTo(s, PARTNER).filter((t) => t.startsWith("🌙"));
    expect(partner).toHaveLength(1);
    expect(partner[0]).toContain(uz.role.evLine(o1.number, maskName("Клиент1"), price(o1.amount)));
    expect(partner[0]).toContain("Сизга: 1 000 ₸");
    expect(partner[0]).toContain("Тўлов куни: душанба");
    expect(partner[0]).not.toMatch(/user\d|Клиент/);
    // Партнёр владельца без оплат — ничего
    expect(textsTo(s, OWN_PARTNER).some((t) => t.startsWith("🌙"))).toBe(false);
  });

  it("ставка 0: в отчёте оплаты есть, «Сизга» и день выплаты — нет", async () => {
    const s = new Sim();
    await setup(s);
    await s.repo.createPartner({ code: "street33", name: "Уличный QR", telegramId: 902, username: null, rate: 0, status: "active" });
    await prepare(s, 902);
    await paid(s, 1, partnerSource("street33"));
    s.clock = new Date("2026-11-01T15:02:00Z");
    await runCron(s.deps);
    const t = textsTo(s, 902).find((x) => x.startsWith("🌙"))!;
    expect(t).toBeTruthy();
    expect(t).not.toContain("Сизга");
  });
});

describe("день выплаты 10:00", () => {
  it("владельцу список с ✅, партнёру «Бугун … ўтказади»; ✅ → партнёру «ўтказилди» [👍 Олдим], менеджеру заметка; без дублей", async () => {
    const s = new Sim();
    await setup(s);
    await paid(s, 1, partnerSource("salon111"));
    await paid(s, 2, partnerSource("salon111"));
    await s.repo.createPartner({ code: "street33", name: "Уличный QR", telegramId: null, username: null, rate: 0, schedule: "weekly", status: "active" });
    await paid(s, 4, partnerSource("street33"));

    s.clock = new Date(MONDAY_10);
    await runCron(s.deps);
    await runCron(s.deps);
    const lists = s.tg.to(ADMIN).filter((m) => m.text?.startsWith(N.payTitle("2 ноября")));
    expect(lists).toHaveLength(1);
    const list = lists[0];
    expect(list.text).toContain(N.payLine(1, "Салон Малика (@aziz)", "2 000 ₸", "не указан", ruPayments(2)));
    expect(list.text).not.toContain("Уличный QR");
    expect(textsTo(s, PARTNER).filter((t) => t === uz.role.payToday("Давронбек", "2 000 ₸", 2))).toHaveLength(1);

    await s.click(ADMIN, N.payBtn("Салон Малика", "2 000 ₸"));
    expect(s.repo.payouts).toMatchObject([{ amount: 2000 }]);
    expect(s.lastText(ADMIN)).toContain(N.payDone(1, "Салон Малика (@aziz)", "2 000 ₸"));
    expect(textsTo(s, PARTNER).at(-1)).toBe(uz.role.paidOut("2 000 ₸"));
    expect(textsTo(s, MANAGER).at(-1)).toBe(N.mgrNote("Салон Малика", "2 000 ₸"));

    // Старая кнопка ещё раз (второй админ, двойное нажатие) — без второй выплаты
    const list2 = s.tg.to(ADMIN2).filter((m) => m.text?.startsWith("💰 Выплаты")).at(-1)!;
    await s.callback(ADMIN2, `po:${s.repo.partners[0].id}:2000`, list2.id);
    expect(s.tg.answers.at(-1)?.text).toBe(N.payStale);
    expect(s.repo.payouts).toHaveLength(1);

    await s.click(PARTNER, uz.role.gotIt);
    expect(s.tg.answers.at(-1)?.text).toBe(uz.role.thanks);
  });

  it("не день выплаты — ничего; до 10:00 — ничего; не подтверждённый партнёр — не в списке", async () => {
    const s = new Sim();
    await setup(s);
    await paid(s, 1, partnerSource("salon111"));
    s.clock = new Date("2026-11-03T05:05:00Z"); // вторник
    await runCron(s.deps);
    expect(textsTo(s, ADMIN).some((t) => t.includes("Салон Малика") && t.startsWith("💰"))).toBe(false);
    s.clock = new Date("2026-11-09T04:00:00Z"); // понедельник 09:00
    await runCron(s.deps);
    expect(textsTo(s, ADMIN).some((t) => t.startsWith("💰 Выплаты"))).toBe(false);
  });

  it("менеджеру 1-го: 500 ₸ × оплаты сети за прошлый месяц; ✅ → «Вам переведено»; повтор — нет", async () => {
    const s = new Sim({ now: "2026-11-10T07:00:00Z" });
    await setup(s);
    await paid(s, 1, partnerSource("salon111"));
    await paid(s, 2, partnerSource("salon111"));
    await paid(s, 3, partnerSource("dokon222")); // партнёр владельца — не сеть менеджера
    s.clock = new Date("2026-12-01T05:05:00Z");
    await runCron(s.deps);
    expect(textsTo(s, MANAGER)).toContain(N.mgrPayToday("ноябрь", ruPayments(2), "", "1 000 ₸", "Давронбек"));
    await s.click(ADMIN, N.payBtn("@aziz", "1 000 ₸"));
    expect(s.repo.managerPayouts).toMatchObject([{ managerId: MANAGER, month: "2026-11", amount: 1000, orders: 2 }]);
    expect(textsTo(s, MANAGER).at(-1)).toBe(N.mgrPaidOut("1 000 ₸", "ноябрь"));
    const list = s.tg.to(ADMIN).filter((m) => m.text?.startsWith("💰 Выплаты")).at(-1)!;
    await s.callback(ADMIN, `mp:${MANAGER}:202611:1000`, list.id);
    expect(s.tg.answers.at(-1)?.text).toBe(N.payStale);
    expect(s.repo.managerPayouts).toHaveLength(1);
    // Подделка суммы
    await s.callback(ADMIN, `mp:${MANAGER}:202610:99999`, list.id);
    expect(s.repo.managerPayouts).toHaveLength(1);
    // Не владелец
    await prepare(s, MANAGER, uz.langRu);
    await s.callback(MANAGER, `mp:${MANAGER}:202611:1000`, s.last(MANAGER)!.id);
    expect(s.tg.answers.at(-1)?.text).toBe(ru.oldButton);
  });

  it("бонус 15 000 ₸ при 30+ оплатах за месяц", async () => {
    const { managerEarning } = await import("@/lib/money");
    expect(managerEarning(29)).toBe(14_500);
    expect(managerEarning(30)).toBe(30 * 500 + 15_000);
  });
});

describe("чек ждёт: напоминания владельцу", () => {
  it("> 30 мин днём, дальше каждые 2 ч, после 21:00 — нет; ночной чек — клиенту «Эрталаб 9:00 гача»", async () => {
    const s = new Sim({ now: "2026-11-01T11:00:00Z" }); // 16:00
    await prepare(s, ADMIN, uz.langRu);
    const o = await nikohWithReceipt(s, 1);
    const reminders = () => textsTo(s, ADMIN).filter((t) => t.startsWith("⏰")).length;
    s.advance(20);
    await runCron(s.deps);
    expect(reminders()).toBe(0);
    s.advance(15);
    await runCron(s.deps);
    expect(reminders()).toBe(1);
    s.advance(60);
    await runCron(s.deps);
    expect(reminders()).toBe(1);
    s.advance(65); // 18:40, 2 ч после первого
    await runCron(s.deps);
    expect(reminders()).toBe(2);
    s.clock = new Date("2026-11-01T16:10:00Z"); // 21:10
    await runCron(s.deps);
    expect(reminders()).toBe(2);
    expect(o.status).toBe("receipt_sent");

    const night = new Sim({ now: "2026-11-01T18:30:00Z" }); // 23:30
    await nikohWithReceipt(night, 1);
    expect(night.tg.to(1).some((m) => m.text === uz.pay.receiptGotNight)).toBe(true);
  });
});

describe("лимиты Telegram (часть 7)", () => {
  it("тексты и кнопки укладываются", () => {
    const L = "Ш".repeat(80);
    const long = [
      N.paid(99999, "1 000 000 ₸", L, `${L} (@${"u".repeat(32)})`),
      N.mgrPaid(L, 99999, "1 000 000 ₸", "500 ₸"),
      N.payLine(99, `${L} (@${"u".repeat(32)})`, "1 000 000 ₸", "+7 701 123 45 67", ruPayments(999)),
      N.mgrPayToday("сентябрь", ruPayments(999), "15 000 ₸", "1 000 000 ₸", L),
      ...[uz, ru].flatMap((tx) => [
        tx.role.evening({ count: 99, lines: Array(99).fill(tx.role.evLine(99999, "А***", "1 000 000 ₸")).join("\n"), you: "1 000 000 ₸", pending: true, payDay: "1 сентябр" }),
        tx.role.payToday(L, "1 000 000 ₸", 999),
        tx.role.paidOut("1 000 000 ₸"),
      ]),
    ];
    for (const t of long) expect(t.length, t).toBeLessThanOrEqual(TG_LIMITS.message);
    for (const b of [N.payBtn(L.slice(0, 24), "1 000 000 ₸"), uz.role.gotIt, ru.role.gotIt]) expect(b.length, b).toBeLessThanOrEqual(TG_LIMITS.button);
    for (const a of [N.payOk, N.payStale, uz.role.thanks, ru.role.thanks]) expect(a.length).toBeLessThanOrEqual(TG_LIMITS.alert);
    for (const d of ["po:2147483647:1000000", `mp:9007199254740991:202612:1000000`, "pg"]) expect(Buffer.byteLength(d)).toBeLessThanOrEqual(TG_LIMITS.callbackData);
  });
});
