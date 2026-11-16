/**
 * Акции и оптовики (17.11.2026): кому действует скидка, фиксация цены при переходе к оплате, 0 ₸ без чека,
 * пересчёт, если акция закончилась до чека, начисления партнёру только с оплаченной суммы.
 */
import { describe, expect, it } from "vitest";
import { uz } from "@/texts/bot-uz";
import { salesTexts, strike } from "@/texts/sales";
import type { AppUser } from "@/lib/tg-init-data";
import { partnerSource } from "@/lib/owner-panel";
import { discounted } from "./pricing";
import { ownerAdmin } from "./app/owner-admin";
import * as app from "./app/service";
import { panelData } from "./flow/partners";
import { nikohOrder } from "./testing/paths";
import { ADMIN, Sim } from "./testing/sim";

const user = (id: number): AppUser => ({ id, firstName: null, username: null, languageCode: null });
const admin = (s: Sim, action: Parameters<typeof ownerAdmin>[2], body: Record<string, unknown> = {}) =>
  ownerAdmin(s.deps, user(ADMIN), action, body) as Promise<Record<string, unknown>>;
const T = salesTexts.uz;

/** Акция с сегодняшнего дня на неделю (время Алматы) */
async function promotion(s: Sim, body: Record<string, unknown> = {}) {
  const r = await admin(s, "ownerPromotionCreate", {
    name: "Куз",
    percent: 50,
    startsAt: "2026-11-01T00:00",
    endsAt: "2026-11-08T00:00",
    ...body,
  });
  expect(r).toMatchObject({ ok: true });
  return r.id as string;
}

/** Партнёр владельца, подключённый к Telegram */
async function partner(s: Sim, tgId: number, rate = "1000") {
  const p = (await admin(s, "ownerPartnerNew", {
    name: "Салон " + tgId,
    phone: "+7 701 123 45 67",
    rate,
    schedule: "weekly",
  })) as { id: number; link: string };
  await s.start(tgId, "join_" + /start=join_([a-z0-9]+)/.exec(p.link)![1]);
  await s.click(tgId, uz.langUz);
  await s.contact(tgId, "77011234567");
  return (await s.repo.getPartner(p.id))!;
}

async function toCheck(s: Sim, id: number) {
  const o = await nikohOrder(s, id);
  await s.click(id, /^💳 Тўлаш/);
  return (await s.repo.getOrder(o.id))!;
}

describe("цена со скидкой", () => {
  it("кратна 100 ₸ вниз, 100 % — 0 ₸", () => {
    expect(discounted(8000, 50)).toBe(4000);
    expect(discounted(6000, 15)).toBe(5100);
    expect(discounted(5000, 33)).toBe(3300);
    expect(discounted(8000, 100)).toBe(0);
    expect(discounted(8000, 1)).toBe(7900);
  });
});

