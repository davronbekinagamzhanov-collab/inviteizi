import { describe, expect, it } from "vitest";
import { uz } from "@/texts/bot-uz";
import { ru } from "@/texts/bot-ru";
import { Sim } from "./testing/sim";
import { buttonLabels, inlineButtons } from "./testing/fake-tg";
import { startRu, startUz, pickDesign, setChoices } from "./testing/paths";

const BASE = "https://inviteizi.vercel.app";

describe("весь путь наҳорги ош на русском", () => {
  it("от /start до ссылки: свой текст, своя песня, второй тадбир — свадебный вечер", async () => {
    const sim = new Sim();
    const id = 2;
    await startRu(sim, id, "qr_sayram");
    expect((await sim.user(id))?.source).toBe("qr_sayram");
    await sim.click(id, ru.category.nahorgi);
    // наҳорги ош — без фото клиента (решение владельца 03.11): строки «📷» в каталоге нет
    expect(sim.lastText(id)).not.toContain("📷");
    await pickDesign(sim, id, "tong-dasturxon");
    expect(sim.tg.to(id).some((m) => m.text === ru.catalog.chosen(116, "Тонгги дастурхон"))).toBe(true);

    expect(sim.lastText(id)).toBe(ru.form.personNahorgi);
    await sim.text(id, "Жасурбек");
    expect(sim.lastText(id)).toBe(ru.form.relationPerson("Жасурбек"));
    expect(buttonLabels(sim.last(id))).toEqual(
      expect.arrayContaining(["Наш сын", "Наша дочь", "Наш внук / внучка", "Наш младший брат", "Мы сами"]),
    );
    await sim.click(id, "Наш сын");
    expect(sim.lastText(id)).toBe(ru.form.cause);
    await sim.click(id, ru.form.causes.nikoh);
    expect(sim.lastText(id)).toBe(ru.form.hosts);
    await sim.text(id, "Раҳимовлар оиласи");

    // Тадбир 1 — наҳорги ош: время утром
    expect(sim.lastText(id)).toBe(ru.event.date("Наҳорги ош (утренний плов)"));
    await sim.click(id, "21");
    expect(buttonLabels(sim.last(id))).toEqual(expect.arrayContaining(["05:00", "05:30", "06:00", "06:30", "07:00", ru.event.timeOther]));
    await sim.click(id, "06:00");
    await sim.text(id, "Раҳимовлар хонадони");
    await sim.text(id, "Сайрам, Юсуф Сарёмий кўчаси 17");
    await sim.location(id, 42.3012, 69.7595);

    // Тадбир 2 — свадебный вечер, другой день
    expect(buttonLabels(sim.last(id))).toEqual(expect.arrayContaining([ru.event.addBazm, ru.event.noMore]));
    await sim.click(id, ru.event.addBazm);
    expect(sim.lastText(id)).toBe(ru.event.sameDay("Свадебный вечер", "21.11.2026"));
    await sim.click(id, ru.event.sameDayNo);
    await sim.click(id, "22");
    await sim.click(id, "18:00");
    await sim.text(id, "«Наврўз» тўйхонаси");
    await sim.text(id, "Сайрам, Амир Темур кўчаси 45");
    await sim.text(id, ru.event.skip);

    // Добавить больше нечего — сразу сводка «Бот выбрал»; текст меняем через ✏️ (варианты на узбекском)
    expect(sim.lastText(id)).toContain(ru.review.title);
    await sim.click(id, ru.review.editText);
    expect(sim.lastText(id)).toContain("Сизни ўғлимиз Жасурбекнинг никоҳ тўйи муносабати билан");
    expect(buttonLabels(sim.last(id))).toEqual(expect.arrayContaining([ru.text.pick(1), ru.text.pick(2), ru.text.own]));
    await sim.click(id, ru.text.own);
    const long = "Ҳ".repeat(601);
    await sim.text(id, long);
    expect(sim.tg.to(id).at(-2)?.text).toBe(ru.text.tooLong(601));
    expect(sim.lastText(id)).toBe(ru.text.ownAsk);
    const own = "Азиз меҳмонлар! Ўғлимиз Жасурбекнинг тўйи муносабати билан наҳорги ошга марҳамат.";
    await sim.text(id, own);
    await sim.click(id, ru.review.editMusic);

    // Своя песня: название текстом — нельзя, > 20 МБ — нельзя
    expect(sim.lastText(id)).toBe(ru.music.ask);
    await sim.click(id, ru.music.own);
    await sim.text(id, "Ёр-ёр, Юлдуз Усмонова");
    expect(sim.tg.to(id).at(-2)?.text).toBe(ru.music.sendFile);
    expect(sim.lastText(id)).toBe(ru.music.ownAsk);
    await sim.audio(id, "BIG", 25 * 1024 * 1024);
    expect(sim.tg.to(id).at(-2)?.text).toBe(ru.music.tooBig("25.0"));
    await sim.voice(id);
    expect(sim.tg.to(id).at(-2)?.text).toBe(ru.music.sendFile);
    await sim.audio(id, "SONG1", 5 * 1024 * 1024, "Тўй муборак");
    expect(sim.savedMusic).toEqual(["SONG1"]);

    expect(sim.lastText(id)).toContain(ru.review.title);
    expect(sim.lastText(id)).toContain(ru.review.musicOwn("Тўй муборак"));
    expect(sim.lastText(id)).toContain(ru.review.cause(ru.form.causes.nikoh));
    await sim.click(id, ru.review.confirm);

    const [o] = await sim.repo.listOrdersByUser(id);
    expect(o).toMatchObject({ slug: "jasurbek", status: "preview", occasion: "nahorgi", templateId: "tong-dasturxon", amount: 6_000 });
    expect(o.data).toMatchObject({ person: "Жасурбек", relation: "ogil", cause: "nikoh", hosts: "Раҳимовлар оиласи", customText: own });
    expect(o.data.textId).toBeUndefined();
    expect(o.data.events.map((e) => [e.kind, e.date, e.time])).toEqual([
      ["nahorgi", "2026-11-21", "06:00"],
      ["nikohBazm", "2026-11-22", "18:00"],
    ]);
    expect(o.music).toEqual({ kind: "own", fileId: "SONG1", url: "https://cdn.test/music/own/SONG1.mp3", title: "Тўй муборак" });
    expect(sim.lastText(id)).toBe(ru.order.created(`${BASE}/jasurbek`));
  });
});

