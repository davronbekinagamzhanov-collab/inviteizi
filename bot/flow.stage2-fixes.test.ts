import { describe, expect, it } from "vitest";
import { uz } from "@/texts/bot-uz";
import { ru } from "@/texts/bot-ru";
import { normalizeUpdate, type BotUpdate } from "./update";
import { buttonLabels, FakeTg } from "./testing/fake-tg";
import { nikohToMusic, startRu, startUz, pickDesign, setChoices } from "./testing/paths";
import { Sim } from "./testing/sim";

/** Сайрам: 31.10.2026 23:00 */
const LATE = "2026-10-31T18:00:00Z";

async function toDate(sim: Sim, id = 1) {
  await startUz(sim, id);
  await sim.click(id, uz.category.nikoh);
  await pickDesign(sim, id, "animated");
  await sim.text(id, "Азиз");
  await sim.text(id, "Мадина");
  await sim.click(id, "Фарзандларимиз");
  await sim.text(id, "Каримовлар");
  await sim.click(id, uz.form.sideNo);
}

describe("шага «формат» больше нет (v2)", () => {
  it.each([["uz", uz, startUz], ["ru", ru, startRu]] as const)("%s: после тадбира сразу каталог, кнопок тарифов и «Фарқи нимада» нет", async (_, tx, start) => {
    const sim = new Sim();
    await start(sim, 1);
    await sim.click(1, tx.category.nikoh);
    expect((await sim.user(1))!.step).toBe("catalog");
    const labels = buttonLabels(sim.last(1));
    expect(labels).not.toContain(tx.format.info);
    for (const name of Object.values(tx.format.names)) expect(labels.some((l) => l.includes(name))).toBe(false);
  });
});

describe("FakeTg ведёт себя как Telegram", () => {
  it("всплывающий текст длиннее 200 отклоняется", async () => {
    await expect(new FakeTg().answerCallbackQuery("c", { text: "x".repeat(201), alert: true })).rejects.toThrow(/MESSAGE_TOO_LONG/);
  });
  it("callback_data длиннее 64 байт отклоняется", async () => {
    await expect(new FakeTg().sendMessage(1, "t", { markup: { inline: [[{ text: "b", data: "ш".repeat(33) }]] } })).rejects.toThrow(/BUTTON_DATA_INVALID/);
  });
  it("сообщение длиннее 4096 и подпись длиннее 1024 отклоняются", async () => {
    await expect(new FakeTg().sendMessage(1, "x".repeat(4097))).rejects.toThrow(/too long/);
    await expect(new FakeTg().sendPhoto(1, "p", { caption: "x".repeat(1025) })).rejects.toThrow(/too long/);
  });
});

