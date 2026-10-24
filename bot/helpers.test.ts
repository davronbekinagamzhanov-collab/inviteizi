import { describe, expect, it } from "vitest";
import { parseTime, isMapLink } from "./parse";
import { calendarMonth, kzToday, addMonths } from "./calendar";
import { slugify } from "@/lib/slug";
import { normalizeUpdate } from "./update";

describe("parseTime", () => {
  it.each([
    ["18:30", "18:30"],
    ["9:05", "09:05"],
    ["18.30", "18:30"],
    [" 07:00 ", "07:00"],
    ["0:00", "00:00"],
    ["23:59", "23:59"],
  ])("%s → %s", (input, want) => expect(parseTime(input)).toBe(want));

  it.each(["25:99", "24:00", "12:60", "18", "abc", "", "1830", "18:3"])("%s — неверно", (input) =>
    expect(parseTime(input)).toBeNull(),
  );
});

describe("isMapLink", () => {
  it.each([
    "https://2gis.kz/shymkent/firm/70000001",
    "https://go.2gis.com/abc12",
    "https://maps.app.goo.gl/xyz",
    "https://www.google.com/maps/place/42.3,69.7",
    "https://goo.gl/maps/abc",
    "https://yandex.kz/maps/-/CCU",
  ])("%s — ссылка на карту", (s) => expect(isMapLink(s)).toBe(true));

  it.each(["Сайрам, Амир Темур 45", "https://example.com", "2gis"])("%s — не ссылка", (s) =>
    expect(isMapLink(s)).toBe(false),
  );
});

describe("календарь", () => {
  it("kzToday — дата в Казахстане (UTC+5)", () => {
    expect(kzToday(new Date("2026-11-13T18:59:00Z"))).toBe("2026-11-13");
    expect(kzToday(new Date("2026-11-13T19:00:00Z"))).toBe("2026-11-14");
  });

  it("addMonths переходит через год", () => {
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
  });

  it("calendarMonth: ноябрь 2026 начинается с воскресенья, прошлые дни недоступны", () => {
    const m = calendarMonth("2026-11", "2026-11-14");
    // 1 ноября 2026 — воскресенье: первая неделя — 6 пустых клеток и 1-е число
    expect(m.weeks[0].slice(0, 6).every((c) => c === null)).toBe(true);
    expect(m.weeks[0][6]).toEqual({ day: 1, date: "2026-11-01", past: true });
    const flat = m.weeks.flat().filter((c) => c !== null);
    expect(flat).toHaveLength(30);
    expect(flat.find((c) => c!.day === 13)?.past).toBe(true);
    expect(flat.find((c) => c!.day === 14)?.past).toBe(false); // сегодня можно
    expect(flat.find((c) => c!.day === 30)?.past).toBe(false);
    expect(m.canPrev).toBe(false); // раньше текущего месяца нельзя
    expect(m.canNext).toBe(true);
  });

  it("calendarMonth: следующий месяц — всё доступно, назад можно", () => {
    const m = calendarMonth("2026-12", "2026-11-14");
    expect(m.weeks.flat().every((c) => c === null || !c.past)).toBe(true);
    expect(m.canPrev).toBe(true);
  });

  it("calendarMonth: дальше 12 месяцев вперёд нельзя", () => {
    expect(calendarMonth("2027-11", "2026-11-14").canNext).toBe(false);
    expect(calendarMonth("2027-10", "2026-11-14").canNext).toBe(true);
  });
});

