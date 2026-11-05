/**
 * v2, часть 9: языки приглашения в чате и в приложении.
 * Узбекский всегда; русский — всегда можно добавить; казахский — только при KAZAKH_ENABLED.
 * Свой текст на другом языке пишет сам клиент. Цена не меняется.
 */
import { describe, expect, it } from "vitest";
import { uz } from "@/texts/bot-uz";
import { ru } from "@/texts/bot-ru";
import { PRICES, activeDesigns } from "@/templates/registry";
import type { AppUser } from "@/lib/tg-init-data";
import * as app from "./app/service";
import { TG_LIMITS } from "./testing/fake-tg";
import { nikohToReview } from "./testing/paths";
import { Sim } from "./testing/sim";

const L = uz.langs;
const user = (id: number): AppUser => ({ id, firstName: "Апа", username: `u${id}`, languageCode: "uz" });
const form = { hosts: "Каримовлар оиласи", groom: "Азиз", bride: "Мадина", events: [{ date: "2027-06-12", time: "18:00", venueName: "Наврўз", address: "Сайрам" }] };

describe("чат: 🌐 Тиллар", () => {
  it("на сводке строка и кнопка; русский добавляется и снимается; казахского без флага нет; цена та же", async () => {
    const s = new Sim();
    await nikohToReview(s, 1);
    expect(s.lastText(1)).toContain(L.review(""));
    await s.click(1, L.edit);
    expect(s.lastText(1)).toBe(L.ask(false));
    expect(JSON.stringify(s.last(1)!.markup)).not.toContain(L.names.kk);
    expect(JSON.stringify(s.last(1)!.markup)).toContain("?lang=ru");
    await s.click(1, L.off(L.names.ru));
    await s.click(1, L.done);
    expect(s.lastText(1)).toContain(L.review(L.names.ru));
    await s.click(1, uz.review.confirm);
    const [o] = await s.repo.listOrdersByUser(1);
    expect(o.data.langs).toEqual(["ru"]);
    expect(o.amount).toBe(PRICES[o.format]);
  });

  it("с флагом — казахский тоже; свой текст: перевод пишет клиент, снятие языка убирает перевод", async () => {
    const s = new Sim();
    s.deps.env = { ...s.deps.env, kazakhEnabled: true };
    await nikohToReview(s, 1);
    await s.click(1, uz.review.editText);
    await s.click(1, uz.text.own);
    await s.text(1, "Азиз ва Мадинанинг тўйига марҳамат!");
    await s.click(1, L.edit);
    expect(s.lastText(1)).toBe(L.ask(true));
    await s.click(1, L.off(L.names.kk));
    await s.click(1, L.off(L.names.ru));
    await s.click(1, L.ownButton(L.names.ru));
    expect(s.lastText(1)).toBe(L.ownAsk(L.names.ru));
    await s.text(1, "Добро пожаловать на свадьбу Азиза и Мадины!");
    await s.click(1, L.done);
    expect(s.lastText(1)).toContain(L.review(`${L.names.ru} · ${L.names.kk}`));
    await s.click(1, uz.review.confirm);
    let [o] = await s.repo.listOrdersByUser(1);
    expect(o.data.langs).toEqual(["ru", "kk"]);
    expect(o.data.customTexts).toEqual({ ru: "Добро пожаловать на свадьбу Азиза и Мадины!" });
    // Правка: снять русский → перевод уходит
    await s.click(1, /✏️/);
    await s.click(1, L.edit);
    await s.click(1, L.on(L.names.ru));
    await s.click(1, L.done);
    await s.click(1, uz.review.confirm);
    [o] = await s.repo.listOrdersByUser(1);
    expect(o.data.langs).toEqual(["kk"]);
    expect(o.data.customTexts?.ru).toBeUndefined();
  });

  it("лимиты Telegram", () => {
    for (const tx of [uz, ru]) {
      const t = tx.langs;
      for (const b of [t.edit, t.done, ...["ru", "kk"].flatMap((l) => [t.on(t.names[l]), t.off(t.names[l]), t.example(t.names[l]), t.ownButton(t.names[l])])]) expect(b.length, b).toBeLessThanOrEqual(TG_LIMITS.button);
      for (const m of [t.ask(true), t.ownAsk(t.names.kk), t.review(`${t.names.ru} · ${t.names.kk}`)]) expect(m.length).toBeLessThanOrEqual(TG_LIMITS.message);
    }
  });
});

describe("приложение: языки", () => {
  const design = activeDesigns().find((d) => d.occasion === "nikoh")!;
  it("сессия знает, какие языки можно добавить", async () => {
    const s = new Sim();
    expect((await app.openSession(s.deps, user(5))).extraLangs).toEqual(["ru"]);
    s.deps.env = { ...s.deps.env, kazakhEnabled: true };
    expect((await app.openSession(s.deps, user(5))).extraLangs).toEqual(["ru", "kk"]);
  });

  it("без флага казахский отбрасывается; перевод своего текста — только для выбранных языков и только при своём тексте", async () => {
    const s = new Sim();
    const u = user(6);
    const r = await app.submitDraft(s.deps, u, { templateId: design.id, form, langs: ["kk", "ru", "en" as "ru"], customText: "Ўз матним", customTexts: { ru: "Мой текст", kk: "Менің мәтінім" } });
    if (!("ok" in r)) throw new Error(JSON.stringify(r));
    const o = (await s.repo.getOrder(r.order.id))!;
    expect(o.data.langs).toEqual(["ru"]);
    expect(o.data.customTexts).toEqual({ ru: "Мой текст" });
    expect(o.amount).toBe(PRICES[design.format]);
    // Без своего текста перевод не хранится
    const r2 = await app.submitDraft(s.deps, user(7), { templateId: design.id, form, langs: ["ru"], customTexts: { ru: "Лишнее" } });
    if (!("ok" in r2)) throw new Error(JSON.stringify(r2));
    expect((await s.repo.getOrder(r2.order.id))!.data.customTexts).toBeUndefined();
  });

  it("черновик помнит языки; снятые языки сохраняются как «только узбекский»", async () => {
    const s = new Sim();
    const u = user(8);
    const r = await app.submitDraft(s.deps, u, { templateId: design.id, form, langs: ["ru"] });
    if (!("ok" in r)) throw new Error(JSON.stringify(r));
    expect((await app.openSession(s.deps, u)).draft?.langs).toEqual(["ru"]);
    const again = await app.submitDraft(s.deps, u, { templateId: design.id, form, langs: [], orderId: r.order.id });
    if (!("ok" in again)) throw new Error(JSON.stringify(again));
    expect((await s.repo.getOrder(r.order.id))!.data.langs ?? []).toEqual([]);
  });
});
