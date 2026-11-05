/**
 * Сервер Mini App: полный путь 4 тадбира × uz/ru, черновик, двойные нажатия, смена дизайна до оплаты, чек.
 * Хранилище в памяти и поддельный Telegram — как у сценариев чата.
 */
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { ADMIN, ADMIN2, Sim } from "../testing/sim";
import { activeDesigns, getDesign, PRICES } from "@/templates/registry";
import type { AppUser } from "@/lib/tg-init-data";
import type { Occasion } from "@/lib/types";
import * as app from "./service";

const user = (id: number, lang = "uz"): AppUser => ({ id, firstName: "Апа", username: `u${id}`, languageCode: lang });
const DATE = "2027-06-12";

function form(occasion: Occasion) {
  const ev = { date: DATE, time: "18:00", venueName: "Наврўз тўйхонаси", address: "Сайрам, Амир Темур 45" };
  const base = { hosts: "Каримовлар оиласи", events: [ev] };
  switch (occasion) {
    case "nikoh":
      return { ...base, groom: "Азиз", bride: "Мадина" };
    case "sunnat":
      return { ...base, person: "Аҳмад", relation: "ogil" as const };
    case "nahorgi":
      return { ...base, person: "Жасурбек", relation: "ogil" as const, cause: "nikoh" as const };
    case "yubiley":
      return { ...base, person: "Мукаррам опа", relation: "ona" as const, age: 60 };
  }
}

const first = (occasion: Occasion, pick: (d: ReturnType<typeof activeDesigns>[number]) => boolean = () => true) =>
  activeDesigns().find((d) => d.occasion === occasion && pick(d))!;

const jpeg = () => sharp({ create: { width: 64, height: 64, channels: 3, background: "#e8d9c0" } }).jpeg().toBuffer().then((b) => new Uint8Array(b));

describe("приложение: полный путь", () => {
  for (const occasion of ["nikoh", "sunnat", "nahorgi", "yubiley"] as Occasion[]) {
    for (const lang of ["uz", "ru"]) {
      it(`${occasion} · ${lang}: черновик → НАМУНА с умными значениями`, async () => {
        const sim = new Sim();
        const u = user(70, lang);
        const s0 = await app.openSession(sim.deps, u);
        expect(s0.lang).toBe(lang);
        expect(s0.draft).toBeNull();
        const design = first(occasion);
        const draft: app.AppDraft = { templateId: design.id, form: form(occasion) };
        expect(await app.saveDraft(sim.deps, u, draft)).toEqual({ ok: true });
        expect((await app.openSession(sim.deps, u)).draft?.templateId).toBe(design.id);

        const r = await app.submitDraft(sim.deps, u, draft);
        if (!("ok" in r)) throw new Error(JSON.stringify(r));
        expect(r.created).toBe(true);
        expect(r.order.amount).toBe(PRICES[design.format]);
        expect(r.order.status).toBe("preview");
        expect(r.order.url).toMatch(/^https:\/\/inviteizi\.vercel\.app\/[a-z0-9-]+$/);
        const o = (await sim.repo.getOrder(r.order.id))!;
        expect(o.data.textId).toBeTruthy();
        expect(o.data.rsvp).toBe(true);
        expect(o.music).toEqual({ kind: "list", musicId: "yor-yor" });
        // Админу ничего не уходит до чека, клиенту в чат — тоже (всё видно в приложении)
        expect(sim.tg.messages).toHaveLength(0);
      });
    }
  }
});

