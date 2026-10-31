import { describe, expect, it, vi } from "vitest";
import { Api, GrammyError, HttpError } from "grammy";
import { uz } from "@/texts/bot-uz";
import { classifyError, recordBotError, redact, toEntry } from "./errors";
import { createTg } from "./telegram";
import { handleWebhookRequest } from "./webhook";
import { Sim } from "./testing/sim";
import { nikohToMusic, startUz } from "./testing/paths";
import type { BotUpdate } from "./update";

const SECRET = "s3cr3t";
const H = { "x-telegram-bot-api-secret-token": SECRET };
const apiError = (code: number, description: string) =>
  new GrammyError("call failed", { ok: false, error_code: code, description }, "sendMessage", {});
const textUpdate = (updateId: number, text: string, chat = 1) => ({
  update_id: updateId,
  message: { message_id: updateId, date: 0, chat: { id: chat, type: "private", first_name: "Азиз" }, from: { id: chat, is_bot: false, first_name: "Азиз" }, text },
});
const post = (sim: Sim, body: unknown) =>
  handleWebhookRequest(new Request("https://x.test/api/bot", { method: "POST", headers: H, body: JSON.stringify(body) }), { secret: SECRET, getDeps: () => sim.deps });
const quiet = () => vi.spyOn(console, "error").mockImplementation(() => {});

describe("classifyError", () => {
  it.each([
    ["429 Telegram", apiError(429, "Too Many Requests")],
    ["5xx Telegram", apiError(502, "Bad Gateway")],
    ["тайм-аут Telegram", new HttpError("timeout", new Error("timeout"))],
    ["обрыв соединения с базой", Object.assign(new Error("x"), { code: "CONNECTION_CLOSED" })],
    ["serialization failure", Object.assign(new Error("x"), { code: "40001" })],
    ["fetch failed", new TypeError("fetch failed")],
  ])("%s → повторяем", (_, e) => expect(classifyError(e)).toBe("transient"));

  it.each([
    ["кнопка устарела", apiError(400, "Bad Request: query is too old")],
    ["бот заблокирован", apiError(403, "Forbidden: bot was blocked by the user")],
    ["ошибка в коде", new TypeError("x is not a function")],
    ["нет таблицы", Object.assign(new Error("x"), { code: "42P01" })],
    ["нарушено ограничение", Object.assign(new Error("x"), { code: "23505" })],
  ])("%s → не повторяем", (_, e) => expect(classifyError(e)).toBe("permanent"));
});

describe("запись bot_errors", () => {
  const u: BotUpdate = { kind: "text", text: "Мадина +7 701 123 45 67", chatId: 987654321, messageId: 1, from: { id: 987654321, username: "madina_k", firstName: "Мадина" } };

  it("убирает токены, адреса, телефоны, ID и данные клиента", () => {
    const e = new Error("Мадина madina_k https://api.telegram.org/file/bot111:PRIVATE/987654321/a.mp3 bot111:PRIVATE +7 701 123 45 67 id 987654321 Мадина +7 701 123 45 67");
    const entry = toEntry(e, u, "musicOwn", "ack");
    const all = JSON.stringify(entry);
    for (const leak of ["Мадина", "madina_k", "PRIVATE", "987654321", "701"]) expect(all).not.toContain(leak);
    expect(entry).toMatchObject({ step: "musicOwn", updateKind: "text", errorName: "Error", outcome: "ack" });
    expect(redact("x".repeat(10))).toHaveLength(10);
  });

  it("обрезает текст и стек, а из стека берёт только строки вызовов", () => {
    const e = new Error("m".repeat(900));
    e.stack = `Error: Мадина\n${"    at f (a.ts:1:1)\n".repeat(400)}`;
    const entry = toEntry(e, u, null, "retry");
    expect(entry.message).toHaveLength(500);
    expect(entry.stack!.length).toBeLessThanOrEqual(2000);
    expect(entry.stack).not.toContain("Мадина");
  });

  it("сбой записи (миграция не применена) и зависшая запись не мешают обработке", async () => {
    const log = quiet();
    try {
      const entry = toEntry(new Error("x"), u, null, "ack");
      await expect(recordBotError({ repo: { logBotError: async () => { throw new Error("relation does not exist"); } } as never }, entry)).resolves.toBeUndefined();
      await expect(recordBotError({ repo: { logBotError: () => new Promise(() => {}) } as never }, entry, 5)).resolves.toBeUndefined();
    } finally { log.mockRestore(); }
  });
});

