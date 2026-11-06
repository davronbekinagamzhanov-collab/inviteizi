/**
 * fix/app-polish-2: «Бекор қилиш» в приложении и статусы после чека.
 * Отмена удаляет личные данные (заказ, фото, черновик), оставляет обезличенную запись шага;
 * чужой заказ, чек на проверке и оплаченный — не отменяются.
 */
import { describe, expect, it } from "vitest";
import { Sim } from "../testing/sim";
import { activeDesigns } from "@/templates/registry";
import type { AppUser } from "@/lib/tg-init-data";
import * as app from "./service";

const user = (id: number, lang = "uz"): AppUser => ({ id, firstName: "Апа", username: `u${id}`, languageCode: lang });
const PHOTO = `https://abcd.supabase.co/storage/v1/object/public/photos/client/${"a".repeat(64)}.webp`;
const design = activeDesigns().find((d) => d.occasion === "nikoh" && d.clientPhotos)!;
const form = { hosts: "Каримовлар оиласи", groom: "Азиз", bride: "Мадина", events: [{ date: "2027-06-12", time: "18:00", venueName: "Наврўз", address: "Сайрам" }] };

async function namuna(sim: Sim, id: number) {
  const r = await app.submitDraft(sim.deps, user(id), { templateId: design.id, form, photos: [PHOTO] });
  if (!("ok" in r)) throw new Error(JSON.stringify(r));
  return r.order;
}

describe("отмена незаконченного заказа", () => {
  it("НАМУНА: заказ и фото удалены, черновик пуст, осталась запись «шаг 3» без user_id", async () => {
    const sim = new Sim();
    const removed: string[] = [];
    sim.deps.removePhotos = async (urls) => void removed.push(...urls);
    const o = await namuna(sim, 90);
    expect(await app.cancelOrder(sim.deps, user(90), o.id)).toEqual({ ok: true });
    expect(await sim.repo.getOrder(o.id)).toBeNull();
    expect(removed).toEqual([PHOTO]);
    const s = await app.openSession(sim.deps, user(90));
    expect(s.draft).toBeNull();
    expect(s.orders).toHaveLength(0);
    expect(sim.repo.cancellations).toEqual([{ step: 3, occasion: "nikoh", format: design.format, templateId: design.id, createdAt: expect.any(Date) }]);
    expect(JSON.stringify(sim.repo.cancellations)).not.toMatch(/Азиз|Мадина|90/);
  });

  it("проверил перед оплатой → шаг 4; черновик без заказа → шаг 2; пустой — нечего отменять", async () => {
    const sim = new Sim();
    const o = await namuna(sim, 91);
    await app.confirmPay(sim.deps, user(91), o.id);
    expect(await app.cancelOrder(sim.deps, user(91), o.id)).toEqual({ ok: true });
    await app.saveDraft(sim.deps, user(92), { templateId: design.id, form: { groom: "Ali" } });
    expect(await app.cancelOrder(sim.deps, user(92), undefined)).toEqual({ ok: true });
    expect((await app.openSession(sim.deps, user(92))).draft).toBeNull();
    expect(sim.repo.cancellations.map((c) => c.step)).toEqual([4, 2]);
    expect(await app.cancelOrder(sim.deps, user(92), undefined)).toEqual({ error: "notFound" });
  });

  it("атака: чужой заказ, чек на проверке, оплаченный — не отменяются и ничего не удаляют", async () => {
    const sim = new Sim();
    const removed: string[] = [];
    sim.deps.removePhotos = async (urls) => void removed.push(...urls);
    const o = await namuna(sim, 93);
    expect(await app.cancelOrder(sim.deps, user(94), o.id)).toEqual({ error: "notFound" });
    expect(await app.cancelOrder(sim.deps, user(94), { id: o.id })).toEqual({ error: "notFound" });
    await sim.repo.updateOrder(o.id, { status: "receipt_sent" });
    expect(await app.cancelOrder(sim.deps, user(93), o.id)).toEqual({ error: "waiting" });
    await sim.repo.updateOrder(o.id, { status: "active", paidAt: sim.clock });
    expect(await app.cancelOrder(sim.deps, user(93), o.id)).toEqual({ error: "closed" });
    expect(await sim.repo.getOrder(o.id)).not.toBeNull();
    expect(removed).toEqual([]);
    expect(sim.repo.cancellations).toEqual([]);
  });

  it("фото, которое есть и у другого заказа, остаётся в хранилище", async () => {
    const sim = new Sim();
    const removed: string[] = [];
    sim.deps.removePhotos = async (urls) => void removed.push(...urls);
    const a = await namuna(sim, 95);
    await app.newDraft(sim.deps, user(95));
    await namuna(sim, 95);
    expect(await app.cancelOrder(sim.deps, user(95), a.id)).toEqual({ ok: true });
    expect(removed).toEqual([]);
  });
});

