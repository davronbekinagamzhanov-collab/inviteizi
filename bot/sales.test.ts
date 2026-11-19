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
  // этап 3: после выбора языка сразу меню (телефон не спрашиваем)
  return (await s.repo.getPartner(p.id))!;
}

async function toCheck(s: Sim, id: number) {
  const o = await nikohOrder(s, id);
  await s.click(id, /^💳 Тўлаш/);
  return (await s.repo.getOrder(o.id))!;
}

describe("цена со скидкой", () => {
  it("кратна 100 ₸ вниз, 100 % — 0 ₸", () => {
    // Правило владельца 17.11.2026: вниз до числа, оканчивающегося на 90
    expect(discounted(2990, 50)).toBe(1490);
    expect(discounted(4990, 50)).toBe(2490);
    expect(discounted(7990, 20)).toBe(6390);
    expect(discounted(4990, 15)).toBe(4190);
    expect(discounted(7990, 100)).toBe(0);
    expect(discounted(7990, 1)).toBe(7890);
    expect(discounted(2990, 99)).toBe(0);
  });
});

describe("акция", () => {
  it("клиент: при переходе к оплате цена со скидкой, старая зачёркнута, экономия и дата окончания", async () => {
    const s = new Sim();
    await promotion(s);
    const o = await toCheck(s, 1);
    expect(o).toMatchObject({ amount: 3990, pricing: { kind: "promotion", base: 7990, percent: 50 } });
    const text = s.lastText(1);
    expect(text).toContain(strike("7 990 ₸"));
    expect(text).toContain("3 990 ₸");
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
      expect(o.amount, `роль ${id}`).toBe(7990);
      expect(o.pricing ?? null).toBeNull();
      expect((await app.quoteOrder(s.deps, user(id), o.id)) as { order: { price: unknown } }).toMatchObject({
        order: { price: null, amount: 7990 },
      });
    }
    // менеджеру заказ создать можно только как сотруднику: цена — без акции
    const { catalogPromotion } = await import("./pricing");
    for (const id of [ADMIN, 700, 800, 900]) expect(await catalogPromotion(s.deps, id), `роль ${id}`).toBeNull();
    expect(await catalogPromotion(s.deps, 1)).toMatchObject({ percent: 50 });
    const w = await toCheck(s, 900);
    expect(w).toMatchObject({ amount: 7190, pricing: { kind: "wholesale", percent: 10 } });
  });

  it("клиент по ссылке партнёра: по умолчанию обычная цена; с переключателем — со скидкой", async () => {
    const s = new Sim();
    const p = await partner(s, 800);
    const id = await promotion(s);
    await s.start(2, partnerSource(p.code));
    expect((await toCheck(s, 2)).amount).toBe(7990);
    await admin(s, "ownerPromotionStop", { id });
    await promotion(s, { forPartnerClients: true, startsAt: "2026-11-01T12:00" });
    await s.click(2, /^💳 Тўлаш/);
    expect((await s.repo.listOrdersByUser(2))[0].amount).toBe(3990);
  });

  it("только выбранные тадбиры и форматы", async () => {
    const s = new Sim();
    await promotion(s, { occasions: ["sunnat"] });
    expect((await toCheck(s, 1)).amount).toBe(7990);
    const s2 = new Sim();
    await promotion(s2, { formats: ["animated"], occasions: ["nikoh"] });
    expect((await toCheck(s2, 1)).amount).toBe(3990);
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
    expect((await toCheck(s, 1)).amount).toBe(7990);
  });

  it("акция закончилась до чека: чек не принят, клиент видит новую сумму и подтверждает снова", async () => {
    const s = new Sim();
    await promotion(s, { endsAt: "2026-11-01T13:00" });
    const o = await toCheck(s, 1);
    expect(o.amount).toBe(3990);
    await s.click(1, uz.pay.confirmYes);
    s.advance(120);
    await s.photo(1, "RECEIPT_1");
    const after = (await s.repo.getOrder(o.id))!;
    expect(after).toMatchObject({ status: "awaiting_payment", amount: 7990, pricing: null });
    expect(s.tg.to(1).some((m) => m.text.includes(T.priceChanged("7 990 ₸")))).toBe(true);
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
    expect((await s2.repo.getOrder(o2.id))!).toMatchObject({ status: "awaiting_payment", amount: 7990 });
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
    expect(q.order).toMatchObject({ amount: 0, price: { kind: "promotion", before: 7990, saving: 7990 } });
    expect(await app.confirmPay(s.deps, user(1), o.id, true)).toMatchObject({ ok: true, free: true });
    expect((await s.repo.getOrder(o.id))!.status).toBe("active");
  });

  it("партнёру процент — только с реально оплаченной суммы (50 % акция → 15 % от 3 990)", async () => {
    const s = new Sim();
    const p = await partner(s, 800, "15%");
    await promotion(s, { forPartnerClients: true });
    await s.start(2, partnerSource(p.code));
    const o = await toCheck(s, 2);
    await s.click(2, uz.pay.confirmYes);
    await s.photo(2, "RECEIPT_2");
    await s.callback(ADMIN, `ok:${o.number}`, 1);
    expect((await panelData(s.deps)).earnings.map((e) => e.amount)).toEqual([599]);
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
    expect(o).toMatchObject({ amount: 6390, pricing: { kind: "wholesale", percent: 20 } });
    await s.click(3, uz.pay.confirmYes);
    await s.photo(3, "RECEIPT_3");
    await s.callback(ADMIN, `ok:${o.number}`, 1);
    expect((await s.repo.getOrder(o.id))!.status).toBe("active");
    expect((await panelData(s.deps)).earnings).toEqual([]);
    const list = (await admin(s, "ownerWholesalers")).wholesalers as { userId: number; orders: number; sum: number }[];
    expect(list).toEqual([expect.objectContaining({ userId: 3, percent: 20, orders: 1, sum: 6390 })]);
    expect(await admin(s, "ownerWholesaleRemove", { userId: 3 })).toEqual({ ok: true });
    expect((await toCheck(s, 3)).amount).toBe(3190);
  });

  it("сотруднику роль оптовика не даётся", async () => {
    const s = new Sim();
    await s.start(ADMIN);
    expect(await admin(s, "ownerWholesaleSet", { userId: ADMIN, percent: 10 })).toEqual({ error: "bad" });
  });
});