describe("время в прошлом при дате «сегодня»", () => {
  it("прошедшие часы сегодня не показываются", async () => {
    const sim = new Sim({ now: "2026-10-31T13:30:00Z" }); // 18:30
    await toDate(sim);
    await sim.click(1, "31");
    const labels = buttonLabels(sim.last(1));
    expect(labels).toContain("19:00");
    for (const gone of ["11:00", "12:00", "17:00", "18:00"]) expect(labels).not.toContain(gone);
  });

  it("устаревшая кнопка часа: подсказка и вопрос снова, время не сохранено", async () => {
    const sim = new Sim({ now: "2026-10-31T13:30:00Z" });
    await toDate(sim);
    await sim.click(1, "31");
    const { q } = (await sim.user(1))!.state as { q: number };
    await sim.callback(1, `a:${q}:t:18:00`, sim.last(1).id);
    expect(sim.tg.to(1).some((m) => m.text === uz.event.pastTime)).toBe(true);
    const user = (await sim.user(1))!;
    expect(user.step).toBe("evTime");
    expect((user.state as { data: { events: { time?: string }[] } }).data.events[0].time).toBeUndefined();
  });

  it("своё время: 19:00 в 23:00 не принимается, 23:30 принимается", async () => {
    const sim = new Sim({ now: LATE });
    await toDate(sim);
    await sim.click(1, "31");
    await sim.click(1, uz.event.timeOther);
    await sim.text(1, "19:00");
    expect(sim.tg.to(1).some((m) => m.text === uz.event.pastTime)).toBe(true);
    await sim.text(1, "23:30");
    expect((await sim.user(1))!.step).toBe("evVenue");
  });

  it("время можно написать на экране кнопок: прошедшее не принимается", async () => {
    const sim = new Sim({ now: LATE });
    await toDate(sim);
    await sim.click(1, "31");
    await sim.text(1, "19:00");
    expect(sim.tg.to(1).some((m) => m.text === uz.event.pastTime)).toBe(true);
    expect((await sim.user(1))!.step).toBe("evTime");
  });

  it("другой день: все часы на месте", async () => {
    const sim = new Sim({ now: LATE });
    await toDate(sim);
    await sim.click(1, "▶");
    await sim.click(1, "1");
    expect(buttonLabels(sim.last(1))).toContain("11:00");
  });

  it("добавленный наҳорги сегодня: время по умолчанию 06:00 не подставляется, если прошло", async () => {
    const sim = new Sim({ now: LATE });
    await toDate(sim);
    await sim.click(1, "31");
    await sim.text(1, "23:30");
    await sim.text(1, "Наврўз");
    await sim.text(1, "Сайрам");
    await sim.click(1, uz.event.skip);
    await sim.click(1, uz.event.addNahorgi);
    await sim.click(1, uz.event.sameDayYes);
    expect((await sim.user(1))!.step).toBe("evTime");
  });

  it("правка даты на сегодня из сводки: прошедшее время нужно выбрать заново", async () => {
    const sim = new Sim({ now: "2026-10-31T15:00:00Z" }); // 20:00
    await toDate(sim);
    await sim.click(1, "▶");
    await sim.click(1, "14");
    await sim.click(1, "18:00");
    await sim.text(1, "Наврўз");
    await sim.text(1, "Сайрам");
    await sim.click(1, uz.event.skip);
    await sim.click(1, uz.event.noMore);
    await setChoices(sim, 1, { text: 1, music: "none", rsvp: false });
    await sim.click(1, /^✏️ 1\./);
    await sim.click(1, uz.review.evDate);
    await sim.click(1, "◀");
    await sim.click(1, "31");
    expect((await sim.user(1))!.step).toBe("evTime");
    await sim.text(1, "21:00");
    expect((await sim.user(1))!.step).toBe("review");
  });
});

describe("пересланная песня", () => {
  const forwarded = (fields: object) => normalizeUpdate({
    update_id: 9,
    message: {
      message_id: 9, date: 0,
      chat: { id: 1, type: "private", first_name: "A" }, from: { id: 1, is_bot: false, first_name: "A" },
      forward_origin: { type: "channel", date: 0, chat: { id: -100, type: "channel", title: "Қўшиқлар" }, message_id: 5 },
      ...fields,
    },
  } as never) as BotUpdate;

  it("audio из канала с готовым file_id сохраняется и попадает в заказ", async () => {
    const sim = new Sim();
    await nikohToMusic(sim, 1);
    await sim.click(1, uz.music.own);
    await sim.send(forwarded({ audio: { file_id: "FWD", file_unique_id: "u", duration: 180, title: "Ёр-ёр", performer: "Ҳофиз" } }));
    expect(sim.savedMusic).toEqual(["FWD"]);
    expect(sim.tg.to(1).some((m) => m.text === uz.music.saved)).toBe(true);
    await sim.click(1, uz.review.confirm);
    const [order] = await sim.repo.listOrdersByUser(1);
    expect(order.music).toEqual({ kind: "own", fileId: "FWD", url: "https://cdn.test/music/own/FWD.mp3", title: "Ҳофиз — Ёр-ёр" });
  });

  it("пересланное голосовое: подсказка про forward и mp3", async () => {
    const sim = new Sim();
    await nikohToMusic(sim, 1);
    await sim.click(1, uz.music.own);
    await sim.send(forwarded({ voice: { file_id: "V", file_unique_id: "u", duration: 1 } }));
    expect(sim.savedMusic).toEqual([]);
    expect(sim.tg.to(1).some((m) => m.text === uz.music.sendFile)).toBe(true);
  });

  it("на шаге музыки сразу видна подсказка", async () => {
    const sim = new Sim();
    await nikohToMusic(sim, 1);
    await sim.click(1, uz.music.own);
    expect(sim.lastText(1)).toBe(uz.music.ownAsk);
  });
});
