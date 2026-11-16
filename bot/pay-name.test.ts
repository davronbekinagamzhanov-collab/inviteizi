/**
 * Оплата без чека (17.11.2026): «✅ Тўладим» → имя, как в Kaspi → владельцу «№ · сумма · от … · время» → ✅ → ссылка.
 * ❌ «Тўлов келмади» → клиент жмёт ещё раз; акция/оптовик с этим путём; чек по желанию (в т.ч. пересланный из Kaspi).
 */
import { beforeEach, describe, expect, it } from "vitest";
import { resetRateLimits } from "@/lib/rate-limit";
import { uz } from "@/texts/bot-uz";
import { payTexts } from "@/texts/pay";
import type { AppUser } from "@/lib/tg-init-data";
import { appAction } from "./app/dispatch";
import { ownerAdmin } from "./app/owner-admin";
import { nikohOrder } from "./testing/paths";
import { ADMIN, Sim } from "./testing/sim";

const T = payTexts.uz;
const user = (id: number): AppUser => ({ id, firstName: null, username: null, languageCode: null });

/** Заказ → «Тўлаш» → «✅ Ҳаммаси тўғри» → экран оплаты */
async function toPayment(s: Sim, id: number) {
  const o = await nikohOrder(s, id);
  await s.click(id, /^💳 Тўлаш/);
  await s.click(id, uz.pay.confirmYes);
  return (await s.repo.getOrder(o.id))!;
}