describe("витрина акции в боте", () => {
  it("клиенту: строка об акции при старте (один раз) и цена со скидкой в каталоге; партнёру — ничего", async () => {
    const s = new Sim();
    await partner(s, 800);
    await promotion(s);
    await s.start(1);
    await s.click(1, uz.langUz);
    await s.start(1);
    const lines = s.tg.to(1).filter((m) => m.text.includes("акцияси") || m.text.includes("Акция «Куз»"));
    expect(lines).toHaveLength(1);
    await s.text(1, uz.menu.create);
    await s.click(1, uz.category.nikoh);
    const shown = s.tg.to(1).map((m) => m.text);
    expect(shown.some((t) => t.includes(`−50 % · 3 990 ₸ ${strike("7 990 ₸")}`))).toBe(true);
    await s.start(800);
    expect(s.tg.to(800).some((m) => m.text.includes("−50 %"))).toBe(false);
  });
});

describe("кнопка оплаты до перехода к оплате", () => {
  it("после «Тасдиқлаш» кнопка «💳 Тўлаш» уже с ценой по акции (не старой)", async () => {
    const s = new Sim();
    await promotion(s);
    await nikohOrder(s, 1);
    const buttons = s.tg
      .to(1)
      .flatMap((m) => (m.markup && "inline" in m.markup ? m.markup.inline.flat() : []))
      .map((b) => b.text);
    expect(buttons.some((t) => /^💳 Тўлаш/.test(t) && t.includes("3 990"))).toBe(true);
    expect(buttons.some((t) => /^💳 Тўлаш/.test(t) && t.includes("7 990"))).toBe(false);
  });
});