describe("приложение: анкета", () => {
  it("пустые имена, прошлая дата, кривое время, ссылка не на карту — ошибки под полями", async () => {
    const sim = new Sim();
    const u = user(71);
    const r = await app.submitDraft(sim.deps, u, {
      templateId: first("nikoh").id,
      form: { groom: "  ", bride: "‎‎", hosts: "!!!", events: [{ date: "2026-10-01", time: "25:00", venueName: "Тўйхона", address: "Сайрам", mapUrl: "https://evil.example/x" }] },
    });
    expect(r).toEqual({ error: "fields", fields: expect.arrayContaining(["groom", "bride", "hosts", "ev0.past", "ev0.time", "ev0.mapUrl"]) });
    expect(await sim.repo.listOrdersByUser(71)).toHaveLength(0);
  });

  it("юбилей: возраст 0 и 200 — ошибка; наҳорги без повода — ошибка", async () => {
    const sim = new Sim();
    for (const age of [0, 200, 1.5]) {
      const r = await app.submitDraft(sim.deps, user(72), { templateId: first("yubiley").id, form: { ...form("yubiley"), age } });
      expect(r).toMatchObject({ error: "fields", fields: ["age"] });
    }
    const r = await app.submitDraft(sim.deps, user(72), { templateId: first("nahorgi").id, form: { ...form("nahorgi"), cause: undefined } });
    expect(r).toMatchObject({ error: "fields", fields: ["cause"] });
  });

  it("скрытый дизайн и несуществующий — не купить", async () => {
    const sim = new Sim();
    expect(await app.submitDraft(sim.deps, user(73), { templateId: "islimi-varaq", form: form("nikoh") })).toEqual({ error: "design" });
    expect(await app.submitDraft(sim.deps, user(73), { templateId: "nope", form: form("nikoh") })).toEqual({ error: "design" });
  });

  it("свой текст: переносы строк сохраняются, больше 600 знаков — не сохраняется", async () => {
    const sim = new Sim();
    const u = user(74);
    const r = await app.submitDraft(sim.deps, u, { templateId: first("nikoh").id, form: form("nikoh"), customText: "Азиз меҳмонлар!\nТўйимизга келинг 🌸" });
    if (!("ok" in r)) throw new Error("ожидали заказ");
    expect((await sim.repo.getOrder(r.order.id))!.data.customText).toBe("Азиз меҳмонлар!\nТўйимизга келинг 🌸");
    const long = await app.submitDraft(sim.deps, u, { templateId: first("nikoh").id, form: form("nikoh"), customText: "а".repeat(601) });
    if (!("ok" in long)) throw new Error("ожидали заказ");
    expect((await sim.repo.getOrder(long.order.id))!.data.customText).toBeUndefined();
  });
});

