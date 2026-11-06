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
    await app.confirmPay(sim.deps, user(91), o.id, true);
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
    await app.confirmPay(sim.deps, user(96), o.id, true);
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

describe("п.18: шартлар", () => {
  it("без «Шартларга розиман» реквизиты не открываются; с ним — время согласия рядом с pay_confirmed_at", async () => {
    const sim = new Sim();
    const o = await namuna(sim, 101);
    expect(await app.confirmPay(sim.deps, user(101), o.id)).toEqual({ error: "terms" });
    expect(await app.confirmPay(sim.deps, user(101), o.id, "true")).toEqual({ error: "terms" });
    expect((await sim.repo.getOrder(o.id))!.payConfirmedAt ?? null).toBeNull();
    const r = await app.confirmPay(sim.deps, user(101), o.id, true);
    expect("ok" in r).toBe(true);
    const saved = (await sim.repo.getOrder(o.id))!;
    expect(saved.termsAcceptedAt).toEqual(saved.payConfirmedAt);
    expect(saved.termsAcceptedAt).toBeInstanceOf(Date);
  });
});

it("п.18, чат: в проверке перед оплатой есть ссылка на шартлар; «✅ Ҳаммаси тўғри» сохраняет время согласия", async () => {
  const { nikohWithReceipt } = await import("../testing/paths");
  const sim = new Sim();
  const o = await nikohWithReceipt(sim, 102);
  expect(sim.tg.to(102).some((m) => m.text?.includes("/terms"))).toBe(true);
  expect((await sim.repo.getOrder(o.id))!.termsAcceptedAt).toBeInstanceOf(Date);
});

describe("п.21: музыка", () => {
  const music = [
    { id: "yor-yor", titleUz: "Ёр-ёр", titleRu: "Ёр-ёр", fileUrl: "https://cdn.test/music/yor-yor.mp3", telegramFileId: null, sort: 1, occasion: "nikoh" as const },
    { id: "osh-kuy", titleUz: "Ош куйи", titleRu: "Ош куйи", fileUrl: "https://cdn.test/music/osh.mp3", telegramFileId: null, sort: 2, occasion: "nahorgi" as const },
  ];
  const OWN = `https://abcd.supabase.co/storage/v1/object/public/music/own/${"c".repeat(32)}.mp3`;

  it("готовые мелодии других тадбиров — ниже, с категорией; выбранная сохраняется в заказе и играет в НАМУНА", async () => {
    const { invitationData } = await import("@/lib/orders");
    const sim = new Sim({ music });
    const m = await app.musicFor(sim.deps, design.id, "uz");
    if ("error" in m) throw new Error("music");
    expect(m.tracks.map((t) => t.id)).toEqual(["yor-yor"]);
    expect(m.others).toEqual([{ id: "osh-kuy", title: "Ош куйи", url: "https://cdn.test/music/osh.mp3", occasion: "nahorgi" }]);
    const r = await app.submitDraft(sim.deps, user(103), { templateId: design.id, form, music: { kind: "list", musicId: "osh-kuy" } });
    if (!("ok" in r)) throw new Error(JSON.stringify(r));
    const o = (await sim.repo.getOrder(r.order.id))!;
    expect(o.music).toEqual({ kind: "list", musicId: "osh-kuy" });
    expect(invitationData(o, "https://cdn.test/music/osh.mp3").musicUrl).toBe("https://cdn.test/music/osh.mp3");
  });

  it("своя песня из приложения: подписанная загрузка (до 20 МБ, только аудио), сохраняется в заказе и играет в НАМУНА", async () => {
    const { invitationData } = await import("@/lib/orders");
    const sim = new Sim({ music });
    sim.deps.signMusicUpload = async (path) => ({ signedUrl: `https://abcd.supabase.co/sign/${path}`, url: `https://abcd.supabase.co/storage/v1/object/public/music/${path}` });
    expect(await app.musicUpload(sim.deps, "exe", 100)).toEqual({ error: "format" });
    expect(await app.musicUpload(sim.deps, "mp3", 21 * 1024 * 1024)).toEqual({ error: "tooBig" });
    const up = await app.musicUpload(sim.deps, "MP3", 3_000_000);
    if ("error" in up) throw new Error("upload");
    expect(up.url).toMatch(/\/music\/own\/[a-f0-9]{32}\.mp3$/);
    const r = await app.submitDraft(sim.deps, user(104), { templateId: design.id, form, music: { kind: "own", url: OWN, title: "Бизнинг қўшиқ" } });
    if (!("ok" in r)) throw new Error(JSON.stringify(r));
    const o = (await sim.repo.getOrder(r.order.id))!;
    expect(o.music).toMatchObject({ kind: "own", url: OWN, title: "Бизнинг қўшиқ" });
    expect(invitationData(o).musicUrl).toBe(OWN);
    expect((await app.openSession(sim.deps, user(104))).draft?.music).toEqual({ kind: "own", url: OWN, title: "Бизнинг қўшиқ" });
    // Чужой адрес вместо нашего бакета не принимается
    const bad = await app.submitDraft(sim.deps, user(105), { templateId: design.id, form, music: { kind: "own", url: `https://evil.test/storage/v1/object/public/music/own/${"d".repeat(32)}.mp3` } });
    if (!("ok" in bad)) throw new Error("bad");
    expect((await sim.repo.getOrder(bad.order.id))!.music).toEqual({ kind: "list", musicId: "yor-yor" });
  });
});
