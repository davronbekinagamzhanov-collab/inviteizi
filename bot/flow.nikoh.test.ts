import { describe, expect, it } from "vitest";
import { uz } from "@/texts/bot-uz";
import { Sim } from "./testing/sim";
import { buttonLabels, inlineButtons } from "./testing/fake-tg";
import { nikohOrder, startUz } from "./testing/paths";
import { catalogList } from "./flow/steps-order";
import { activeDesigns, PRICES } from "@/templates/registry";
import { tPlain } from "@/texts/uz-cyrl";

const BASE = "https://inviteizi.vercel.app";

describe("весь путь никоҳ на ўзбекском", () => {
  it("от /start insta до ссылки на НАМУНА", async () => {
    const sim = new Sim();
    const id = 1;
    await startUz(sim, id, "insta");

    // Категория → сразу каталог: альбом из 3 обложек + одно сообщение с ценами и кнопками
    expect(buttonLabels(sim.last(id))).toEqual(
      expect.arrayContaining([uz.category.nikoh, uz.category.nahorgi, uz.category.sunnat, uz.back]),
    );
    await sim.click(id, uz.category.nikoh);
    const list = catalogList({ s: { occasion: "nikoh" } });
    const album = sim.tg.to(id).filter((m) => m.type === "photo");
    expect(album.map((m) => m.media)).toEqual(list.slice(0, 3).map((d) => `${BASE}/covers/${d.id}.jpg`));
    const menu = sim.last(id);
    const first = list[0];
    expect(menu.text).toContain(`1️⃣ №${first.number} ${tPlain.designs[first.id]} — `);
    expect(
      menu.text
        .split("\n")
        .find((l) => l.startsWith("1️⃣"))!
        .includes("📷"),
    ).toBe(Boolean(first.clientPhotos));
    expect(menu.text).not.toMatch(/Анимацияли|Варақланадиган|Оддий/);
    expect(buttonLabels(menu)).toEqual(
      expect.arrayContaining(["◀", `1–3 / ${list.length}`, "▶", uz.catalog.view("1️⃣"), uz.catalog.pick("1️⃣")]),
    );
    expect(inlineButtons(menu).find((b) => b.text === uz.catalog.view("1️⃣"))).toEqual({
      text: uz.catalog.view("1️⃣"),
      url: `${BASE}/demo/${first.id}`,
    });
    // ▶ — следующая страница: старый альбом и кнопки удалены, в чате только новая страница
    await sim.click(id, "▶");
    expect(
      sim.tg
        .to(id)
        .filter((m) => m.type === "photo")
        .map((m) => m.media),
    ).toEqual(list.slice(3, 6).map((d) => `${BASE}/covers/${d.id}.jpg`));
    expect(sim.tg.to(id).some((m) => m.id === menu.id)).toBe(false);
    expect(sim.lastText(id)).toContain(`№${list[3].number} `);
    await sim.click(id, "◀");
    await sim.click(id, uz.catalog.pick("2️⃣"));
    // Выбор: альбом убран, кнопки заменены строкой «✅ Танланди»
    expect(sim.tg.to(id).filter((m) => m.type === "photo")).toEqual([]);
    expect(
      sim.tg
        .to(id)
        .some(
          (m) =>
            m.text === uz.catalog.chosen(list[1].number, "Ипак") ||
            m.text.startsWith(`✅ Танланди: №${list[1].number} `),
        ),
    ).toBe(true);

    // Анкета
    expect(sim.lastText(id)).toBe(uz.form.groom);
    await sim.text(id, "Азиз");
    expect(sim.lastText(id)).toBe(uz.form.bride);
    await sim.text(id, "Мадина");
    expect(sim.lastText(id)).toBe(uz.form.relationNikoh);
    expect(buttonLabels(sim.last(id))).toEqual(
      expect.arrayContaining(["Фарзандларимиз", "Набираларимиз", "Ўзимизники"]),
    );
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
    expect(buttonLabels(sim.last(id))).toEqual(
      expect.arrayContaining(["11:00", "12:00", "17:00", "18:00", "19:00", uz.event.timeOther]),
    );
    await sim.click(id, "18:00");
    expect(sim.lastText(id)).toBe(uz.event.venue("Никоҳ базми"));
    await sim.text(id, "«Наврўз» тўйхонаси");
    expect(sim.lastText(id)).toBe(uz.event.address);
    await sim.text(id, "Сайрам, Амир Темур кўчаси 45");
    const loc = sim.last(id);
    expect(loc.text).toBe(uz.event.location);
    expect(buttonLabels(loc)).toEqual(
      expect.arrayContaining([
        uz.event.readyVenues,
        uz.event.mapChoice,
        uz.event.linkChoice,
        uz.event.manualChoice,
        uz.event.skip,
        uz.back,
      ]),
    );
    expect(JSON.stringify(loc.markup)).not.toContain("location");
    await sim.location(id, 42.3005, 69.7612);
    // клавиатура «📍 Локация» убирается (removeReply), главное меню — кнопками под сообщением /start
    expect(
      sim.tg
        .to(id)
        .some(
          (m) =>
            m.text === uz.event.locationSaved && JSON.stringify(m.markup) === JSON.stringify({ removeReply: true }),
        ),
    ).toBe(true);

    // Тадбир 2: наҳорги ош в тот же день
    expect(sim.lastText(id)).toContain("1. Никоҳ базми — 14.11.2026, 18:00");
    expect(buttonLabels(sim.last(id))).toEqual(
      expect.arrayContaining([uz.event.addNahorgi, uz.event.addKelinSalom, uz.event.noMore]),
    );
    await sim.click(id, uz.event.addNahorgi);
    expect(sim.lastText(id)).toBe(uz.event.sameDay("Наҳорги ош", "14.11.2026"));
    await sim.click(id, uz.event.sameDayYes);
    expect(sim.lastText(id)).toBe(uz.event.venue("Наҳорги ош"));
    await sim.text(id, "Каримовлар хонадони");
    await sim.text(id, "Сайрам, Юсуф Сарёмий кўчаси 17");
    await sim.text(id, "https://2gis.kz/shymkent/firm/70000001");
    await sim.click(id, uz.event.noMore);

    // Бот сам выбрал текст, музыку и «ответы гостей» — сразу сводка «Бот танлади»
    expect(sim.lastText(id)).toContain(uz.review.title);
    expect(sim.lastText(id)).toContain(uz.review.textPreset(1));
    await sim.click(id, uz.review.editText);
    // Текст: варианты из t.inviteOptions
    expect(sim.lastText(id)).toContain("Сизни фарзандларимиз Азиз ва Мадинанинг никоҳ тўйларига");
    expect(buttonLabels(sim.last(id))).toEqual(
      expect.arrayContaining([uz.text.pick(1), uz.text.pick(2), uz.text.pick(3), uz.text.own]),
    );
    await sim.click(id, uz.text.pick(2));
    await sim.click(id, uz.review.editMusic);

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
    await sim.click(id, uz.rsvp.edit);
    await sim.click(id, uz.rsvp.no);

    // Сводка
    const review = sim.lastText(id);
    expect(review).toContain(uz.review.title);
    expect(review).toContain(`Дизайн: №${list[1].number} ${tPlain.designs[list[1].id]}`);
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
      format: list[1].format,
      templateId: list[1].id,
      slug: "aziz-madina",
      amount: PRICES[list[1].format],
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

  it("каталог листается по кругу: ◀ с первой страницы — последняя", async () => {
    const sim = new Sim();
    await startUz(sim, 1);
    await sim.click(1, uz.category.nikoh);
    const list = catalogList({ s: { occasion: "nikoh" } });
    const lastStart = Math.floor((list.length - 1) / 3) * 3;
    await sim.click(1, "◀");
    expect(buttonLabels(sim.last(1))).toContain(`${lastStart + 1}–${list.length} / ${list.length}`);
    expect(sim.lastText(1)).toContain(`№${list.at(-1)!.number} `);
    await sim.click(1, "▶");
    expect(buttonLabels(sim.last(1))).toContain(`1–3 / ${list.length}`);
    expect(sim.tg.to(1).filter((m) => m.type === "photo")[0].media).toBe(`${BASE}/covers/${list[0].id}.jpg`);
  });

  it("суннат: в каталоге все принятые дизайны тадбира, шага «формат» нет", async () => {
    const sim = new Sim();
    await startUz(sim, 1);
    await sim.click(1, uz.category.sunnat);
    expect((await sim.user(1))!.step).toBe("catalog");
    const list = catalogList({ s: { occasion: "sunnat" } });
    expect(list.map((d) => d.id).sort()).toEqual(
      activeDesigns()
        .filter((d) => d.occasion === "sunnat")
        .map((d) => d.id)
        .sort(),
    );
  });
});