describe("акция", () => {
  it("клиент: при переходе к оплате цена со скидкой, старая зачёркнута, экономия и дата окончания", async () => {
    const s = new Sim();
    await promotion(s);
    const o = await toCheck(s, 1);
    expect(o).toMatchObject({ amount: 4000, pricing: { kind: "promotion", base: 8000, percent: 50 } });
    const text = s.lastText(1);
    expect(text).toContain(strike("8 000 ₸"));
    expect(text).toContain("4 000 ₸");
    expect(text).toContain(T.saving("4 000 ₸"));
    expect(text).toContain("08.11 гача");
  });

  it("не действует для админа, менеджера, партнёра и оптовика — цена обычная, бейджей нет", async () => {
    const s = new Sim();
    await promotion(s);
    const m = await admin(s, "ownerManagerInvite");
    await s.start(700, "mgr_" + /start=mgr_([a-z0-9]+)/.exec(String(m.link))![1]);
    await partner(s, 800);
    await s.start(900);
    await s.click(900, uz.langUz);
    expect(await admin(s, "ownerWholesaleSet", { userId: 900, percent: 10 })).toMatchObject({ ok: true });
    for (const id of [ADMIN, 800]) {
      const o = await toCheck(s, id);
      expect(o.amount, `роль ${id}`).toBe(8000);
      expect(o.pricing ?? null).toBeNull();
      expect((await app.quoteOrder(s.deps, user(id), o.id)) as { order: { price: unknown } }).toMatchObject({
        order: { price: null, amount: 8000 },
      });
    }
    // менеджеру заказ создать можно только как сотруднику: цена — без акции
    const { catalogPromotion } = await import("./pricing");
    for (const id of [ADMIN, 700, 800, 900]) expect(await catalogPromotion(s.deps, id), `роль ${id}`).toBeNull();
    expect(await catalogPromotion(s.deps, 1)).toMatchObject({ percent: 50 });
    const w = await toCheck(s, 900);
    expect(w).toMatchObject({ amount: 7200, pricing: { kind: "wholesale", percent: 10 } });
  });

  it("клиент по ссылке партнёра: по умолчанию обычная цена; с переключателем — со скидкой", async () => {
    const s = new Sim();
    const p = await partner(s, 800);
    const id = await promotion(s);
    await s.start(2, partnerSource(p.code));
    expect((await toCheck(s, 2)).amount).toBe(8000);
    await admin(s, "ownerPromotionStop", { id });
    await promotion(s, { forPartnerClients: true, startsAt: "2026-11-01T12:00" });
    await s.click(2, /^💳 Тўлаш/);
    expect((await s.repo.listOrdersByUser(2))[0].amount).toBe(4000);
  });

  it("только выбранные тадбиры и форматы", async () => {
    const s = new Sim();
    await promotion(s, { occasions: ["sunnat"] });
    expect((await toCheck(s, 1)).amount).toBe(8000);
    const s2 = new Sim();
    await promotion(s2, { formats: ["animated"], occasions: ["nikoh"] });
    expect((await toCheck(s2, 1)).amount).toBe(4000);
  });

  it("одна активная акция одновременно; «Остановить» — цена снова обычная", async () => {
    const s = new Sim();
    const id = await promotion(s);
    expect(
      await admin(s, "ownerPromotionCreate", {
        name: "Вторая",
        percent: 10,
        startsAt: "2026-11-05T00:00",
        endsAt: "2026-11-20T00:00",
      }),
    ).toEqual({ error: "exists" });
    expect(await admin(s, "ownerPromotionStop", { id })).toEqual({ ok: true });
    expect((await toCheck(s, 1)).amount).toBe(8000);
  });

  it("акция закончилась до чека: чек не принят, клиент видит новую сумму и подтверждает снова", async () => {
    const s = new Sim();
    await promotion(s, { endsAt: "2026-11-01T13:00" });
    const o = await toCheck(s, 1);
    expect(o.amount).toBe(4000);
    await s.click(1, uz.pay.confirmYes);
    s.advance(120);
    await s.photo(1, "RECEIPT_1");
    const after = (await s.repo.getOrder(o.id))!;
    expect(after).toMatchObject({ status: "awaiting_payment", amount: 8000, pricing: null });
    expect(s.tg.to(1).some((m) => m.text.includes(T.priceChanged("8 000 ₸")))).toBe(true);
    // Mini App: тот же пересчёт перед чеком
    const s2 = new Sim();
    await promotion(s2, { endsAt: "2026-11-01T13:00" });
    const o2 = await toCheck(s2, 1);
    expect((await app.confirmPay(s2.deps, user(1), o2.id, true)) as object).toMatchObject({ ok: true });
    s2.advance(120);
    const r = await app.submitReceipt(s2.deps, user(1), o2.id, {
      bytes: new Uint8Array([37, 80, 68, 70, 45]),
      name: "chek.pdf",
      mime: "application/pdf",
    });
    expect(r).toEqual({ error: "priceChanged" });
    expect((await s2.repo.getOrder(o2.id))!).toMatchObject({ status: "awaiting_payment", amount: 8000 });
  });

  it("100 % — без Kaspi и чека, ссылка сразу; партнёру начисления нет; в итогах акции — 1 заказ на 0 ₸", async () => {
    const s = new Sim();
    const p = await partner(s, 800);
    const id = await promotion(s, { percent: 100, forPartnerClients: true });
    await s.start(2, partnerSource(p.code));
    const o = await toCheck(s, 2);
    expect(o.amount).toBe(0);
    await s.click(2, T.freeAction);
    const done = (await s.repo.getOrder(o.id))!;
    expect(done).toMatchObject({ status: "active", amount: 0, receipt: null });
    expect(s.tg.to(2).some((m) => m.text.includes(`/${done.slug}`))).toBe(true);
    expect((await panelData(s.deps)).earnings).toEqual([]);
    const list = (await admin(s, "ownerPromotions")).promotions as { id: string; orders: number; free: number }[];
    expect(list.find((x) => x.id === id)).toMatchObject({ orders: 1, free: 1, sum: 0 });
  });

  it("Mini App: 0 ₸ по акции — confirmPay выдаёт ссылку сразу", async () => {
    const s = new Sim();
    await promotion(s, { percent: 100 });
    const o = await nikohOrder(s, 1);
    const q = (await app.quoteOrder(s.deps, user(1), o.id)) as { order: app.AppOrder };
    expect(q.order).toMatchObject({ amount: 0, price: { kind: "promotion", before: 8000, saving: 8000 } });
    expect(await app.confirmPay(s.deps, user(1), o.id, true)).toMatchObject({ ok: true, free: true });
    expect((await s.repo.getOrder(o.id))!.status).toBe("active");
  });

  it("партнёру процент — только с реально оплаченной суммы (50 % акция → 15 % от 4 000)", async () => {
    const s = new Sim();
    const p = await partner(s, 800, "15%");
    await promotion(s, { forPartnerClients: true });
    await s.start(2, partnerSource(p.code));
    const o = await toCheck(s, 2);
    await s.click(2, uz.pay.confirmYes);
    await s.photo(2, "RECEIPT_2");
    await s.callback(ADMIN, `ok:${o.number}`, 1);
    expect((await panelData(s.deps)).earnings.map((e) => e.amount)).toEqual([600]);
  });
});