describe("статусы после чека", () => {
  it("отказ: причина на языке клиента, «Чекни қайта юбориш» не требует повторной проверки", async () => {
    const sim = new Sim();
    const o = await namuna(sim, 96);
    await app.confirmPay(sim.deps, user(96), o.id);
    await sim.repo.updateOrder(o.id, { status: "rejected", rejectReason: "Пул келмади" });
    await sim.repo.setLang(96, "ru");
    const [ru] = (await app.listOrders(sim.deps, user(96))).orders;
    expect(ru.status).toBe("rejected");
    expect(ru.rejectReason).toBe("Деньги не пришли");
    expect(ru.confirmed).toBe(true);
    await sim.repo.updateOrder(o.id, { status: "active", paidAt: sim.clock });
    const [ok] = (await app.listOrders(sim.deps, user(96))).orders;
    expect([ok.status, ok.paid, ok.rejectReason]).toEqual(["active", true, null]);
  });
});

describe("п.16: текст приглашения", () => {
  it("вариант, выбранный в анкете, = в НАМУНА = в оплаченном приглашении (и в итоге «Бот танлади»)", async () => {
    const { tPlain } = await import("@/texts/uz-cyrl");
    const { invitationData } = await import("@/lib/orders");
    const sim = new Sim();
    const options = tPlain.inviteOptions({ ...form, occasion: "nikoh" } as never);
    const pick = options[2] ?? options.at(-1)!;
    await app.saveDraft(sim.deps, user(97), { templateId: design.id, form, textId: pick.id });
    expect((await app.openSession(sim.deps, user(97))).draft?.textId).toBe(pick.id);
    const r = await app.submitDraft(sim.deps, user(97), { templateId: design.id, form, textId: pick.id });
    if (!("ok" in r)) throw new Error(JSON.stringify(r));
    const namuna = (await sim.repo.getOrder(r.order.id))!;
    expect(tPlain.invite(invitationData(namuna)).body).toBe(pick.body);
    await sim.repo.updateOrder(r.order.id, { status: "active", paidAt: sim.clock });
    const paid = (await sim.repo.getOrder(r.order.id))!;
    expect(tPlain.invite(invitationData(paid))).toMatchObject({ greeting: pick.greeting, body: pick.body });
    // Свой текст из анкеты — тот же в заказе
    const own = await app.submitDraft(sim.deps, user(98), { templateId: design.id, form, customText: "Азиз меҳмонлар, тўйимизга марҳамат!" });
    if (!("ok" in own)) throw new Error("own");
    expect(tPlain.invite(invitationData((await sim.repo.getOrder(own.order.id))!)).body).toBe("Азиз меҳмонлар, тўйимизга марҳамат!");
  });
});

describe("отмена: ревью", () => {
  it("отмена старого заказа не трогает новый черновик (имена, фото)", async () => {
    const sim = new Sim();
    const removed: string[] = [];
    sim.deps.removePhotos = async (urls) => void removed.push(...urls);
    const old = await namuna(sim, 99);
    await app.newDraft(sim.deps, user(99));
    const fresh = `https://abcd.supabase.co/storage/v1/object/public/photos/client/${"b".repeat(64)}.webp`;
    await app.saveDraft(sim.deps, user(99), { templateId: design.id, form, photos: [fresh] });
    expect(await app.cancelOrder(sim.deps, user(99), old.id)).toEqual({ ok: true });
    expect((await app.openSession(sim.deps, user(99))).draft?.photos).toEqual([fresh]);
    expect(removed).not.toContain(fresh);
  });

  it("плашка черновика без orderId, а черновик привязан к заказу — удаляется и заказ", async () => {
    const sim = new Sim();
    const o = await namuna(sim, 100);
    expect(await app.cancelOrder(sim.deps, user(100), undefined)).toEqual({ ok: true });
    expect(await sim.repo.getOrder(o.id)).toBeNull();
    expect((await app.openSession(sim.deps, user(100))).draft).toBeNull();
  });
});