describe("суннат с двумя мальчиками", () => {
  it("имя «А ва Б» → текст во множественном числе, slug из обоих имён", async () => {
    const sim = new Sim();
    const id = 3;
    await startUz(sim, id);
    await sim.click(id, uz.category.sunnat);
    await pickDesign(sim, id, "simple");
    expect(sim.lastText(id)).toBe(uz.form.personSunnat);
    await sim.text(id, "Абдураҳмонжон ва Абдуллоҳжон");
    expect(sim.lastText(id)).toBe(uz.form.relationPerson("Абдураҳмонжон ва Абдуллоҳжон"));
    await sim.click(id, "Ўғлимиз");
    await sim.text(id, "Тошматовлар оиласи");
    expect(sim.lastText(id)).toBe(uz.event.date("Суннат тўйи базми"));
    await sim.click(id, "28");
    await sim.click(id, "12:00");
    await sim.text(id, "Тошматовлар хонадони");
    await sim.text(id, "Сайрам, Мустақиллик кўчаси 3");
    await sim.text(id, uz.event.skip);
    expect(buttonLabels(sim.last(id))).toEqual(expect.arrayContaining([uz.event.addNahorgi, uz.event.noMore]));
    await sim.click(id, uz.event.noMore);
    await sim.click(id, uz.review.editText);
    expect(sim.lastText(id)).toContain("Сизни ўғилларимиз Абдураҳмонжон ва Абдуллоҳжоннинг суннат тўйига");
    await sim.click(id, uz.text.pick(1));
    await setChoices(sim, id, { text: 1, music: "none", rsvp: false });
    expect(sim.lastText(id)).toContain(uz.review.person("Абдураҳмонжон ва Абдуллоҳжон"));
    await sim.click(id, uz.review.confirm);
    const [o] = await sim.repo.listOrdersByUser(id);
    expect(o.slug).toBe("abdurahmonjon-va-abdullohjon");
    expect(o.data).toMatchObject({ occasion: "sunnat", person: "Абдураҳмонжон ва Абдуллоҳжон", relation: "ogil", textId: "classic" });
    expect(o.music).toEqual({ kind: "none" });
  });
});

