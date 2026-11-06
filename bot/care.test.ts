/**
 * v2, часть 10: напоминания не купившим (1, 7, 14, 28 дней, 11–19, максимум 4, стоп), отзыв после тадбира,
 * автоочистка неоплаченных черновиков (оплаченное — никогда).
 */
import { describe, expect, it } from "vitest";
import { uz } from "@/texts/bot-uz";
import { ru } from "@/texts/bot-ru";
import { kk } from "@/texts/bot-kk";
import { runCron } from "./cron";
import { TG_LIMITS } from "./testing/fake-tg";
import { nikohOrder, nikohWithReceipt } from "./testing/paths";
import { ADMIN, Sim } from "./testing/sim";

const DAY = 86_400_000;
const nudgesTo = (s: Sim, id: number) => s.tg.to(id).filter((m) => uz.care.nudges.includes(m.text ?? ""));
/** Дата в 12:00 по Сайраму через n дней после 1 ноября */
const noon = (n: number) => new Date(Date.parse("2026-11-01T07:00:00Z") + n * DAY);
/** Тадбир через полгода — напоминания не упираются в дату тадбира */
async function farWedding(s: Sim, id: number) {
  const [o] = await s.repo.listOrdersByUser(id);
  await s.repo.updateOrder(o.id, { data: { ...o.data, events: o.data.events.map((e) => ({ ...e, date: "2027-05-15" })) } });
}

describe("напоминания не купившим", () => {
  it("1, 7, 14, 28 дней — четыре разных текста, не больше; повтор cron не дублирует", async () => {
    const s = new Sim();
    await nikohOrder(s, 1);
    await farWedding(s, 1);
    for (const day of [0, 1, 1, 3, 7, 7, 14, 28, 40, 60]) {
      s.clock = noon(day);
      await runCron(s.deps);
    }
    const got = nudgesTo(s, 1).map((m) => m.text);
    expect(got).toEqual(uz.care.nudges);
    const first = nudgesTo(s, 1)[0];
    expect(JSON.stringify(first.markup)).toContain(uz.care.stop);
    expect(JSON.stringify(first.markup)).toContain("/catalog");
  });

  it("только 11:00–19:00; ночью и утром — нет", async () => {
    const s = new Sim();
    await nikohOrder(s, 1);
    s.clock = new Date(+noon(2) - 4 * 3_600_000); // 08:00
    await runCron(s.deps);
    s.clock = new Date(+noon(2) + 8 * 3_600_000); // 20:00
    await runCron(s.deps);
    expect(nudgesTo(s, 1)).toHaveLength(0);
    s.clock = noon(2);
    await runCron(s.deps);
    expect(nudgesTo(s, 1)).toHaveLength(1);
  });

  it("стоп: «🔕 Бошқа юборманг», оплата, чек на проверке, блокировка бота", async () => {
    const s = new Sim();
    await nikohOrder(s, 1);
    s.clock = noon(1);
    await runCron(s.deps);
    await s.callback(1, "care:stop", nudgesTo(s, 1)[0].id);
    expect(s.tg.answers.at(-1)?.text).toBe(uz.care.stopped);
    for (const d of [7, 14, 28]) {
      s.clock = noon(d);
      await runCron(s.deps);
    }
    expect(nudgesTo(s, 1)).toHaveLength(1);

    const paid = new Sim();
    const o = await nikohWithReceipt(paid, 2);
    paid.clock = noon(1);
    await runCron(paid.deps);
    expect(nudgesTo(paid, 2)).toHaveLength(0);
    await paid.callback(ADMIN, `ok:${o.number}`, 1);
    paid.clock = noon(7);
    await runCron(paid.deps);
    expect(nudgesTo(paid, 2)).toHaveLength(0);

    const blocked = new Sim();
    await nikohOrder(blocked, 3);
    blocked.tg.blocked.add(3);
    blocked.clock = noon(1);
    await runCron(blocked.deps);
    expect((await blocked.repo.getUser(3))?.nudgeOff).toBe(true);
  });

  it("клиент вернулся (новое действие) — отсчёт заново; сотрудникам не шлём", async () => {
    const s = new Sim();
    await nikohOrder(s, 1);
    s.clock = noon(1);
    await runCron(s.deps);
    s.clock = noon(5);
    await s.start(1); // зашёл в бот
    s.clock = noon(8);
    await runCron(s.deps);
    expect(nudgesTo(s, 1)).toHaveLength(1);
    s.clock = noon(12);
    await runCron(s.deps);
    expect(nudgesTo(s, 1)).toHaveLength(2);

    const staff = new Sim();
    await nikohOrder(staff, ADMIN);
    staff.clock = noon(2);
    await runCron(staff.deps);
    expect(nudgesTo(staff, ADMIN)).toHaveLength(0);
  });

  it("тадбир прошёл — напоминаний нет", async () => {
    const s = new Sim();
    await nikohOrder(s, 1); // тадбир 14 ноября
    s.clock = noon(15);
    await runCron(s.deps);
    s.clock = noon(28);
    await runCron(s.deps);
    expect(nudgesTo(s, 1).filter((m) => m.text === uz.care.nudges[3])).toHaveLength(0);
  });
});

