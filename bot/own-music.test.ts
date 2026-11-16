import { describe, expect, it, vi } from "vitest";
import { GrammyError } from "grammy";
import { uz } from "@/texts/bot-uz";
import { ru } from "@/texts/bot-ru";
import { copyOwnMusic, MusicTooBigError, type MusicIo } from "./own-music";
import { MAX_MUSIC_BYTES } from "./audio-type";
import { normalizeUpdate } from "./update";
import { Sim } from "./testing/sim";
import { nikohToMusic } from "./testing/paths";
import type { BotUpdate } from "./update";

const SAVED = "https://cdn.test/music/own/abc.mp3";

function io(over: Partial<MusicIo> = {}, path = "music/file_1.mp3", body: BodyInit = new Uint8Array([1, 2, 3])) {
  const uploads: { ext: string; size: number; contentType: string }[] = [];
  const value: MusicIo = {
    getFileUrl: async () => `https://api.telegram.org/file/botT/${path}`,
    fetch: (async (_url: string, init?: RequestInit) => (init?.method === "HEAD" ? new Response(null, { status: 200 }) : new Response(body))) as typeof fetch,
    upload: async (ext, bytes, contentType) => { uploads.push({ ext, size: bytes.byteLength, contentType }); return SAVED; },
    ...over,
  };
  return { value, uploads };
}

describe("copyOwnMusic", () => {
  it.each([
    ["music/file_1.mp3", "mp3", "audio/mpeg"],
    ["music/file_2.m4a", "m4a", "audio/mp4"],
    ["documents/file_3.MP3", "mp3", "audio/mpeg"],
    ["documents/file_4.m4a", "m4a", "audio/mp4"],
  ])("%s сохраняется с верным типом", async (path, ext, contentType) => {
    const { value, uploads } = io({}, path);
    await expect(copyOwnMusic("F", value)).resolves.toBe(SAVED);
    expect(uploads).toEqual([{ ext, size: 3, contentType }]);
  });

  it("повтор того же файла идёт через тот же upload и даёт тот же адрес", async () => {
    const { value, uploads } = io();
    expect(await copyOwnMusic("F", value)).toBe(await copyOwnMusic("F", value));
    expect(uploads).toHaveLength(2);
  });

  it("файл без file_size больше 12 МБ останавливается при скачивании", async () => {
    const big = new ReadableStream({ start(c) { c.enqueue(new Uint8Array(MAX_MUSIC_BYTES + 1)); c.close(); } });
    const { value, uploads } = io({}, "music/f.mp3", big);
    await expect(copyOwnMusic("F", value)).rejects.toBeInstanceOf(MusicTooBigError);
    expect(uploads).toEqual([]);
  });

  it("Telegram отказал отдавать большой файл → понятная ошибка о размере", async () => {
    const tooBig = new GrammyError("x", { ok: false, error_code: 400, description: "Bad Request: file is too big" }, "getFile", {});
    await expect(copyOwnMusic("F", io({ getFileUrl: async () => { throw tooBig; } }).value)).rejects.toBeInstanceOf(MusicTooBigError);
  });

  it("пустой файл и нерабочий адрес после загрузки не считаются сохранением", async () => {
    await expect(copyOwnMusic("F", io({}, "m/f.mp3", new Uint8Array()).value)).rejects.toThrow(/Empty/);
    const fetchBroken = (async (_u: string, init?: RequestInit) => (init?.method === "HEAD" ? new Response(null, { status: 404 }) : new Response(new Uint8Array([1])))) as typeof fetch;
    await expect(copyOwnMusic("F", io({ fetch: fetchBroken }).value)).rejects.toThrow(/not available/);
  });

  it.each(["getFileUrl", "fetch", "upload"] as const)("зависание на шаге %s укладывается в общий лимит", async (step) => {
    const { value } = io({ [step]: () => new Promise(() => {}) });
    await expect(copyOwnMusic("F", value, 20)).rejects.toMatchObject({ name: "TimeoutError" });
  });
});

