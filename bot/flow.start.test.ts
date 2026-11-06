import { describe, expect, it } from "vitest";
import { uz } from "@/texts/bot-uz";
import { ru } from "@/texts/bot-ru";
import { Sim } from "./testing/sim";
import { buttonLabels, inlineButtons } from "./testing/fake-tg";
import { testEnv } from "./testing/sim";
import { activeDesigns } from "@/templates/registry";

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

  it("выбор ўзбекча → одно приветствие с кнопками меню, старая нижняя клавиатура убрана", async () => {
    const sim = new Sim();
    await sim.start(1);
    await sim.click(1, uz.langUz);
    expect((await sim.user(1))?.lang).toBe("uz");
    const m = sim.last(1);
    expect(m.text).toBe(uz.welcome("Клиент1"));
    expect(m.markup && "inline" in m.markup).toBe(true);
    expect(buttonLabels(m)).toEqual([uz.menu.create, uz.menu.my, uz.menuSaved(0), uz.menu.lang, uz.menu.help]);
    expect(sim.tg.to(1).filter((x) => x.text !== uz.chooseLang && x.id !== m.id)).toEqual([]);
    // повторный /start (у старых клиентов была нижняя клавиатура): служебное сообщение её убирает и сразу удаляется
    await sim.start(1);
    expect(sim.tg.deleted.length).toBe(1);
    expect(sim.tg.to(1).map((x) => x.text).filter((t) => t === uz.ok)).toEqual([]);
    expect(sim.lastText(1)).toBe(uz.welcome("Клиент1"));
  });

  it("выбор русского → всё дальше по-русски", async () => {
    const sim = new Sim();
    await sim.start(1);
    await sim.click(1, ru.langRu);
    expect(buttonLabels(sim.last(1))).toEqual([ru.menu.create, ru.menu.my, ru.menuSaved(0), ru.menu.lang, ru.menu.help]);
    await sim.click(1, ru.menu.create);
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

describe("v2: меню-кнопки, приложение, устаревшие кнопки", () => {
  const APP = "https://inviteizi.vercel.app/app";

  it("приложение включено: «✨ Таклифнома яратиш» открывает его, кнопка меню чата «✨ Очиш»", async () => {
    const sim = new Sim();
    sim.deps.env = { ...testEnv, miniAppUrl: APP };
    await sim.start(1);
    await sim.click(1, uz.langUz);
    expect(inlineButtons(sim.last(1))[0]).toEqual({ text: uz.menu.create, webApp: APP });
    expect(sim.tg.menuButtons.get(1)).toEqual({ text: uz.menuButton, url: APP });
    await sim.text(1, uz.menu.lang);
    await sim.click(1, ru.langRu);
    expect(sim.tg.menuButtons.get(1)).toEqual({ text: ru.menuButton, url: APP });
  });

  it("приложение выключено: заказ в чате, кнопки меню чата нет", async () => {
    const sim = new Sim();
    await sim.start(1);
    await sim.click(1, uz.langUz);
    expect(inlineButtons(sim.last(1))[0]).toMatchObject({ text: uz.menu.create, data: expect.stringContaining("m:create") });
    expect(sim.tg.menuButtons.get(1) ?? null).toBeNull();
    await sim.click(1, uz.menu.create);
    expect(sim.lastText(1)).toBe(uz.category.ask);
  });

  it("❤️ Сақланганлар показывает число сохранённых", async () => {
    const sim = new Sim();
    await sim.start(1);
    await sim.click(1, uz.langUz);
    await sim.callback(1, `fav:add:${activeDesigns()[0].id}`, 1);
    await sim.start(1);
    expect(buttonLabels(sim.last(1))).toContain(uz.menuSaved(1));
    expect(uz.menuSaved(1)).toBe("❤️ Сақланганлар (1)");
  });

  it.each([["uz", uz], ["ru", ru]] as const)("%s: «💬 Ёрдам» — 3 строки как заказать и «📞 Боғланиш»", async (lang, tx) => {
    const sim = new Sim();
    await sim.start(1);
    await sim.click(1, lang === "uz" ? uz.langUz : ru.langRu);
    await sim.click(1, tx.menu.help);
    expect(sim.lastText(1)).toBe(tx.help);
    expect(tx.help.split("\n").filter((l) => /^\d\. /.test(l))).toHaveLength(3);
    expect(inlineButtons(sim.last(1))).toEqual([{ text: tx.contact, url: "https://t.me/inviteizi_owner" }]);
  });

  it("старые подписи нижнего меню (до v2) по-прежнему работают", async () => {
    const sim = new Sim();
    await sim.start(1);
    await sim.click(1, uz.langUz);
    await sim.text(1, uz.menuLegacy.help);
    expect(sim.lastText(1)).toBe(uz.help);
    await sim.text(1, uz.menuLegacy.create);
    expect(sim.lastText(1)).toBe(uz.category.ask);
  });

  it("совсем старая кнопка: «Бу тугма эскирган 👇», её кнопки убраны, снова меню", async () => {
    const sim = new Sim();
    await sim.start(1);
    await sim.click(1, uz.langUz);
    await sim.click(1, uz.menu.create);
    const old = sim.last(1);
    await sim.start(1); // анкета сброшена — вопрос «какой тадбир» устарел
    await sim.click(1, uz.category.nikoh);
    expect(sim.tg.answers.at(-1)?.text).toBe(uz.oldButton);
    expect(sim.tg.to(1).find((m) => m.id === old.id)?.markup).toBeUndefined();
    expect(sim.lastText(1)).toBe(uz.oldButton);
    expect(buttonLabels(sim.last(1))).toContain(uz.menu.create);
    expect((await sim.user(1))?.step).toBe("idle");
  });

  it("двойное нажатие той же кнопки — только всплывашка, новых сообщений нет", async () => {
    const sim = new Sim();
    await sim.start(1);
    await sim.click(1, uz.langUz);
    await sim.click(1, uz.menu.create);
    const ask = sim.last(1);
    const data = (inlineButtons(ask) as { text: string; data?: string }[]).find((b) => b.text === uz.category.nikoh)!.data!;
    await sim.callback(1, data, ask.id);
    const mark = sim.mark();
    await sim.callback(1, data, ask.id);
    expect(sim.textsSince(1, mark)).toEqual([]);
    expect(sim.tg.answers.at(-1)?.text).toBe(uz.oldButton);
    expect((await sim.user(1))?.step).toBe("catalog");
  });

  it("«Назад» из каталога убирает альбом обложек", async () => {
    const sim = new Sim();
    await sim.start(1);
    await sim.click(1, uz.langUz);
    await sim.click(1, uz.menu.create);
    await sim.click(1, uz.category.nikoh);
    expect(sim.tg.to(1).filter((m) => m.type === "photo").length).toBeGreaterThan(0);
    await sim.click(1, uz.back);
    expect(sim.tg.to(1).filter((m) => m.type === "photo")).toEqual([]);
    expect(sim.lastText(1)).toBe(uz.category.ask);
  });

  it.each([["uz", uz], ["ru", ru]] as const)("%s: новые тексты в лимитах Telegram", (_, tx) => {
    const bytes = (x: string) => Buffer.byteLength(x, "utf8");
    for (const t of [tx.welcome("Абдураҳмонжон Абдуллоҳжонович"), tx.idle, tx.help, tx.oldButton, tx.catalog.pageTitle, tx.photo.accepted(10), tx.review.title, tx.catalog.chosen(999, "Узун номли дизайн")]) expect(t.length).toBeLessThanOrEqual(4096);
    expect(tx.oldButton.length).toBeLessThanOrEqual(200);
    for (const label of [tx.menu.create, tx.menu.my, tx.menu.help, tx.menu.lang, tx.menuSaved(99), tx.menuButton, tx.catalog.pick("3️⃣"), tx.catalog.view("3️⃣")]) expect(label.length).toBeLessThanOrEqual(64);
    for (const d of activeDesigns()) expect(bytes(`a:9999:p:${d.id}`), d.id).toBeLessThanOrEqual(64);
  });
});