describe("приложение: двойные нажатия и правки", () => {
  it("двойная отправка формы одновременно — один заказ", async () => {
    const sim = new Sim();
    const u = user(75);
    const d: app.AppDraft = { templateId: first("nikoh").id, form: form("nikoh") };
    const [a, b] = await Promise.all([app.submitDraft(sim.deps, u, d), app.submitDraft(sim.deps, u, d)]);
    expect("ok" in a && "ok" in b).toBe(true);
    expect(await sim.repo.listOrdersByUser(75)).toHaveLength(1);
    // И ещё раз позже тем же черновиком — та же ссылка
    await app.submitDraft(sim.deps, u, d);
    expect(await sim.repo.listOrdersByUser(75)).toHaveLength(1);
  });

  it("смена дизайна до оплаты: цена следует за форматом, ссылка та же, фото уходят у дизайна без фото", async () => {
    const sim = new Sim();
    const u = user(76);
    const photo = `https://hjakyirmyauqhurkqhsn.supabase.co/storage/v1/object/public/photos/client/${"a".repeat(64)}.webp`;
    const withPhotos = first("nikoh", (d) => !!d.clientPhotos);
    const r1 = await app.submitDraft(sim.deps, u, { templateId: withPhotos.id, form: form("nikoh"), photos: [photo] });
    if (!("ok" in r1)) throw new Error("ожидали заказ");
    expect((await sim.repo.getOrder(r1.order.id))!.data.photos).toEqual([photo]);
    const other = first("nikoh", (d) => d.format !== withPhotos.format && !d.clientPhotos);
    const r2 = await app.submitDraft(sim.deps, u, { templateId: other.id, form: form("nikoh"), photos: [photo], orderId: r1.order.id });
    if (!("ok" in r2)) throw new Error(JSON.stringify(r2));
    expect(r2.created).toBe(false);
    expect(r2.order).toMatchObject({ id: r1.order.id, url: r1.order.url, amount: PRICES[other.format], templateId: other.id });
    expect((await sim.repo.getOrder(r1.order.id))!.data.photos).toBeUndefined();
  });

  it("чужие фото-адреса не попадают в приглашение", async () => {
    const sim = new Sim();
    const r = await app.submitDraft(sim.deps, user(77), { templateId: first("nikoh", (d) => !!d.clientPhotos).id, form: form("nikoh"), photos: ["https://evil.example/a.webp", "javascript:alert(1)"] });
    if (!("ok" in r)) throw new Error("ожидали заказ");
    expect((await sim.repo.getOrder(r.order.id))!.data.photos).toBeUndefined();
  });

  it("чужой заказ не открыть и не изменить", async () => {
    const sim = new Sim();
    const r = await app.submitDraft(sim.deps, user(78), { templateId: first("nikoh").id, form: form("nikoh") });
    if (!("ok" in r)) throw new Error("ожидали заказ");
    expect(await app.editOrder(sim.deps, user(79), r.order.id)).toEqual({ error: "notFound" });
    expect(await app.submitDraft(sim.deps, user(79), { templateId: first("nikoh").id, form: form("nikoh"), orderId: r.order.id })).toEqual({ error: "notFound" });
    expect(await app.submitReceipt(sim.deps, user(79), r.order.id, { bytes: await jpeg(), mime: "image/jpeg", name: "a.jpg" })).toEqual({ error: "notFound" });
  });

  it("после оплаты правки закрыты, «Янги» начинает чистый черновик", async () => {
    const sim = new Sim();
    const u = user(80);
    const r = await app.submitDraft(sim.deps, u, { templateId: first("nikoh").id, form: form("nikoh") });
    if (!("ok" in r)) throw new Error("ожидали заказ");
    await sim.repo.updateOrder(r.order.id, { status: "active", paidAt: sim.clock });
    expect(await app.editOrder(sim.deps, u, r.order.id)).toEqual({ error: "closed" });
    expect(await app.submitDraft(sim.deps, u, { templateId: first("nikoh").id, form: form("nikoh"), orderId: r.order.id })).toEqual({ error: "closed" });
    await app.newDraft(sim.deps, u);
    expect((await app.openSession(sim.deps, u)).draft).toBeNull();
    const again = await app.submitDraft(sim.deps, u, { templateId: first("nikoh").id, form: form("nikoh") });
    expect("ok" in again && again.created).toBe(true);
    expect(await sim.repo.listOrdersByUser(80)).toHaveLength(2);
  });
});