describe("webhook: 503 только когда повтор поможет", () => {
  it("временный сбой: клиент не получает ошибку, повтор выполняет шаг один раз", async () => {
    const sim = new Sim(); const log = quiet();
    try {
      await startUz(sim, 1);
      const before = sim.tg.to(1).length;
      vi.spyOn(sim.tg, "sendMessage").mockRejectedValueOnce(new HttpError("timeout", new Error("timeout")));
      expect((await post(sim, textUpdate(100, "/help"))).status).toBe(503);
      expect(sim.tg.to(1).length).toBe(before);
      expect((await post(sim, textUpdate(100, "/help"))).status).toBe(200);
      expect(sim.tg.to(1).length).toBe(before + 1);
      expect(sim.repo.botErrors).toMatchObject([{ outcome: "retry", updateKind: "command" }]);
    } finally { log.mockRestore(); }
  });

  it("вопрос ушёл, но база не записала шаг: повтор не дублирует сообщение", async () => {
    const sim = new Sim(); const log = quiet();
    try {
      await startUz(sim, 1); await sim.click(1, uz.category.nikoh); await sim.click(1, /Анимацияли/); await sim.click(1, uz.catalog.buy);
      const before = sim.tg.to(1).length;
      vi.spyOn(sim.repo, "saveStep").mockRejectedValueOnce(Object.assign(new Error("db"), { code: "CONNECTION_CLOSED" }));
      expect((await post(sim, textUpdate(101, "Азиз"))).status).toBe(503);
      expect(sim.tg.to(1).length).toBe(before + 1);
      expect((await post(sim, textUpdate(101, "Азиз"))).status).toBe(200);
      expect(sim.tg.to(1).length).toBe(before + 1);
      const user = (await sim.user(1))!;
      expect(user.step).toBe("bride");
      expect((user.state as { data: { groom?: string } }).data.groom).toBe("Азиз");
    } finally { log.mockRestore(); }
  });

  it("ошибка в коде: сразу 200, одно сообщение клиенту, анкета на месте", async () => {
    const sim = new Sim(); const log = quiet();
    try {
      await startUz(sim, 1); await sim.click(1, uz.category.nikoh);
      const state = structuredClone((await sim.user(1))!.state);
      vi.spyOn(sim.repo, "saveStep").mockRejectedValueOnce(new TypeError("x is not a function"));
      expect((await post(sim, textUpdate(102, "/new"))).status).toBe(200);
      expect(sim.tg.to(1).filter(m => m.text === uz.error)).toHaveLength(1);
      expect((await sim.user(1))!.state).toEqual(state);
      expect(sim.repo.botErrors).toMatchObject([{ outcome: "ack", errorName: "TypeError" }]);
    } finally { log.mockRestore(); }
  });

  it("постоянно падающий update не держит очередь: не больше 3 попыток, ошибка одна", async () => {
    const sim = new Sim(); const log = quiet();
    try {
      await startUz(sim, 1);
      const asked = sim.tg.to(1).filter(m => m.text === uz.category.ask).length;
      vi.spyOn(sim.repo, "saveStep").mockRejectedValue(new Error("unknown failure"));
      const codes: number[] = [];
      for (let i = 0; i < 3; i++) codes.push((await post(sim, textUpdate(103, "/new"))).status);
      expect(codes).toEqual([503, 503, 200]);
      expect(sim.tg.to(1).filter(m => m.text === uz.error)).toHaveLength(1);
      expect(sim.tg.to(1).filter(m => m.text === uz.category.ask)).toHaveLength(asked + 1);
    } finally { log.mockRestore(); }
  });

  it("клиент заблокировал бота: 200 и без попытки написать ему", async () => {
    const sim = new Sim(); const log = quiet();
    try {
      await startUz(sim, 1);
      const send = vi.spyOn(sim.tg, "sendMessage").mockRejectedValue(apiError(403, "Forbidden: bot was blocked by the user"));
      expect((await post(sim, textUpdate(104, "/help"))).status).toBe(200);
      expect(send).toHaveBeenCalledTimes(1);
    } finally { log.mockRestore(); }
  });

  it("сбой записи журнала не меняет ответ webhook", async () => {
    const sim = new Sim(); const log = quiet();
    try {
      await startUz(sim, 1);
      vi.spyOn(sim.repo, "logBotError").mockRejectedValue(new Error("no table"));
      vi.spyOn(sim.tg, "sendMessage").mockRejectedValueOnce(apiError(500, "Internal"));
      expect((await post(sim, textUpdate(105, "/help"))).status).toBe(503);
      expect((await post(sim, textUpdate(105, "/help"))).status).toBe(200);
    } finally { log.mockRestore(); }
  });
});

describe("устаревшие сообщения и кнопки", () => {
  function api(description: string) {
    const a = new Api("123:TEST");
    a.config.use(async () => ({ ok: false, error_code: 400, description }) as never);
    return createTg(a, "123:TEST");
  }

  it("адаптер: устаревший callback и «not modified» не считаются ошибкой", async () => {
    await expect(api("Bad Request: query is too old and response timeout expired or query ID is invalid").answerCallbackQuery("c", { text: "x" })).resolves.toBeUndefined();
    await expect(api("Bad Request: message is not modified: specified new message content").editMessageText(1, 2, "t")).resolves.toBeUndefined();
    await expect(api("Bad Request: message to edit not found").editMessageReplyMarkup(1, 2, null)).resolves.toBeUndefined();
  });

  it("адаптер: другая ошибка 400 не скрывается", async () => {
    await expect(api("Bad Request: chat not found").answerCallbackQuery("c")).rejects.toBeInstanceOf(GrammyError);
    await expect(api("Bad Request: message to edit not found").editMessageText(1, 2, "t")).rejects.toBeInstanceOf(GrammyError);
  });

  it("«Бошқа вариантлар» на удалённом сообщении: новый экран вместо «хатолик»", async () => {
    const sim = new Sim();
    await nikohToMusic(sim, 1);
    await sim.click(1, uz.back);
    const before = sim.tg.to(1).length;
    vi.spyOn(sim.tg, "editMessageText").mockRejectedValueOnce(apiError(400, "Bad Request: message to edit not found"));
    await sim.click(1, uz.text.more);
    expect(sim.tg.to(1).length).toBe(before + 1);
    expect(sim.tg.to(1).some(m => m.text === uz.error)).toBe(false);
  });
});
