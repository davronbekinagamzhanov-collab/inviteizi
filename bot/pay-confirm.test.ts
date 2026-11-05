/** Ночь п.2–3: проверка перед оплатой (чат и приложение), время подтверждения, номер заказа для Kaspi, карточка чека */
import { describe, expect, it } from "vitest";
import { uz } from "@/texts/bot-uz";
import { ru } from "@/texts/bot-ru";
import { kk } from "@/texts/bot-kk";
import { appUz } from "@/texts/app-uz";
import { activeDesigns } from "@/templates/registry";
import type { AppUser } from "@/lib/tg-init-data";
import * as app from "./app/service";
import { TG_LIMITS } from "./testing/fake-tg";
import { nikohOrder } from "./testing/paths";
import { ADMIN, Sim } from "./testing/sim";

describe("проверка перед оплатой — чат", () => {
  it("«💳 Тўлаш» → сводка + предупреждение, реквизитов нет; «✅ Ҳаммаси тўғри» → реквизиты и время в заказе", async () => {
    const s = new Sim();
    const o = await nikohOrder(s, 1);
    await s.click(1, /^💳 Тўлаш/);
    const check = s.lastText(1);
    expect(check).toContain("Азиз ва Мадина");
    expect(check).toContain("14.11.2026, 18:00 · «Наврўз» тўйхонаси");
    expect(check).toContain("пул қайтарилмайди");
    expect(check).not.toContain(s.deps.env.kaspiPhone);
    expect((await s.repo.getOrder(o.id))!.payConfirmedAt).toBeNull();
    await s.click(1, uz.pay.confirmYes);
    expect(s.lastText(1)).toContain(s.deps.env.kaspiPhone);
    expect(s.lastText(1)).toContain(`#${o.number}`);
    expect((await s.repo.getOrder(o.id))!.payConfirmedAt).toEqual(s.clock);
    // Двойное нажатие — реквизиты те же, без ошибки
    await s.callback(1, `payok:${o.number}`, 1);
    expect(s.lastText(1)).toContain(s.deps.env.kaspiPhone);
  });

  it("чужой заказ и оплаченный — «payok» не открывает реквизиты", async () => {
    const s = new Sim();
    const o = await nikohOrder(s, 1);
    await s.start(2);
    await s.click(2, uz.langUz);
    await s.callback(2, `payok:${o.number}`, 1);
    expect(s.lastText(2)).not.toContain(s.deps.env.kaspiPhone);
  });

  it("карточка чека у админа: крупно сумма и номер", async () => {
    const s = new Sim();
    await s.start(ADMIN);
    await s.click(ADMIN, uz.langUz);
    const o = await nikohOrder(s, 1);
    await s.callback(1, `payok:${o.number}`, 1);
    await s.photo(1, "R");
    const card = s.tg.to(ADMIN).at(-1)!.text!;
    expect(card).toContain("💰 КУТИЛГАН СУММА: 8 000 ₸");
    expect(card).toContain(`🔢 ИЗОҲДА: #${o.number}`);
  });

  it("лимиты на uz/ru/kk", () => {
    const long = Array(3).fill(`📅 31.12.2027, 23:59 · ${"Ш".repeat(80)}`).join("\n");
    for (const tx of [uz, ru, kk]) {
      expect(tx.pay.check(`${"Ш".repeat(80)} ва ${"Ш".repeat(80)}\n${long}`, `https://inviteizi.vercel.app/${"a".repeat(60)}`).length).toBeLessThanOrEqual(TG_LIMITS.message);
      expect(tx.pay.confirmYes.length).toBeLessThanOrEqual(TG_LIMITS.button);
    }
    expect(Buffer.byteLength("payok:99999999")).toBeLessThanOrEqual(TG_LIMITS.callbackData);
  });
});

describe("проверка перед оплатой — приложение", () => {
  it("заказ без подтверждения → confirmed false; confirmPay → время в заказе, confirmed true; чужой — нельзя", async () => {
    const s = new Sim();
    const u: AppUser = { id: 9, firstName: "Апа", username: "u9", languageCode: "uz" };
    const design = activeDesigns().find((d) => d.occasion === "nikoh")!;
    const form = { hosts: "Оила", groom: "Азиз", bride: "Мадина", events: [{ date: "2027-06-12", time: "18:00", venueName: "Наврўз", address: "Сайрам" }] };
    const r = await app.submitDraft(s.deps, u, { templateId: design.id, form });
    if (!("ok" in r)) throw new Error(JSON.stringify(r));
    expect(r.order.confirmed).toBe(false);
    expect(r.order.check).toContain("12.06.2027, 18:00 · Наврўз");
    expect(await app.confirmPay(s.deps, { ...u, id: 10 }, r.order.id)).toEqual({ error: "notFound" });
    const c = await app.confirmPay(s.deps, u, r.order.id);
    if (!("ok" in c)) throw new Error(JSON.stringify(c));
    expect(c.order!.confirmed).toBe(true);
    expect((await s.repo.getOrder(r.order.id))!.payConfirmedAt).toEqual(s.clock);
    expect(appUz.pay.note(c.order!.number)).toBe(`Изоҳга ёзинг: #${c.order!.number}`);
  });
});