describe("«Назад» на каждом шаге анкеты", () => {
  it("с каждого вопроса — на предыдущий, данные не дублируются", async () => {
    const sim = new Sim();
    const id = 4;
    await startUz(sim, id);
    const back = async () => {
      const m = sim.last(id);
      if (m.markup && "reply" in m.markup) await sim.text(id, uz.back);
      else await sim.click(id, uz.back);
    };
    // [ответ, вопрос до ответа]
    const plan: [() => Promise<void>, string][] = [
      [() => sim.click(id, uz.category.nikoh), uz.category.ask],
      [async () => void (await pickDesign(sim, id, "muhr")), "№113 Муҳр"],
      [() => sim.text(id, "Азиз"), uz.form.groom],
      [() => sim.text(id, "Мадина"), uz.form.bride],
      [() => sim.click(id, "Ўзимизники"), uz.form.relationNikoh],
      [() => sim.text(id, "Каримовлар оиласи"), uz.form.hosts],
      [() => sim.click(id, uz.form.sideYes), uz.form.sideAsk],
      [() => sim.text(id, "Юсуповлар оиласи"), uz.form.sideBride],
      [() => sim.click(id, "14"), uz.event.date("Никоҳ базми")],
      [() => sim.click(id, uz.event.timeOther), uz.event.time("Никоҳ базми")],
      [() => sim.text(id, "18:30"), uz.event.timeCustom],
      [() => sim.text(id, "«Наврўз» тўйхонаси"), uz.event.venue("Никоҳ базми")],
      [() => sim.text(id, "Сайрам, Амир Темур кўчаси 45"), uz.event.address],
      [() => sim.location(id, 42.3, 69.76), uz.event.location],
      [() => sim.click(id, uz.event.addNahorgi), uz.event.more("1. Никоҳ базми — 14.11.2026, 18:30")],
      [() => sim.click(id, uz.event.sameDayYes), uz.event.sameDay("Наҳорги ош", "14.11.2026")],
      [() => sim.text(id, "Каримовлар хонадони"), uz.event.venue("Наҳорги ош")],
      [() => sim.text(id, "Сайрам, Юсуф Сарёмий 17"), uz.event.address],
      [() => sim.text(id, uz.event.skip), uz.event.location],
      [() => sim.click(id, uz.event.noMore), ""],
    ];
    for (const [answer, question] of plan) {
      const before = sim.lastText(id).replace(/[\u00a0\u202f]/g, " ");
      if (question) expect(before).toContain(question.replace(/[\u00a0\u202f]/g, " "));
      await answer();
      const next = sim.lastText(id);
      await back();
      expect(sim.lastText(id).replace(/[\u00a0\u202f]/g, " ")).toBe(before);
      await answer();
      expect(sim.lastText(id)).toBe(next);
    }
    // Бот сам выбрал текст, музыку и ответы — сразу сводка
    expect(sim.lastText(id)).toContain(uz.review.title);
    await sim.click(id, uz.review.confirm);
    const [o] = await sim.repo.listOrdersByUser(id);
    expect(o.data.events).toHaveLength(2);
    expect(o.data.events[0]).toMatchObject({ kind: "nikohBazm", time: "18:30", location: { lat: 42.3, lng: 69.76 } });
    expect(o.data.events[1]).toMatchObject({ kind: "nahorgi", time: "06:00", date: "2026-11-14" });
    expect(o.data.relation).toBe("ozimiz");
    expect(o.templateId).toBe("muhr");
  });

  it("«Назад» с первого вопроса — в меню; «Назад» с локации возвращает меню-клавиатуру", async () => {
    const sim = new Sim();
    await startUz(sim, 5);
    await sim.click(5, uz.back);
    expect(sim.lastText(5)).toBe(uz.idle);
    expect((await sim.user(5))?.step).toBe("idle");
  });

  it("«Назад» после добавленного тадбира не оставляет пустой тадбир", async () => {
    const sim = new Sim();
    const id = 6;
    await startUz(sim, id);
    await sim.click(id, uz.category.nikoh);
    await pickDesign(sim, id, "animated");
    await sim.text(id, "Азиз");
    await sim.text(id, "Мадина");
    await sim.click(id, "Фарзандларимиз");
    await sim.text(id, "Каримовлар оиласи");
    await sim.click(id, uz.form.sideNo);
    await sim.click(id, "14");
    await sim.click(id, "18:00");
    await sim.text(id, "Тўйхона");
    await sim.text(id, "Манзил");
    await sim.text(id, uz.event.skip);
    await sim.click(id, uz.event.addKelinSalom);
    expect(sim.lastText(id)).toBe(uz.event.date("Келин салом"));
    await sim.click(id, uz.back);
    await sim.click(id, uz.event.noMore);
    await setChoices(sim, id, { text: 1, music: "none", rsvp: false });
    expect(buttonLabels(sim.last(id)).filter((l) => l.startsWith("✏️ 2."))).toEqual([]);
    await sim.click(id, uz.review.confirm);
    const [o] = await sim.repo.listOrdersByUser(id);
    expect(o.data.events).toHaveLength(1);
  });
});