describe("slugify (lib/slug.ts) — случаи, нужные боту", () => {
  it.each([
    [["Азиз", "Мадина"], "aziz-madina"],
    [["Ғайрат", "Ҳилола"], "gayrat-hilola"],
    [["Шаҳзода"], "shahzoda"],
    [["Муҳаммадали"], "muhammadali"],
    [["Абдураҳмонжон ва Абдуллоҳжон"], "abdurahmonjon-va-abdullohjon"],
    [["Ўткир", "Шаъноза"], "otkir-shanoza"],
    [["  Юлдуз 🌸 "], "yulduz"],
    [["Ёқубжон", "Чарос"], "yoqubjon-charos"],
    [[""], "taklif"],
    [["🌸"], "taklif"],
  ])("%j → %s", (names, want) => expect(slugify(...names)).toBe(want));

  it("обрезает до 40 знаков без «-» на конце", () => {
    const s = slugify("Абдураҳмонжон Абдуллоҳжон Муҳаммадали Шаҳзода");
    expect(s.length).toBeLessThanOrEqual(40);
    expect(s.endsWith("-")).toBe(false);
  });
});

describe("normalizeUpdate", () => {
  const from = { id: 7, is_bot: false, first_name: "Азиз", username: "aziz" };
  const chat = { id: 7, type: "private" as const, first_name: "Азиз" };
  const msg = (extra: object) => ({ update_id: 1, message: { message_id: 10, date: 0, chat, from, ...extra } });

  it("текст", () => {
    expect(normalizeUpdate(msg({ text: "Салом" }) as never)).toMatchObject({
      kind: "text",
      text: "Салом",
      chatId: 7,
      messageId: 10,
      from: { id: 7, username: "aziz", firstName: "Азиз" },
    });
  });

  it("команда с аргументами и @ботом", () => {
    expect(normalizeUpdate(msg({ text: "/start qr_12" }) as never)).toMatchObject({
      kind: "command",
      command: "start",
      args: "qr_12",
    });
    expect(normalizeUpdate(msg({ text: "/find@InviteIZIbot Азиз" }) as never)).toMatchObject({
      kind: "command",
      command: "find",
      args: "Азиз",
    });
  });

  it("callback", () => {
    const u = {
      update_id: 2,
      callback_query: { id: "cb1", from, chat_instance: "x", data: "a:3:yes", message: { message_id: 55, date: 0, chat } },
    };
    expect(normalizeUpdate(u as never)).toMatchObject({ kind: "callback", data: "a:3:yes", callbackId: "cb1", messageId: 55, chatId: 7 });
  });

  it("локация, фото (самое большое), документ, аудио, голос", () => {
    expect(normalizeUpdate(msg({ location: { latitude: 42.3, longitude: 69.7 } }) as never)).toMatchObject({
      kind: "location",
      lat: 42.3,
      lng: 69.7,
    });
    expect(
      normalizeUpdate(
        msg({ photo: [{ file_id: "s", file_unique_id: "s", width: 90, height: 90 }, { file_id: "L", file_unique_id: "L", width: 1280, height: 1280 }] }) as never,
      ),
    ).toMatchObject({ kind: "photo", fileId: "L" });
    expect(
      normalizeUpdate(msg({ document: { file_id: "D", file_unique_id: "D", mime_type: "application/pdf", file_name: "chek.pdf", file_size: 1000 } }) as never),
    ).toMatchObject({ kind: "document", fileId: "D", mimeType: "application/pdf", fileName: "chek.pdf", fileSize: 1000 });
    expect(
      normalizeUpdate(msg({ audio: { file_id: "A", file_unique_id: "A", duration: 200, title: "Ёр-ёр", performer: "Юлдуз", file_size: 5_000_000 } }) as never),
    ).toMatchObject({ kind: "audio", fileId: "A", title: "Ёр-ёр", performer: "Юлдуз", fileSize: 5_000_000 });
    expect(normalizeUpdate(msg({ voice: { file_id: "V", file_unique_id: "V", duration: 3 } }) as never)).toMatchObject({ kind: "voice" });
    expect(normalizeUpdate(msg({ sticker: { file_id: "S" } }) as never)).toMatchObject({ kind: "other" });
  });

  it("не личный чат и пустые обновления — null", () => {
    const group = { update_id: 3, message: { message_id: 1, date: 0, chat: { id: -5, type: "group", title: "x" }, from, text: "hi" } };
    expect(normalizeUpdate(group as never)).toBeNull();
    expect(normalizeUpdate({ update_id: 4 } as never)).toBeNull();
  });
});