describe("шаг «своя музыка»", () => {
  async function atOwn() {
    const sim = new Sim();
    await nikohToMusic(sim, 1);
    await sim.click(1, uz.music.own);
    return sim;
  }
  const raw = (fields: object) => normalizeUpdate({ update_id: 5, message: { message_id: 5, date: 0, chat: { id: 1, type: "private", first_name: "A" }, from: { id: 1, is_bot: false, first_name: "A" }, ...fields } } as never) as BotUpdate;

  it.each([
    ["audio mp3", { audio: { file_id: "A1", file_unique_id: "u", duration: 1, mime_type: "audio/mpeg", file_name: "a.mp3", file_size: 1000 } }, "A1"],
    ["audio m4a", { audio: { file_id: "A2", file_unique_id: "u", duration: 1, mime_type: "audio/mp4", file_name: "a.m4a", file_size: 1000 } }, "A2"],
    ["document mp3", { document: { file_id: "D1", file_unique_id: "u", mime_type: "audio/mpeg", file_name: "a.mp3", file_size: 1000 } }, "D1"],
    ["document m4a без mime", { document: { file_id: "D2", file_unique_id: "u", file_name: "a.m4a", file_size: 1000 } }, "D2"],
    ["audio без file_size", { audio: { file_id: "A3", file_unique_id: "u", duration: 1 } }, "A3"],
  ])("%s принимается и попадает в анкету", async (_, fields, fileId) => {
    const sim = await atOwn();
    await sim.send(raw(fields));
    const user = (await sim.user(1))!;
    expect(user.step).toBe("review");
    expect(user.state.music).toMatchObject({ kind: "own", fileId, url: `https://cdn.test/music/own/${fileId}.mp3` });
    expect(sim.tg.to(1).some(m => m.text === uz.music.saved)).toBe(true);
    expect((user.state as { data: { groom?: string } }).data.groom).toBeTruthy();
  });

  it.each([
    ["голосовое", { voice: { file_id: "V", file_unique_id: "u", duration: 1 } }],
    ["видеокружок", { video_note: { file_id: "N", file_unique_id: "u", length: 1, duration: 1 } }],
    ["видео", { video: { file_id: "W", file_unique_id: "u", width: 1, height: 1, duration: 1 } }],
    ["название песни", { text: "Ёр-ёр" }],
    ["не аудио-файл", { document: { file_id: "P", file_unique_id: "u", mime_type: "application/pdf", file_name: "a.pdf" } }],
  ])("%s → подсказка про mp3, шаг и анкета на месте", async (_, fields) => {
    const sim = await atOwn();
    const before = (await sim.user(1))!;
    await sim.send(raw(fields));
    const user = (await sim.user(1))!;
    expect(user.step).toBe("musicOwn");
    expect((user.state.music as { kind?: string } | undefined)?.kind).not.toBe("own");
    expect(user.state.data).toEqual(before.state.data);
    expect(sim.tg.to(1).some(m => m.text === uz.music.sendFile)).toBe(true);
    expect(sim.savedMusic).toEqual([]);
  });

  it("подсказка объясняет forward и раздел «Музыка» на обоих языках", () => {
    for (const text of [uz.music.ownAsk, uz.music.sendFile]) {
      expect(text).toContain("Қўшиқни Telegram'даги каналдан шу ерга юборинг (forward) ёки mp3");
      expect(text).toContain('Телефондаги "Музыка" бўлимидан юбориб бўлмайди');
    }
    for (const text of [ru.music.ownAsk, ru.music.sendFile]) {
      expect(text).toContain("forward");
      expect(text).toContain("Из раздела «Музыка» на телефоне отправить нельзя");
    }
  });

  it("файл больше 12 МБ не скачивается", async () => {
    const sim = await atOwn();
    await sim.audio(1, "BIG", MAX_MUSIC_BYTES + 1);
    expect(sim.savedMusic).toEqual([]);
    expect(sim.tg.to(1).some(m => m.text === uz.music.tooBig("12.0"))).toBe(true);
    expect((await sim.user(1))!.step).toBe("musicOwn");
  });

  it("файл без размера оказался большим: подсказка о размере, анкета цела", async () => {
    const sim = await atOwn();
    sim.deps.saveMusic = async () => { throw new MusicTooBigError(); };
    await sim.send(raw({ audio: { file_id: "X", file_unique_id: "u", duration: 1 } }));
    expect(sim.tg.to(1).some(m => m.text === uz.music.tooBigUnknown)).toBe(true);
    expect(((await sim.user(1))!.state.music as { kind?: string } | undefined)?.kind).not.toBe("own");
  });

  it("медленная загрузка оборвалась по лимиту: без «сохранено», ошибка записана, можно повторить", async () => {
    const sim = await atOwn();
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      sim.deps.saveMusic = async () => { throw new DOMException("timeout", "TimeoutError"); };
      await sim.audio(1, "SLOW", 1000);
      expect(sim.tg.to(1).some(m => m.text === uz.music.saved)).toBe(false);
      expect(sim.lastText(1)).toBe(uz.music.saveFailed);
      expect(sim.repo.botErrors).toMatchObject([{ step: "musicOwn", errorName: "TimeoutError" }]);
      sim.deps.saveMusic = async () => SAVED;
      await sim.audio(1, "SLOW", 1000);
      expect((await sim.user(1))!.state.music).toMatchObject({ url: SAVED });
    } finally { log.mockRestore(); }
  });

  it.each([
    ["ogg-документ", { document: { file_id: "O", file_unique_id: "u", mime_type: "audio/ogg", file_name: "song.ogg" } }],
    ["wav-аудио", { audio: { file_id: "W", file_unique_id: "u", duration: 1, mime_type: "audio/wav", file_name: "song.wav" } }],
  ])("%s → «только mp3 или m4a», файл не скачивается (17.11.2026)", async (_, fields) => {
    const sim = await atOwn();
    await sim.send(raw(fields));
    expect(sim.tg.to(1).some((m) => m.text === uz.music.format)).toBe(true);
    expect(sim.savedMusic).toEqual([]);
    expect((await sim.user(1))!.step).toBe("musicOwn");
  });

  it("m4a-документ принимается", async () => {
    const sim = await atOwn();
    await sim.send(raw({ document: { file_id: "M", file_unique_id: "u", mime_type: "audio/mp4", file_name: "Тўй.m4a" } }));
    expect(sim.savedMusic).toEqual(["M"]);
  });

  it("хранилище не подключено → «временно не сохраняются», анкета цела", async () => {
    const { StorageUnavailableError } = await import("@/lib/storage");
    const sim = await atOwn();
    sim.deps.saveMusic = async () => { throw new StorageUnavailableError("test"); };
    await sim.audio(1, "F", 1000);
    expect(sim.tg.to(1).some((m) => m.text === uz.music.storageDown)).toBe(true);
    expect((await sim.user(1))!.step).toBe("musicOwn");
  });

  it("адрес не https не считается сохранением", async () => {
    const sim = await atOwn();
    sim.deps.saveMusic = async () => "own/path.mp3";
    await sim.audio(1, "F", 1000);
    expect(sim.lastText(1)).toBe(uz.music.saveFailed);
    expect(((await sim.user(1))!.state.music as { kind?: string } | undefined)?.kind).not.toBe("own");
  });
});