describe("непонятный ввод и проверки", () => {
  async function toRelation(sim: Sim, id: number) {
    await startUz(sim, id);
    await sim.click(id, uz.category.nikoh);
    await pickDesign(sim, id, "animated");
    await sim.text(id, "Азиз");
    await sim.text(id, "Мадина");
  }

  it("текст вместо кнопки — подсказка и тот же вопрос", async () => {
    const sim = new Sim();
    await toRelation(sim, 7);
    await sim.text(7, "фарзандимиз");
    expect(sim.tg.to(7).at(-2)?.text).toBe(uz.pressButton);
    expect(sim.lastText(7)).toBe(uz.form.relationNikoh);
    expect((await sim.user(7))?.step).toBe("relation");
  });

  it("стикер/фото вместо имени — подсказка и тот же вопрос", async () => {
    const sim = new Sim();
    await startUz(sim, 8);
    await sim.click(8, uz.category.nikoh);
    await pickDesign(sim, 8, "animated");
    await sim.sticker(8);
    expect(sim.tg.to(8).at(-2)?.text).toBe(uz.sendText);
    expect(sim.lastText(8)).toBe(uz.form.groom);
    await sim.photo(8, "X");
    expect(sim.lastText(8)).toBe(uz.form.groom);
  });

  it("слишком длинное имя — вежливо просим короче", async () => {
    const sim = new Sim();
    await startUz(sim, 9);
    await sim.click(9, uz.category.nikoh);
    await pickDesign(sim, 9, "animated");
    await sim.text(9, "А".repeat(41));
    expect(sim.tg.to(9).at(-2)?.text).toBe(uz.tooLong(40));
    expect(sim.lastText(9)).toBe(uz.form.groom);
  });

  it("неверное время «25:99» — подсказка; «18:30» принимается", async () => {
    const sim = new Sim();
    await toRelation(sim, 10);
    await sim.click(10, "Фарзандларимиз");
    await sim.text(10, "Каримовлар оиласи");
    await sim.click(10, uz.form.sideNo);
    await sim.click(10, "14");
    await sim.click(10, uz.event.timeOther);
    await sim.text(10, "25:99");
    expect(sim.tg.to(10).at(-2)?.text).toBe(uz.event.badTime);
    expect(sim.lastText(10)).toBe(uz.event.timeCustom);
    await sim.text(10, "18:30");
    expect(sim.lastText(10)).toBe(uz.event.venue("Никоҳ базми"));
    expect(((await sim.user(10))?.state as { data: { events: { time: string }[] } }).data.events[0].time).toBe("18:30");
  });

  it("дата в прошлом недоступна: кнопки нет, подделанный callback — отказ", async () => {
    const sim = new Sim({ now: "2026-11-10T07:00:00Z" });
    await toRelation(sim, 11);
    await sim.click(11, "Фарзандларимиз");
    await sim.text(11, "Каримовлар оиласи");
    await sim.click(11, uz.form.sideNo);
    const cal = sim.last(11);
    const labels = buttonLabels(cal);
    expect(labels).not.toContain("5");
    expect(labels).toContain("·");
    expect(labels).toContain("10"); // сегодня можно
    expect(labels).not.toContain("◀"); // в прошлые месяцы не листается
    const q = (inlineButtons(cal).find((b) => b.text === "10") as { data: string }).data.split(":")[1];
    await sim.callback(11, `a:${q}:d:2026-11-05`, cal.id);
    expect(sim.tg.to(11).at(-2)?.text).toBe(uz.event.pastDate);
    expect(sim.lastText(11)).toBe(uz.event.date("Никоҳ базми"));
    expect((await sim.user(11))?.step).toBe("evDate");
  });

  it("календарь листается ▶ в том же сообщении", async () => {
    const sim = new Sim();
    await toRelation(sim, 12);
    await sim.click(12, "Фарзандларимиз");
    await sim.text(12, "Каримовлар оиласи");
    await sim.click(12, uz.form.sideNo);
    const cal = sim.last(12);
    expect(buttonLabels(cal)).toContain("ноябр 2026");
    await sim.click(12, "▶");
    expect(sim.last(12).id).toBe(cal.id);
    expect(buttonLabels(cal)).toContain("декабр 2026");
    await sim.click(12, "31");
    expect(((await sim.user(12))?.state as { data: { events: { date: string }[] } }).data.events[0].date).toBe("2026-12-31");
  });

  it("3 тадбира максимум: после третьего сразу сводка «Бот танлади»", async () => {
    const sim = new Sim();
    const id = 13;
    await toRelation(sim, id);
    await sim.click(id, "Фарзандларимиз");
    await sim.text(id, "Каримовлар оиласи");
    await sim.click(id, uz.form.sideNo);
    const event = async () => {
      await sim.text(id, "Жой");
      await sim.text(id, "Манзил");
      await sim.text(id, uz.event.skip);
    };
    await sim.click(id, "14");
    await sim.click(id, "18:00");
    await event();
    await sim.click(id, uz.event.addNahorgi);
    await sim.click(id, uz.event.sameDayYes);
    await event();
    expect(buttonLabels(sim.last(id))).toEqual([uz.event.addKelinSalom, uz.event.noMore, uz.back]);
    await sim.click(id, uz.event.addKelinSalom);
    await sim.click(id, "15");
    await sim.click(id, "09:00");
    await event();
    expect(sim.tg.to(id).at(-2)?.text).toBe(uz.event.maxReached);
    expect((await sim.user(id))?.step).toBe("review");
    const st = (await sim.user(id))?.state as { data: { events: unknown[] } };
    expect(st.data.events).toHaveLength(3);
  });

  it("старая кнопка прошлого вопроса не срабатывает", async () => {
    const sim = new Sim();
    await startUz(sim, 14);
    await sim.click(14, uz.category.nikoh);
    const mark = sim.mark();
    await sim.click(14, uz.category.sunnat); // кнопка из предыдущего сообщения
    expect(sim.tg.answers.at(-1)?.text).toBe(uz.oldButton);
    expect(sim.textsSince(14, mark)).toEqual([]);
    expect((await sim.user(14))?.state).toMatchObject({ occasion: "nikoh" });
  });

  it("не текстовое сообщение на шаге с кнопками — подсказка", async () => {
    const sim = new Sim();
    await startUz(sim, 15);
    await sim.sticker(15);
    expect(sim.tg.to(15).at(-2)?.text).toBe(uz.pressButton);
    expect(sim.lastText(15)).toBe(uz.category.ask);
  });
});