describe("оплата без чека: «✅ Тўладим»", () => {
  // Лимит «Тўладим» — в памяти процесса по id заказа; у тестовых баз id совпадают
  beforeEach(() => resetRateLimits());
  it("экран оплаты: сумма, номер Kaspi, «Тўладим», чек — по желанию; имя → владельцу карточка → ✅ → ссылка", async () => {
    const s = new Sim();
    const o = await toPayment(s, 1);
    const screen = s.lastText(1);
    expect(screen).toContain("7 990 ₸");
    expect(screen).toContain(T.how);
    await s.click(1, T.paid);
    expect(s.lastText(1)).toBe(T.askName);
    await s.text(1, "Д");
    expect(s.tg.to(1).some((m) => m.text.includes(T.nameBad))).toBe(true);
    await s.text(1, "  Давронбек   И. ");
    const sent = (await s.repo.getOrder(o.id))!;
    expect(sent).toMatchObject({ status: "receipt_sent", payerName: "Давронбек И.", receipt: null });
    expect(s.lastText(1)).toBe(T.checking);
    // Владельцу: «№ · сумма · от кого · время» + ✅/❌
    const card = s.tg.to(ADMIN).find((m) => m.text.includes("Давронбек И."))!;
    expect(card.text.split("\n")[0]).toMatch(
      new RegExp(`^💳 №${o.number} · 7.990 ₸ · Давронбек И\\. · \\d\\d:\\d\\d$`),
    );
    await s.callback(ADMIN, `ok:${o.number}`, card.id);
    expect((await s.repo.getOrder(o.id))!.status).toBe("active");
    expect(s.tg.to(1).some((m) => m.text.includes(`/${sent.slug}`))).toBe(true);
  });

  it("❌ «Тўлов келмади» → клиент может нажать «Тўладим» ещё раз", async () => {
    const s = new Sim();
    const o = await toPayment(s, 1);
    await s.click(1, T.paid);
    await s.text(1, "Давронбек И.");
    const card = s.tg.to(ADMIN).find((m) => m.text.includes("Давронбек И."))!;
    await s.callback(ADMIN, `no:${o.number}`, card.id);
    await s.callback(ADMIN, `nr:${o.number}:nopay`, card.id);
    expect(await s.repo.getOrder(o.id)).toMatchObject({ status: "rejected", rejectReason: uz.admin.reasons.nopay });
    expect(s.lastText(1)).toContain(uz.admin.reasons.nopay);
    await s.click(1, T.paid);
    await s.text(1, "Давронбек Ибрагимов");
    expect(await s.repo.getOrder(o.id)).toMatchObject({ status: "receipt_sent", payerName: "Давронбек Ибрагимов" });
  });

  it("не чаще 3 раз в час на заказ; длинное имя — ошибка", async () => {
    const s = new Sim();
    const o = await toPayment(s, 1);
    const pay = (name: string) => appAction(s.deps, user(1), { action: "paidByName", orderId: o.id, name });
    expect((await pay("x".repeat(41))).body).toEqual({ error: "name" });
    for (let i = 0; i < 3; i++) {
      await s.repo.transition(o.id, ["receipt_sent"], "rejected");
      expect((await pay("Давронбек И.")).status, `попытка ${i + 1}`).toBe(200);
    }
    await s.repo.transition(o.id, ["receipt_sent"], "rejected");
    expect(await pay("Давронбек И.")).toEqual({ status: 429, body: { error: "tooOften" } });
  });

  it("акция и оптовик фиксируются так же, как при чеке", async () => {
    const s = new Sim();
    const admin = (a: Parameters<typeof ownerAdmin>[2], b: Record<string, unknown>) =>
      ownerAdmin(s.deps, user(ADMIN), a, b) as Promise<Record<string, unknown>>;
    await admin("ownerPromotionCreate", {
      name: "Куз",
      percent: 50,
      startsAt: "2026-11-01T00:00",
      endsAt: "2026-11-08T00:00",
    });
    const o = await toPayment(s, 1);
    expect(o.amount).toBe(3990);
    await s.click(1, T.paid);
    await s.text(1, "Мадина К.");
    expect(await s.repo.getOrder(o.id)).toMatchObject({
      status: "receipt_sent",
      amount: 3990,
      pricing: { kind: "promotion" },
    });
    // оптовик
    await s.start(9);
    await s.click(9, uz.langUz).catch(() => {});
    await admin("ownerWholesaleSet", { userId: 9, percent: 20 });
    const w = await toPayment(s, 9);
    expect(w.amount).toBe(6390);
    const r = await appAction(s.deps, user(9), { action: "paidByName", orderId: w.id, name: "Тўйхона" });
    expect(r.body).toMatchObject({ ok: true });
    expect(await s.repo.getOrder(w.id)).toMatchObject({ status: "receipt_sent", amount: 6390, payerName: "Тўйхона" });
  });

  it("чек по желанию: пересланный из Kaspi в чат — к заказу «Тўладим», владельцу уходит чек", async () => {
    const s = new Sim();
    const o = await toPayment(s, 1);
    await s.click(1, T.paid);
    await s.text(1, "Давронбек И.");
    await s.photo(1, "KASPI_RECEIPT");
    const after = (await s.repo.getOrder(o.id))!;
    expect(after).toMatchObject({
      status: "receipt_sent",
      payerName: "Давронбек И.",
      receipt: { fileId: "KASPI_RECEIPT" },
    });
    expect(s.lastText(1)).toBe(T.receiptAttached);
    expect(s.tg.to(ADMIN).some((m) => m.type === "photo" && m.text.startsWith(T.adminReceipt(o.number)))).toBe(true);
  });

  it("прежний путь с чеком работает: «📎 Чек юбориш» → фото → на проверке", async () => {
    const s = new Sim();
    const o = await toPayment(s, 1);
    await s.click(1, T.receiptOptional);
    await s.photo(1, "RECEIPT");
    expect((await s.repo.getOrder(o.id))!).toMatchObject({ status: "receipt_sent", receipt: { fileId: "RECEIPT" } });
  });

  it("Mini App: чужой заказ — не найдено; без «✅ Ҳаммаси тўғри» — нельзя", async () => {
    const s = new Sim();
    const o = await nikohOrder(s, 1);
    expect((await appAction(s.deps, user(2), { action: "paidByName", orderId: o.id, name: "Кимдир" })).body).toEqual({
      error: "notFound",
    });
    expect((await appAction(s.deps, user(1), { action: "paidByName", orderId: o.id, name: "Мадина" })).body).toEqual({
      error: "notConfirmed",
    });
  });
});