describe("приложение: чек", () => {
  async function order(sim: Sim, id: number) {
    const r = await app.submitDraft(sim.deps, user(id), { templateId: first("nikoh").id, form: form("nikoh") });
    if (!("ok" in r)) throw new Error("ожидали заказ");
    return r.order;
  }

  it("фото чека → карточка обоим админам, второй получает тот же file_id; двойная отправка — «ждите»", async () => {
    const sim = new Sim();
    const o = await order(sim, 81);
    const [a, b] = await Promise.all([
      app.submitReceipt(sim.deps, user(81), o.id, { bytes: await jpeg(), mime: "image/jpeg", name: "chek.jpg" }),
      app.submitReceipt(sim.deps, user(81), o.id, { bytes: await jpeg(), mime: "image/jpeg", name: "chek.jpg" }),
    ]);
    expect([a, b]).toEqual(expect.arrayContaining([{ ok: true, night: false }, { error: "waiting" }]));
    const saved = (await sim.repo.getOrder(o.id))!;
    expect(saved.status).toBe("receipt_sent");
    const toAdmins = sim.tg.messages.filter((m) => m.chatId === ADMIN || m.chatId === ADMIN2);
    expect(toAdmins).toHaveLength(2);
    expect(toAdmins.every((m) => m.type === "photo" && m.text.includes(`№${o.number}`) || m.text.includes(String(o.number)))).toBe(true);
    expect(toAdmins[1].media).toBe(saved.receipt!.fileId);
  });

  it("PDF уходит документом; ночью ответ «эрталаб»", async () => {
    const sim = new Sim({ now: "2026-11-01T18:30:00Z" }); // 23:30 в Сайраме
    const o = await order(sim, 82);
    const pdf = new TextEncoder().encode("%PDF-1.4\n%чек\n");
    expect(await app.submitReceipt(sim.deps, user(82), o.id, { bytes: pdf, mime: "application/pdf", name: "chek.pdf" })).toEqual({ ok: true, night: true });
    expect(sim.tg.messages.filter((m) => m.chatId === ADMIN)[0]).toMatchObject({ type: "document", fileName: "chek.pdf" });
  });

  it("мусор вместо картинки, пустой и больше 10 МБ — отказ, заказ остаётся к оплате", async () => {
    const sim = new Sim();
    const o = await order(sim, 83);
    expect(await app.submitReceipt(sim.deps, user(83), o.id, { bytes: new TextEncoder().encode("not an image"), mime: "image/heic", name: "a.heic" })).toEqual({ error: "format" });
    expect(await app.submitReceipt(sim.deps, user(83), o.id, { bytes: new Uint8Array(), mime: "image/jpeg", name: "a.jpg" })).toEqual({ error: "format" });
    expect(await app.submitReceipt(sim.deps, user(83), o.id, { bytes: new Uint8Array(app.RECEIPT_MAX_BYTES + 1), mime: "image/jpeg", name: "a.jpg" })).toEqual({ error: "tooBig" });
    expect((await sim.repo.getOrder(o.id))!.status).toBe("preview");
  });

  it("ни один админ не получил чек — заказ снова к оплате, клиенту «отправьте ещё раз»", async () => {
    const sim = new Sim();
    const o = await order(sim, 84);
    sim.tg.sendPhoto = async () => {
      throw new Error("blocked");
    };
    expect(await app.submitReceipt(sim.deps, user(84), o.id, { bytes: await jpeg(), mime: "image/jpeg", name: "a.jpg" })).toEqual({ error: "send" });
    expect((await sim.repo.getOrder(o.id))!.status).toBe("preview");
  });

  it("тадбир прошёл — чек не принимается", async () => {
    const sim = new Sim();
    const o = await order(sim, 85);
    sim.advance(400 * 24 * 60);
    expect(await app.submitReceipt(sim.deps, user(85), o.id, { bytes: await jpeg(), mime: "image/jpeg", name: "a.jpg" })).toEqual({ error: "passed" });
  });
});

describe("приложение: избранное и музыка", () => {
  it("❤️ сохранить и убрать; чужой id — отказ", async () => {
    const sim = new Sim();
    const id = first("nikoh").id;
    expect(await app.toggleFavorite(sim.deps, user(86), id, true)).toEqual({ favorites: [id] });
    expect(await app.toggleFavorite(sim.deps, user(86), id, false)).toEqual({ favorites: [] });
    expect(await app.toggleFavorite(sim.deps, user(86), "../x", true)).toEqual({ error: "bad" });
  });

  it("мелодии тадбира с адресом для ▶", async () => {
    const sim = new Sim();
    const r = await app.musicFor(sim.deps, getDesign(first("nikoh").id)!.id, "ru");
    expect("tracks" in r && r.tracks[0]).toEqual({ id: "yor-yor", title: "Ёр-ёр", url: "https://cdn.test/music/yor-yor.mp3" });
  });
});
