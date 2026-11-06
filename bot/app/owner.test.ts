/** Панель владельца в приложении: доступ только ADMIN_IDS; цифры = «📊 Статистика» бота на тех же данных */
import { describe, expect, it } from "vitest";
import { staff } from "@/texts/bot-ru";
import { uz } from "@/texts/bot-uz";
import { partnerSource } from "@/lib/owner-panel";
import { ownerExport, ownerPanel } from "./owner";
import { statsScreen } from "../flow/stats";
import { ownerAppUrl } from "../flow/panel";
import { nikohOrder, nikohWithReceipt } from "../testing/paths";
import { ADMIN, Sim } from "../testing/sim";

const S = staff.st;
const price = (n: number) => `${n.toLocaleString("ru-RU").replace(/ /g, " ")} ₸`;

/** Партнёр владельца + 2 оплаченных заказа (1 через партнёра) + 1 НАМУНА без оплаты */
async function dataset() {
  const s = new Sim();
  await s.start(ADMIN);
  if (s.lastText(ADMIN)?.startsWith("Тилни танланг")) await s.click(ADMIN, uz.langUz);
  await s.click(ADMIN, staff.btn.partners);
  await s.click(ADMIN, staff.pt.btn.add);
  await s.text(ADMIN, "Салон Малика");
  await s.text(ADMIN, "+7 701 123 45 67");
  await s.click(ADMIN, /^1.000 ₸ фикс\.$/);
  await s.click(ADMIN, staff.pt.schedule.weekly);
  await s.click(ADMIN, staff.pt.create);
  const p = s.repo.partners[0];
  await s.start(1, partnerSource(p.code));
  if (s.lastText(1)?.startsWith("Тилни танланг")) await s.click(1, uz.langUz);
  const a = await nikohWithReceipt(s, 1);
  await s.callback(ADMIN, `ok:${a.number}`, 1);
  const b = await nikohWithReceipt(s, 2, ["Бобур", "Лола"]);
  await s.callback(ADMIN, `ok:${b.number}`, 1);
  await nikohOrder(s, 3, ["Жасур", "Нигора"]);
  return { s, p };
}

describe("панель владельца: доступ", () => {
  it("не-админ (клиент, партнёр) — forbidden, Excel тоже; админ — данные", async () => {
    const { s, p } = await dataset();
    expect(await ownerPanel(s.deps, 1, "d")).toEqual({ error: "forbidden" });
    expect(await ownerPanel(s.deps, 999, "d")).toEqual({ error: "forbidden" });
    expect(await ownerExport(s.deps, 1, "m")).toEqual({ error: "forbidden" });
    if (p.telegramId) expect(await ownerPanel(s.deps, p.telegramId, "d")).toEqual({ error: "forbidden" });
    const before = s.tg.messages.length;
    await ownerExport(s.deps, 1, "m");
    expect(s.tg.messages.length).toBe(before);
    const r = await ownerPanel(s.deps, ADMIN, "d");
    expect("error" in r).toBe(false);
  }, 30_000);

  it("Excel — та же выгрузка, что в боте: файл приходит владельцу", async () => {
    const { s } = await dataset();
    expect(await ownerExport(s.deps, ADMIN, "y")).toEqual({ ok: true });
    const doc = s.tg.to(ADMIN).at(-1)!;
    expect(doc.type).toBe("document");
    expect(doc.fileName).toMatch(/^inviteizi-\d{4}\.xlsx$/);
  }, 30_000);

  it("кнопка «🖥 Панель» ведёт на /app/owner", () => {
    expect(ownerAppUrl("https://inviteizi.vercel.app/app")).toBe("https://inviteizi.vercel.app/app/owner");
    expect(ownerAppUrl("https://inviteizi.vercel.app/app/?x=1")).toBe("https://inviteizi.vercel.app/app/owner");
  });
});

describe("панель владельца: цифры = статистика бота", () => {
  it.each(["d", "w", "m", "y"] as const)("период %s: оплаты, сумма, воронка, дизайны, партнёры", async (per) => {
    const { s, p } = await dataset();
    const r = await ownerPanel(s.deps, ADMIN, per);
    if ("error" in r) throw new Error("forbidden");
    const c = { deps: s.deps, user: { id: ADMIN }, chatId: ADMIN } as Parameters<typeof statsScreen>[0];
    const money = (await statsScreen(c, "owner", per, "money")).text;
    const fn = (await statsScreen(c, "owner", per, "fn")).text;
    const ds = (await statsScreen(c, "owner", per, "ds")).text;
    const pt = (await statsScreen(c, "owner", per, "pt")).text;

    expect(r.cards).toMatchObject({ paid: 2, revenue: 16000, namuna: 1, makers: 3, payers: 2, conversion: 67, due: 1000 });
    expect(money).toContain(S.paid(r.cards.paid, price(r.cards.revenue)));
    expect(fn).toContain(S.fnClients(r.funnel.clients));
    expect(fn).toContain(S.fnSamples(r.funnel.makers, `${Math.round((r.funnel.makers / r.funnel.clients) * 100)}%`));
    expect(fn).toContain(S.fnPaid(r.funnel.payers, `${r.cards.conversion}%`));
    expect(fn).toContain(S.fnStuck(r.cards.namuna));
    for (const d of r.designs) expect(ds).toContain(S.dsLine(d.number, d.name, d.samples, d.paid));
    const row = r.partners.find((x) => x.id === p.id)!;
    expect(row).toMatchObject({ scanned: 1, paid: 1, earned: 1000, paidOut: 0, due: 1000, rate: "1 000 ₸", manager: null, sleeping: false });
    expect(pt).toContain(S.ptLine(p.name, row.scanned, 1, row.paid, price(row.due)));

    // Заказы: номер, сумма, дизайн, партнёр, статус, ссылка; поиск по номеру и именам работает на этих полях
    expect(r.orders).toHaveLength(3);
    const viaPartner = r.orders.find((o) => o.partnerId === p.id)!;
    expect(viaPartner).toMatchObject({ paid: true, status: "active", amount: 8000, partner: p.name, names: "Азиз & Мадина" });
    expect(viaPartner.url).toMatch(/^https?:\/\/.+\/aziz-madina$/);
    expect(r.orders.find((o) => o.names === "Жасур & Нигора")).toMatchObject({ paid: false, partner: null });
  }, 30_000);
});

describe("тестовые заказы админов", () => {
  it("не входят в цифры, но владелец видит строку «не учитываются (N)» — в боте и в приложении", async () => {
    const { s } = await dataset();
    const before = await ownerPanel(s.deps, ADMIN, "d");
    if ("error" in before) throw new Error("forbidden");
    expect(before.testOrders).toBe(0);
    const own = await nikohWithReceipt(s, ADMIN, ["Тест", "Тестова"]);
    await s.callback(ADMIN, `ok:${own.number}`, 1);
    const after = await ownerPanel(s.deps, ADMIN, "d");
    if ("error" in after) throw new Error("forbidden");
    expect(after.cards).toEqual(before.cards);
    expect(after.testOrders).toBe(1);
    const bot = await statsScreen({ deps: s.deps, user: { id: ADMIN } } as never, "owner", "d", "money");
    expect(bot.text).toContain(S.staffExcluded(1));
  });
});
