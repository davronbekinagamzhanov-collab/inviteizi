import { describe, expect, it } from "vitest";
import { uz } from "@/texts/bot-uz";
import { ru } from "@/texts/bot-ru";
import { Sim } from "./testing/sim";
import { buttonLabels } from "./testing/fake-tg";

describe("первый вход, язык, меню", () => {
  it("/start insta: новый пользователь — выбор языка, source сохранён", async () => {
    const sim = new Sim();
    await sim.start(1, "insta");
    expect(sim.lastText(1)).toBe(uz.chooseLang);
    expect(buttonLabels(sim.last(1))).toEqual([uz.langUz, uz.langRu]);
    expect((await sim.user(1))?.source).toBe("insta");
  });

  it("source только при первом входе", async () => {
    const sim = new Sim();
    await sim.start(1, "insta");
    await sim.start(1, "qr_77");
    expect((await sim.user(1))?.source).toBe("insta");
  });

  it("выбор ўзбекча → приветствие и постоянное меню", async () => {
    const sim = new Sim();
    await sim.start(1);
    await sim.click(1, uz.langUz);
    expect((await sim.user(1))?.lang).toBe("uz");
    const m = sim.last(1);
    expect(m.text).toBe(uz.welcome("Клиент1"));
    expect(m.markup && "reply" in m.markup).toBe(true);
    expect(buttonLabels(m)).toEqual([uz.menu.create, uz.menu.my, uz.menu.help, uz.menu.lang]);
  });

  it("выбор русского → всё дальше по-русски", async () => {
    const sim = new Sim();
    await sim.start(1);
    await sim.click(1, ru.langRu);
    expect(buttonLabels(sim.last(1))).toEqual([ru.menu.create, ru.menu.my, ru.menu.help, ru.menu.lang]);
    await sim.text(1, ru.menu.create);
    expect(sim.lastText(1)).toBe(ru.category.ask);
  });

  it("пока язык не выбран — на любой ввод снова выбор языка", async () => {
    const sim = new Sim();
    await sim.start(1);
    await sim.text(1, "Салом");
    expect(sim.lastText(1)).toBe(uz.chooseLang);
  });

  it("повторный /start знакомого — приветствие на его языке, без выбора языка", async () => {
    const sim = new Sim();
    await sim.start(1);
    await sim.click(1, ru.langRu);
    await sim.start(1);
    expect(sim.lastText(1)).toBe(ru.welcome("Клиент1"));
  });

  it("🌐 Тил / Язык — сменить язык в любой момент", async () => {
    const sim = new Sim();
    await sim.start(1);
    await sim.click(1, uz.langUz);
    await sim.text(1, uz.menu.lang);
    expect(sim.lastText(1)).toBe(uz.chooseLang);
    await sim.click(1, ru.langRu);
    expect((await sim.user(1))?.lang).toBe("ru");
    expect(buttonLabels(sim.tg.to(1).find((m) => m.text === ru.langSaved))).toContain(ru.menu.create);
  });

  it("смена языка посреди анкеты — тот же вопрос на новом языке", async () => {
    const sim = new Sim();
    await sim.start(1);
    await sim.click(1, uz.langUz);
    await sim.text(1, uz.menu.create);
    await sim.text(1, uz.menu.lang);
    await sim.click(1, ru.langRu);
    expect(sim.lastText(1)).toBe(ru.category.ask);
  });

  it("❓ Ёрдам и /help — помощь с кнопкой «Боғланиш» на владельца", async () => {
    const sim = new Sim();
    await sim.start(1);
    await sim.click(1, uz.langUz);
    await sim.text(1, uz.menu.help);
    expect(sim.lastText(1)).toBe(uz.help);
    const b = sim.last(1).markup;
    expect(b && "inline" in b && b.inline[0][0]).toEqual({ text: uz.contact, url: "https://t.me/inviteizi_owner" });
    await sim.command(1, "help");
    expect(sim.lastText(1)).toBe(uz.help);
  });

  it("непонятное без анкеты (стикер, текст) — подсказка, бот не молчит", async () => {
    const sim = new Sim();
    await sim.start(1);
    await sim.click(1, uz.langUz);
    const mark = sim.mark();
    await sim.sticker(1);
    await sim.text(1, "алло");
    const texts = sim.textsSince(1, mark);
    expect(texts).toHaveLength(2);
    expect(texts.every((t) => t.includes(uz.idle))).toBe(true);
  });

  it("неизвестная команда — подсказка", async () => {
    const sim = new Sim();
    await sim.start(1);
    await sim.click(1, uz.langUz);
    await sim.command(1, "stats");
    expect(sim.lastText(1)).toContain(uz.unknown);
  });

  it("на каждую нажатую кнопку отвечаем answerCallbackQuery", async () => {
    const sim = new Sim();
    await sim.start(1);
    await sim.click(1, uz.langUz);
    expect(sim.tg.answers).toHaveLength(1);
  });
});
