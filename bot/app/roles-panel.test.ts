/**
 * Панели менеджера и партнёра в приложении: доступ только по своей роли (initData),
 * цифры — свои (сеть менеджера / оплаты партнёра), чужим и клиентам — отказ, владельцу — своя панель.
 */
import { describe, expect, it } from "vitest";
import { staff } from "@/texts/bot-ru";
import { uz } from "@/texts/bot-uz";
import { partnerSource } from "@/lib/owner-panel";
import { partnerPoster, rolePanel } from "./roles-panel";
import { nikohWithReceipt } from "../testing/paths";
import { ADMIN, Sim } from "../testing/sim";
import type { AppUser } from "@/lib/tg-init-data";

const MANAGER = 700;
const PARTNER = 900;
const OTHER_PARTNER = 901;
const CLIENT = 1;
const user = (id: number, username: string | null = null): AppUser => ({ id, firstName: "Тест", username: username ?? undefined, languageCode: "uz" } as AppUser);
const APP = "https://inviteizi.vercel.app/app";

async function world() {
  const s = new Sim();
  s.deps.env = { ...s.deps.env, miniAppUrl: APP };
  // Менеджер по ссылке владельца
  await s.start(ADMIN);
  if (s.lastText(ADMIN)?.startsWith("Тилни танланг")) await s.click(ADMIN, uz.langUz);
  await s.click(ADMIN, staff.btn.settings);
  await s.click(ADMIN, staff.btn.addManager);
  const token = /start=mgr_([a-z0-9]+)/.exec([...s.tg.to(ADMIN)].reverse().find((m) => /start=mgr_/.test(m.text))!.text)![1];
  await s.start(MANAGER, `mgr_${token}`);
  const mine = await s.repo.createPartner({ code: "malika11", name: "Салон Малика", telegramId: PARTNER, username: null, rate: 1000, managedBy: MANAGER, status: "active" });
  const other = await s.repo.createPartner({ code: "boshqa11", name: "Чужой салон", telegramId: OTHER_PARTNER, username: null, rate: 1000, status: "active" });
  // Клиент пришёл по QR партнёра менеджера и оплатил
  await s.start(CLIENT, partnerSource(mine.code));
  if (s.lastText(CLIENT)?.startsWith("Тилни танланг")) await s.click(CLIENT, uz.langUz);
  const o = await nikohWithReceipt(s, CLIENT);
  await s.callback(ADMIN, `ok:${o.number}`, 1);
  // Клиент чужого партнёра
  await s.start(2, partnerSource(other.code));
  if (s.lastText(2)?.startsWith("Тилни танланг")) await s.click(2, uz.langUz);
  const o2 = await nikohWithReceipt(s, 2, ["Бобур", "Лола"]);
  await s.callback(ADMIN, `ok:${o2.number}`, 1);
  return { s, mine, other, o, o2 };
}

describe("панель менеджера и партнёра: доступ", () => {
  it("клиент, незнакомец и владелец — forbidden (владельцу — /app/owner)", async () => {
    const { s } = await world();
    for (const id of [CLIENT, 12345, ADMIN]) expect(await rolePanel(s.deps, user(id), "m")).toEqual({ error: "forbidden" });
    expect(await partnerPoster(s.deps, user(CLIENT), "uz")).toEqual({ error: "forbidden" });
    expect(await partnerPoster(s.deps, user(MANAGER), "uz")).toEqual({ error: "forbidden" });
  });

  it("менеджер видит только свою сеть: свою оплату, своего партнёра, заработок 500 ₸", async () => {
    const { s, o, o2 } = await world();
    const r = await rolePanel(s.deps, user(MANAGER), "m");
    if (!("role" in r) || r.role !== "manager") throw new Error(JSON.stringify(r));
    expect(r.payments.map((p) => p.number)).toEqual([o.number]);
    expect(r.payments.map((p) => p.number)).not.toContain(o2.number);
    expect(r.partners.map((p) => p.name)).toEqual(["Салон Малика"]);
    expect(r.earn).toMatchObject({ orders: 1, amount: 500 });
    expect(r.cards).toMatchObject({ paid: 1, partners: 1 });
  });

  it("партнёр — только свои оплаты: номер, первая буква, сумма; ссылка с его кодом; постер — в его чат", async () => {
    const { s, o, o2, mine } = await world();
    const r = await rolePanel(s.deps, user(PARTNER), "a");
    if (!("role" in r) || r.role !== "partner") throw new Error(JSON.stringify(r));
    expect(r.payments).toEqual([{ number: o.number, paidAt: expect.any(String), amount: o.amount, initial: expect.stringMatching(/^.$/), partner: null }]);
    expect(JSON.stringify(r)).not.toContain(String(o2.number) + ",");
    expect(r.cards).toMatchObject({ paid: 1, earned: 1000 });
    expect(r.link).toContain(`start=${partnerSource(mine.code)}`);
    // Чужой партнёр не видит оплату этого партнёра
    const other = await rolePanel(s.deps, user(OTHER_PARTNER), "a");
    if (!("role" in other) || other.role !== "partner") throw new Error("other");
    expect(other.payments.map((p) => p.number)).toEqual([o2.number]);
    const before = s.tg.to(PARTNER).length;
    expect(await partnerPoster(s.deps, user(PARTNER), "ru")).toEqual({ ok: true });
    expect(s.tg.to(PARTNER).length).toBeGreaterThan(before);
    expect(s.tg.to(OTHER_PARTNER).some((m) => m.text?.includes(mine.code))).toBe(false);
  });

  // этап 3: партнёр работает в боте (короткое меню); панель в приложении — у менеджера
  it("кнопка «🖥 Панель» в меню менеджера ведёт на /app/panel", async () => {
    const { s } = await world();
    for (const id of [MANAGER]) {
      await s.start(id);
      if (s.lastText(id)?.startsWith("Тилни танланг")) await s.click(id, uz.langUz);
      const rows = (s.last(id)?.markup as { inline: { text: string; webApp?: string }[][] }).inline.flat();
      expect(rows.find((b) => b.text === "🖥 Панель")?.webApp).toBe(`${APP}/panel`);
    }
  });
});

describe("панели: ревью", () => {
  it("постер не чаще раза в минуту; отклонённый партнёр и снятый менеджер — forbidden", async () => {
    const { s, other } = await world();
    expect(await partnerPoster(s.deps, user(OTHER_PARTNER), "uz")).toEqual({ ok: true });
    expect(await partnerPoster(s.deps, user(OTHER_PARTNER), "uz")).toEqual({ error: "tooOften" });
    void other;
    const rej = await s.repo.createPartner({ code: "rejectd1", name: "Отклонён", telegramId: 902, username: null, rate: 1000, status: "pending" });
    expect(await s.repo.decidePartner(rej.id, "rejected")).toBe(true);
    expect(await rolePanel(s.deps, user(902), "m")).toEqual({ error: "forbidden" });
    await s.repo.removeManager(MANAGER, s.clock);
    expect(await rolePanel(s.deps, user(MANAGER), "m")).toEqual({ error: "forbidden" });
  });
});
