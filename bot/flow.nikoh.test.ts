import { describe, expect, it } from "vitest";
import { uz } from "@/texts/bot-uz";
import { Sim } from "./testing/sim";
import { buttonLabels, inlineButtons } from "./testing/fake-tg";
import { nikohOrder, startUz } from "./testing/paths";
import { activeDesigns } from "@/templates/registry";

const BASE = "https://inviteizi.vercel.app";
const animatedNikohCount=activeDesigns().filter(d=>d.occasion==="nikoh"&&d.format==="animated").length;
// Листание проверяем на самом большом каталоге никоҳ (Анимацияли)
const simpleNikoh=activeDesigns().filter(d=>d.occasion==="nikoh"&&d.format==="animated");

describe("весь путь никоҳ на ўзбекском", () => {
  it("от /start insta до ссылки на НАМУНА", async () => {
    const sim = new Sim();
    const id = 1;
    await startUz(sim, id, "insta");

    // Категория → формат
    expect(buttonLabels(sim.last(id))).toEqual(expect.arrayContaining([uz.category.nikoh, uz.category.nahorgi, uz.category.sunnat, uz.back]));
    await sim.click(id, uz.category.nikoh);
    expect(sim.lastText(id)).toContain(uz.format.ask);
    const fmt = buttonLabels(sim.last(id));
    expect(fmt.some((l) => /^✨ Анимацияли — 8.000 ₸$/.test(l))).toBe(true);
    expect(fmt.some((l) => /^📄 Оддий — 5.000 ₸$/.test(l))).toBe(true);
    await sim.click(id, /Анимацияли/);

    // Каталог: одно сообщение с фото, листаем ▶ в том же сообщении
    const cat = sim.last(id);
    expect(cat.type).toBe("photo");
    expect(cat.media).toBe(`${BASE}/covers/muhr.jpg`);
    expect(cat.text).toMatch(/^№113 · Муҳр\nАнимацияли · 8.000 ₸$/);
    expect(buttonLabels(cat)).toEqual(expect.arrayContaining(["◀", `1/${animatedNikohCount}`, "▶", uz.catalog.demo, uz.catalog.buy]));
    expect(inlineButtons(cat).find((b) => b.text === uz.catalog.demo)).toEqual({
      text: uz.catalog.demo,
      url: `${BASE}/demo/muhr`, // каталог — чистое демо без надписи
    });
    await sim.click(id, "▶");
    expect(sim.last(id).id).toBe(cat.id);
    expect(cat.media).toBe(`${BASE}/covers/ipak.jpg`);
    expect(cat.text).toMatch(/^№114 · Ипак/);
    expect(buttonLabels(cat)).toContain(`2/${animatedNikohCount}`);
    await sim.click(id, uz.catalog.buy);

    // Анкета
    expect(sim.lastText(id)).toBe(uz.form.groom);
    await sim.text(id, "Азиз");
    expect(sim.lastText(id)).toBe(uz.form.bride);
    await sim.text(id, "Мадина");
    expect(sim.lastText(id)).toBe(uz.form.relationNikoh);
    expect(buttonLabels(sim.last(id))).toEqual(expect.arrayContaining(["Фарзандларимиз", "Набираларимиз", "Ўзимизники"]));
    await sim.click(id, "Фарзандларимиз");
    expect(sim.lastText(id)).toBe(uz.form.hosts);
    await sim.text(id, "Каримовлар оиласи");
    expect(sim.lastText(id)).toBe(uz.form.sideAsk);
    await sim.click(id, uz.form.sideYes);
    expect(sim.lastText(id)).toBe(uz.form.sideBride);
    await sim.text(id, "Юсуповлар оиласи");

    // Тадбир 1: никоҳ базми
    expect(sim.lastText(id)).toBe(uz.event.date("Никоҳ базми"));
    await sim.click(id, "14");
    expect(sim.lastText(id)).toBe(uz.event.time("Никоҳ базми"));
    expect(buttonLabels(sim.last(id))).toEqual(expect.arrayContaining(["11:00", "12:00", "17:00", "18:00", "19:00", uz.event.timeOther]));
    await sim.click(id, "18:00");
    expect(sim.lastText(id)).toBe(uz.event.venue("Никоҳ базми"));
    await sim.text(id, "«Наврўз» тўйхонаси");
    expect(sim.lastText(id)).toBe(uz.event.address);
    await sim.text(id, "Сайрам, Амир Темур кўчаси 45");
    const loc = sim.last(id);
    expect(loc.text).toBe(uz.event.location);
    expect(buttonLabels(loc)).toEqual(expect.arrayContaining([uz.event.readyVenues,uz.event.mapChoice,uz.event.linkChoice,uz.event.manualChoice,uz.event.skip,uz.back]));
    expect(JSON.stringify(loc.markup)).not.toContain("location");
    await sim.location(id, 42.3005, 69.7612);
    expect(sim.tg.to(id).some((m) => m.text === uz.event.locationSaved && buttonLabels(m).includes(uz.menu.create))).toBe(true);

    // Тадбир 2: наҳорги ош в тот же день
    expect(sim.lastText(id)).toContain("1. Никоҳ базми — 14.11.2026, 18:00");
    expect(buttonLabels(sim.last(id))).toEqual(expect.arrayContaining([uz.event.addNahorgi, uz.event.addKelinSalom, uz.event.noMore]));
    await sim.click(id, uz.event.addNahorgi);
    expect(sim.lastText(id)).toBe(uz.event.sameDay("Наҳорги ош", "14.11.2026"));
    await sim.click(id, uz.event.sameDayYes);
    expect(sim.lastText(id)).toBe(uz.event.venue("Наҳорги ош"));
    await sim.text(id, "Каримовлар хонадони");
    await sim.text(id, "Сайрам, Юсуф Сарёмий кўчаси 17");
    await sim.text(id, "https://2gis.kz/shymkent/firm/70000001");
    await sim.click(id, uz.event.noMore);

    // Текст: варианты из t.inviteOptions
    expect(sim.lastText(id)).toContain("Сизни фарзандларимиз Азиз ва Мадинанинг никоҳ тўйларига");
    expect(buttonLabels(sim.last(id))).toEqual(expect.arrayContaining([uz.text.pick(1), uz.text.pick(2), uz.text.pick(3), uz.text.own]));
    await sim.click(id, uz.text.pick(2));

    // Музыка из списка: послушать, выбрать
    expect(sim.lastText(id)).toBe(uz.music.ask);
    await sim.click(id, uz.music.fromList);
    await sim.click(id, uz.music.play("Ёр-ёр"));
    const audio = sim.last(id);
    expect(audio.type).toBe("audio");
    expect(audio.media).toBe("https://cdn.test/music/yor-yor.mp3");
    expect((await sim.repo.listMusic())[0].telegramFileId).toMatch(/^TGAUDIO_/);
    await sim.click(id, uz.music.play("Ёр-ёр"));
    expect(sim.last(id).media).toMatch(/^TGAUDIO_/); // второй раз — по file_id
    await sim.click(id, uz.music.choose);
    await sim.click(id, uz.rsvp.no);

    // Сводка
    const review = sim.lastText(id);
    expect(review).toContain(uz.review.title);
    expect(review).toContain("Дизайн: №114 Ипак");
    expect(review).toContain(uz.review.groom("Азиз"));
    expect(review).toContain(uz.review.bride("Мадина"));
    expect(review).toContain(uz.review.sideBride("Юсуповлар оиласи"));
    expect(review).toContain("14.11.2026, 06:00");
    expect(review).toContain(uz.review.textPreset(2));
    expect(review).toContain(uz.review.musicList("Ёр-ёр"));
    expect(buttonLabels(sim.last(id))).toEqual(
      expect.arrayContaining([
        uz.review.editNames,
        uz.review.editHosts,
        uz.review.editSides,
        uz.review.editEvent(1, "Никоҳ базми"),
        uz.review.editEvent(2, "Наҳорги ош"),
        uz.review.editText,
        uz.review.editMusic,
        uz.review.editDesign,
        uz.review.confirm,
      ]),
    );
    await sim.click(id, uz.review.confirm);

    // Заказ создан, ссылка на личную НАМУНА
    const [o] = await sim.repo.listOrdersByUser(id);
    expect(o).toMatchObject({
      status: "preview",
      occasion: "nikoh",
      format: "animated",
      templateId: "ipak",
      slug: "aziz-madina",
      amount: 8_000,
      music: { kind: "list", musicId: "yor-yor" },
    });
    expect(o.data).toMatchObject({
      occasion: "nikoh",
      groom: "Азиз",
      bride: "Мадина",
      relation: "farzand",
      hosts: "Каримовлар оиласи",
      sides: { groom: "Каримовлар оиласи", bride: "Юсуповлар оиласи" },
      textId: "royal",
    });
    expect(o.data.events).toEqual([
      {
        kind: "nikohBazm",
        date: "2026-11-14",
        time: "18:00",
        venueName: "«Наврўз» тўйхонаси",
        address: "Сайрам, Амир Темур кўчаси 45",
        location: { lat: 42.3005, lng: 69.7612 },
      },
      {
        kind: "nahorgi",
        date: "2026-11-14",
        time: "06:00",
        venueName: "Каримовлар хонадони",
        address: "Сайрам, Юсуф Сарёмий кўчаси 17",
        mapUrl: "https://2gis.kz/shymkent/firm/70000001",
      },
    ]);
    const done = sim.last(id);
    expect(done.text).toBe(uz.order.created(`${BASE}/aziz-madina`));
    expect(buttonLabels(done).some((l) => /^💳 Тўлаш — 8.000 ₸$/.test(l))).toBe(true);
    expect(buttonLabels(done)).toContain(uz.order.edit);
    expect((await sim.user(id))?.step).toBe("idle");
  });

  it("slug занят → -2", async () => {
    const sim = new Sim();
    const a = await nikohOrder(sim, 1);
    const b = await nikohOrder(sim, 2);
    expect(a.slug).toBe("aziz-madina");
    expect(b.slug).toBe("aziz-madina-2");
    expect(sim.lastText(2)).toContain(`${BASE}/aziz-madina-2`);
  });

  it("каталог листается по кругу: ◀ с первого — последний", async () => {
    const sim = new Sim();
    await startUz(sim, 1);
    await sim.click(1, uz.category.nikoh);
    await sim.click(1, new RegExp(uz.format.names.animated));
    const cat = sim.last(1);
    expect(buttonLabels(cat)).toContain(`1/${simpleNikoh.length}`);
    expect(cat.media).toBe(`${BASE}/covers/${simpleNikoh[0].id}.jpg`);
    await sim.click(1, "◀");
    expect(buttonLabels(cat)).toContain(`${simpleNikoh.length}/${simpleNikoh.length}`);
    expect(cat.media).toBe(`${BASE}/covers/${simpleNikoh.at(-1)!.id}.jpg`);
    await sim.click(1, "▶");
    expect(buttonLabels(cat)).toContain(`1/${simpleNikoh.length}`);
    expect(cat.media).toBe(`${BASE}/covers/${simpleNikoh[0].id}.jpg`);
  });

  it("суннат показывает форматы по текущему принятому каталогу", async () => {
    const sim = new Sim();
    await startUz(sim, 1);
    await sim.click(1, uz.category.sunnat);
    const labels = buttonLabels(sim.last(1));
    for(const f of ["animated","scroll","simple"] as const)
      expect(labels.some(l=>l.includes(uz.format.names[f]))).toBe(activeDesigns().some(d=>d.occasion==="sunnat"&&d.format===f));
  });

  it("ℹ️ — объяснение разницы форматов обычным сообщением", async () => {
    const sim = new Sim();
    await startUz(sim, 1);
    await sim.click(1, uz.category.nikoh);
    await sim.click(1, uz.format.info);
    expect(sim.tg.to(1).some((m) => m.text === uz.format.infoText)).toBe(true);
    expect(sim.lastText(1)).toContain(uz.format.ask);
  });
});