describe("оплата и заказ: сбой сообщения после записи", () => {
  it("чек: админ получает его, даже если ответ клиенту не ушёл; повтор ничего не дублирует", async () => {
    const { nikohOrder } = await import("./testing/paths");
    const { ADMIN } = await import("./testing/sim");
    const sim = new Sim();
    await nikohOrder(sim, 1);
    await sim.click(1, /Тўлаш|💳/);
    await sim.click(1, /^✅ (Ҳаммаси тўғри|Всё верно|Бәрі дұрыс)/);
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const real = sim.tg.sendMessage.bind(sim.tg);
      vi.spyOn(sim.tg, "sendMessage").mockImplementation(async (chat, text, opts) => {
        if (chat === 1 && text === uz.pay.receiptGot) throw new Error("telegram down");
        return real(chat, text, opts);
      });
      await sim.photo(1);
      expect(sim.tg.to(ADMIN).filter(m => m.type === "photo")).toHaveLength(1);
      expect((await sim.repo.listOrdersByUser(1))[0].status).toBe("receipt_sent");
      expect((await sim.user(1))!.step).toBe("idle");
    } finally { log.mockRestore(); vi.restoreAllMocks(); }
  });

  it("заказ создан, сообщение не ушло: заказ один и повтор не создаёт второй", async () => {
    const { nikohToMusic: path } = await import("./testing/paths");
    const sim = new Sim();
    await path(sim, 1);
    await sim.click(1, uz.music.none);
    await sim.click(1, uz.rsvp.edit);
    await sim.click(1, uz.rsvp.no);
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const { msg, data } = sim.findButton(1, uz.review.confirm);
      const send = vi.spyOn(sim.tg, "sendMessage").mockRejectedValue(new Error("telegram down"));
      const update: BotUpdate = { kind: "callback", updateId: 777, from: sim.from(1), chatId: 1, messageId: msg.id, callbackId: "cb", data };
      expect(await (await import("./flow")).handle(sim.deps, update)).toBe(true);
      send.mockRestore();
      expect(await (await import("./flow")).handle(sim.deps, update)).toBe(true);
      expect(await sim.repo.listOrdersByUser(1)).toHaveLength(1);
      expect(sim.repo.botErrors).toHaveLength(1);
    } finally { log.mockRestore(); }
  });
});