describe("смена формата после фиксации цены", () => {
  it("цена акции пересчитывается от цены нового формата", async () => {
    const { upsertDraftOrder } = await import("./flow/orders");
    const s = new Sim();
    await promotion(s);
    const o = await toCheck(s, 1);
    expect(o).toMatchObject({ amount: 3990, pricing: { base: 7990 } });
    const r = await upsertDraftOrder(
      s.deps,
      1,
      {
        orderId: o.id,
        templateId: "nur-varaq",
        format: "scroll",
        occasion: o.occasion,
        data: o.data,
        music: o.music,
      } as never,
      0,
    );
    expect(r.kind).toBe("updated");
    const n = (await s.repo.getOrder(o.id))!;
    expect(n).toMatchObject({ format: "scroll", amount: 2490, pricing: { kind: "promotion", base: 4990 } });
  });
});

describe("промокод: кнопки зависят от флага", () => {
  /** Заглушка маркетинга: брони нет (настоящая логика — в Postgres-тестах) */
  const withPromos = (s: Sim, on: boolean) => {
    s.deps.env.marketing = on
      ? { ui: true, delivery: false, referrals: false, promos: true, status: false, edits: false }
      : { ui: true, delivery: false, referrals: false, promos: false, status: false, edits: false };
    (s.deps.repo as { marketing?: unknown }).marketing = {
      holdOf: async () => null,
      releaseHold: async () => false,
      releaseExpired: async () => 0,
    };
  };
  const promoButtons = (s: Sim, id: number) =>
    s.tg
      .to(id)
      .flatMap((m) => (m.markup && "inline" in m.markup ? m.markup.inline.flat() : []))
      .filter((b) => b.text === salesTexts.uz.promoBanner);

  it("флаг включён: «🎟 Промокод» в боте и «Есть промокод?» в Mini App видны клиенту на шаге оплаты", async () => {
    const s = new Sim();
    withPromos(s, true);
    const o = await toCheck(s, 1);
    expect(promoButtons(s, 1).length).toBeGreaterThan(0);
    expect(((await app.quoteOrder(s.deps, user(1), o.id)) as { order: app.AppOrder }).order.promoAllowed).toBe(true);
  });

  it("флаг выключен: кнопок нет совсем (ни в боте, ни в Mini App)", async () => {
    const s = new Sim();
    withPromos(s, false);
    const o = await toCheck(s, 1);
    expect(promoButtons(s, 1)).toEqual([]);
    expect(((await app.quoteOrder(s.deps, user(1), o.id)) as { order: app.AppOrder }).order.promoAllowed).toBe(false);
    // и прямой запрос «promo» — честный отказ, а не сбой
    expect(await app.promoForOrder(s.deps, user(1), o.id, "TOY10")).toEqual({ error: "disabled" });
  });

  it("партнёру кнопки промокода нет даже при включённом флаге", async () => {
    const s = new Sim();
    withPromos(s, true);
    await partner(s, 800);
    const o = await toCheck(s, 800);
    expect(promoButtons(s, 800)).toEqual([]);
    expect(((await app.quoteOrder(s.deps, user(800), o.id)) as { order: app.AppOrder }).order.promoAllowed).toBe(false);
  });
});

describe("новые цены (17.11.2026)", () => {
  it("2 990 / 4 990 / 7 990; неоплаченный заказ по старой цене получает новую, с чеком и оплаченный — нет", async () => {
    const { PRICES } = await import("@/templates/registry");
    expect(PRICES).toEqual({ simple: 2990, scroll: 4990, animated: 7990 });
    const s = new Sim();
    const unpaid = await nikohOrder(s, 1);
    await s.repo.updateOrder(unpaid.id, { amount: 8000 });
    const sent = await nikohOrder(s, 2);
    await s.repo.updateOrder(sent.id, { amount: 8000 });
    await s.repo.transition(sent.id, ["preview"], "receipt_sent");
    // «Менинг таклифномаларим» — показ списка
    await s.text(1, uz.menu.my);
    await s.text(2, uz.menu.my);
    expect((await s.repo.getOrder(unpaid.id))!.amount).toBe(7990);
    expect((await s.repo.getOrder(sent.id))!.amount).toBe(8000);
    // Mini App: тот же пересчёт при показе списка
    await s.repo.updateOrder(unpaid.id, { amount: 8000 });
    const list = (await app.listOrders(s.deps, user(1))).orders;
    expect(list.find((o) => o.id === unpaid.id)?.amount).toBe(7990);
  });
});