describe("отзыв после тадбира", () => {
  it("через день после тадбира: ⭐ → текст по желанию → 4–5 ⭐ просьба поделиться; один раз", async () => {
    const s = new Sim();
    const o = await nikohWithReceipt(s, 1);
    await s.callback(ADMIN, `ok:${o.number}`, 1);
    s.clock = new Date("2026-11-14T07:00:00Z"); // день тадбира
    await runCron(s.deps);
    expect(s.tg.to(1).some((m) => m.text?.includes("Баҳоланг"))).toBe(false);
    s.clock = new Date("2026-11-15T07:00:00Z");
    await runCron(s.deps);
    await runCron(s.deps);
    const ask = s.tg.to(1).filter((m) => m.text?.includes("Баҳоланг"));
    expect(ask).toHaveLength(1);
    await s.click(1, "⭐⭐⭐⭐⭐");
    expect(s.repo.reviews).toMatchObject([{ stars: 5 }]);
    await s.text(1, "Жуда чиройли, раҳмат!");
    expect(s.repo.reviews[0].text).toBe("Жуда чиройли, раҳмат!");
    expect(s.lastText(1)).toBe(uz.care.shareAsk);
    expect(JSON.stringify(s.last(1)!.markup)).toContain("t.me/share/url");
    // Следующее сообщение — уже не отзыв
    await s.text(1, "салом");
    expect(s.repo.reviews[0].text).toBe("Жуда чиройли, раҳмат!");
  });

  it("низкая оценка без текста — просто спасибо; чужой заказ — нельзя; старые заказы не трогаем", async () => {
    const s = new Sim();
    const o = await nikohWithReceipt(s, 1);
    await s.callback(ADMIN, `ok:${o.number}`, 1);
    s.clock = new Date("2026-11-15T07:00:00Z");
    await runCron(s.deps);
    await s.callback(2, `rv:${o.number}:5`, 1);
    expect(s.repo.reviews).toHaveLength(0);
    await s.click(1, "⭐⭐");
    await s.click(1, uz.care.reviewSkip);
    expect(s.lastText(1)).toBe(uz.care.reviewThanks);
    expect(s.repo.reviews).toMatchObject([{ stars: 2, text: null }]);

    const old = new Sim();
    const o2 = await nikohWithReceipt(old, 1);
    await old.callback(ADMIN, `ok:${o2.number}`, 1);
    old.clock = new Date("2026-12-01T07:00:00Z"); // больше недели после тадбира
    await runCron(old.deps);
    expect(old.tg.to(1).some((m) => m.text?.includes("Баҳоланг"))).toBe(false);
  });
});

describe("автоочистка", () => {
  it("неоплаченный черновик старше 30 дней — удаляется с фото и песней; оплаченный — никогда", async () => {
    const s = new Sim();
    const removed: string[] = [];
    s.deps.removePhotos = async (urls) => void removed.push(...urls);
    s.deps.removeMusic = async (urls) => void removed.push(...urls);
    const draft = await nikohOrder(s, 1);
    await s.repo.updateOrder(draft.id, { data: { ...draft.data, photos: ["https://x.supabase.co/storage/v1/object/public/photos/client/a.webp"] }, music: { kind: "own", fileId: "f", url: "https://x.supabase.co/storage/v1/object/public/music/own/aaaaaaaaaaaaaaaa.mp3" } });
    const paid = await nikohWithReceipt(s, 2);
    await s.callback(ADMIN, `ok:${paid.number}`, 1);
    s.clock = noon(29);
    await runCron(s.deps);
    expect(await s.repo.getOrder(draft.id)).not.toBeNull();
    s.clock = noon(31);
    await runCron(s.deps);
    expect(await s.repo.getOrder(draft.id)).toBeNull();
    expect(removed.sort()).toEqual(["https://x.supabase.co/storage/v1/object/public/music/own/aaaaaaaaaaaaaaaa.mp3", "https://x.supabase.co/storage/v1/object/public/photos/client/a.webp"]);
    s.clock = noon(400);
    await runCron(s.deps);
    expect((await s.repo.getOrder(paid.id))?.status).toMatch(/active|archived/);
  });

  it("фото, которое есть и у другого заказа, не удаляется", async () => {
    const s = new Sim();
    const removed: string[] = [];
    s.deps.removePhotos = async (urls) => void removed.push(...urls);
    const photo = "https://x.supabase.co/storage/v1/object/public/photos/client/b.webp";
    const a = await nikohOrder(s, 1);
    await s.repo.updateOrder(a.id, { data: { ...a.data, photos: [photo] } });
    const b = await nikohWithReceipt(s, 1, ["Сардор", "Нилуфар"]);
    await s.repo.updateOrder(b.id, { data: { ...b.data, photos: [photo] } });
    await s.callback(ADMIN, `ok:${b.number}`, 1);
    s.clock = noon(31);
    await runCron(s.deps);
    expect(await s.repo.getOrder(a.id)).toBeNull();
    expect(removed).toEqual([]);
  });
});

describe("лимиты Telegram (часть 10)", () => {
  it("тексты и кнопки на uz/ru/kk", () => {
    for (const tx of [uz, ru, kk]) {
      const c = tx.care;
      for (const t of [...c.nudges, c.reviewAsk("Ш".repeat(200)), c.reviewText, c.reviewThanks, c.shareAsk]) expect(t.length).toBeLessThanOrEqual(TG_LIMITS.message);
      for (const b of [c.cont, c.catalog, c.stop, c.reviewSkip, c.shareButton, ...c.stars]) expect(b.length, b).toBeLessThanOrEqual(TG_LIMITS.button);
      expect(c.stopped.length).toBeLessThanOrEqual(TG_LIMITS.alert);
      expect(new Set(c.nudges).size).toBe(4);
    }
    for (const d of ["care:stop", "rv:99999999:5", "rv:99999999:skip"]) expect(Buffer.byteLength(d)).toBeLessThanOrEqual(TG_LIMITS.callbackData);
  });
});