describe("оптовик", () => {
  it("своя скидка, без акции; начисления партнёру с его заказов нет; снять роль — цена обычная", async () => {
    const s = new Sim();
    const p = await partner(s, 800);
    await promotion(s, { percent: 60, forPartnerClients: true });
    await s.start(3, partnerSource(p.code));
    await s.click(3, uz.langUz).catch(() => {});
    const first = await nikohOrder(s, 3);
    expect(await admin(s, "ownerWholesaleSet", { orderNumber: first.number, percent: 20 })).toMatchObject({ ok: true });
    await s.click(3, /^💳 Тўлаш/);
    const o = (await s.repo.getOrder(first.id))!;
    expect(o).toMatchObject({ amount: 6400, pricing: { kind: "wholesale", percent: 20 } });
    await s.click(3, uz.pay.confirmYes);
    await s.photo(3, "RECEIPT_3");
    await s.callback(ADMIN, `ok:${o.number}`, 1);
    expect((await s.repo.getOrder(o.id))!.status).toBe("active");
    expect((await panelData(s.deps)).earnings).toEqual([]);
    const list = (await admin(s, "ownerWholesalers")).wholesalers as { userId: number; orders: number; sum: number }[];
    expect(list).toEqual([expect.objectContaining({ userId: 3, percent: 20, orders: 1, sum: 6400 })]);
    expect(await admin(s, "ownerWholesaleRemove", { userId: 3 })).toEqual({ ok: true });
    expect((await toCheck(s, 3)).amount).toBe(3200);
  });

  it("сотруднику роль оптовика не даётся", async () => {
    const s = new Sim();
    await s.start(ADMIN);
    expect(await admin(s, "ownerWholesaleSet", { userId: ADMIN, percent: 10 })).toEqual({ error: "bad" });
  });
});
