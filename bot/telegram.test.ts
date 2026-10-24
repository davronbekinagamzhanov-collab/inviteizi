import { describe, expect, it } from "vitest";
import { Api, InputFile } from "grammy";
import { createTg } from "./telegram";

type Call = { method: string; payload: Record<string, unknown> };

/** Api без сети: transformer записывает вызовы и отдаёт заготовленный ответ */
function fakeApi(results: Record<string, unknown> = {}, fail?: { method: string; description: string }) {
  const calls: Call[] = [];
  const api = new Api("123:TEST");
  api.config.use(async (_prev, method, payload) => {
    calls.push({ method, payload: payload as Record<string, unknown> });
    if (fail && fail.method === method) return { ok: false, error_code: 400, description: fail.description } as never;
    return { ok: true, result: results[method] ?? { message_id: 77 } } as never;
  });
  return { api, calls };
}

describe("createTg (grammY → Tg)", () => {
  it("sendMessage: inline-кнопки callback / url / copy_text, без parse_mode", async () => {
    const { api, calls } = fakeApi();
    const tg = createTg(api, "123:TEST");
    const sent = await tg.sendMessage(5, "Салом", {
      markup: { inline: [[{ text: "A", data: "a:1:x" }, { text: "U", url: "https://t.me/x" }], [{ text: "C", copy: "+7700" }]] },
      noPreview: true,
    });
    expect(sent).toEqual({ messageId: 77 });
    expect(calls[0].method).toBe("sendMessage");
    expect(calls[0].payload).toMatchObject({
      chat_id: 5,
      text: "Салом",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "A", callback_data: "a:1:x" },
            { text: "U", url: "https://t.me/x" },
          ],
          [{ text: "C", copy_text: { text: "+7700" } }],
        ],
      },
      link_preview_options: { is_disabled: true },
    });
    expect(calls[0].payload.parse_mode).toBeUndefined();
  });

  it("reply-клавиатура с request_location и снятие клавиатуры", async () => {
    const { api, calls } = fakeApi();
    const tg = createTg(api, "123:TEST");
    await tg.sendMessage(5, "Локация", { markup: { reply: [[{ text: "📍", location: true }], [{ text: "⏭" }]] } });
    expect(calls[0].payload.reply_markup).toEqual({
      keyboard: [[{ text: "📍", request_location: true }], [{ text: "⏭" }]],
      resize_keyboard: true,
      is_persistent: true,
    });
    await tg.sendMessage(5, "x", { markup: { removeReply: true } });
    expect(calls[1].payload.reply_markup).toEqual({ remove_keyboard: true });
  });

  it("editMessageMedia — фото и подпись в том же сообщении", async () => {
    const { api, calls } = fakeApi({ editMessageMedia: true });
    const tg = createTg(api, "123:TEST");
    await tg.editMessageMedia(5, 9, "https://x/c.jpg", "№1", { inline: [[{ text: "▶", data: "a:2:next" }]] });
    expect(calls[0]).toMatchObject({
      method: "editMessageMedia",
      payload: {
        chat_id: 5,
        message_id: 9,
        media: { type: "photo", media: "https://x/c.jpg", caption: "№1" },
        reply_markup: { inline_keyboard: [[{ text: "▶", callback_data: "a:2:next" }]] },
      },
    });
  });

  it("editMessageReplyMarkup(null) убирает кнопки; «message is not modified» не ошибка", async () => {
    const { api, calls } = fakeApi({}, { method: "editMessageText", description: "Bad Request: message is not modified" });
    const tg = createTg(api, "123:TEST");
    await tg.editMessageReplyMarkup(5, 9, null);
    expect(calls[0].method).toBe("editMessageReplyMarkup");
    expect(calls[0].payload.reply_markup).toBeUndefined();
    await expect(tg.editMessageText(5, 9, "same")).resolves.toBeUndefined();
  });

  it("другие ошибки Telegram пробрасываются", async () => {
    const { api } = fakeApi({}, { method: "sendMessage", description: "Forbidden: bot was blocked by the user" });
    const tg = createTg(api, "123:TEST");
    await expect(tg.sendMessage(5, "x")).rejects.toThrow(/blocked/);
  });

  it("sendPhoto байтами — InputFile; по url — строкой", async () => {
    const { api, calls } = fakeApi();
    const tg = createTg(api, "123:TEST");
    await tg.sendPhoto(5, new Uint8Array([1, 2, 3]), { caption: "QR" });
    expect(calls[0].payload.photo).toBeInstanceOf(InputFile);
    expect(calls[0].payload.caption).toBe("QR");
    await tg.sendPhoto(5, "FILE_ID");
    expect(calls[1].payload.photo).toBe("FILE_ID");
  });

  it("sendAudio возвращает file_id; getFileUrl собирает адрес файла", async () => {
    const { api } = fakeApi({
      sendAudio: { message_id: 8, audio: { file_id: "AUD1" } },
      getFile: { file_id: "F", file_unique_id: "u", file_path: "music/file_1.mp3" },
    });
    const tg = createTg(api, "123:TEST");
    expect(await tg.sendAudio(5, "https://x/a.mp3", { title: "Ёр-ёр" })).toEqual({ messageId: 8, fileId: "AUD1" });
    expect(await tg.getFileUrl("F")).toBe("https://api.telegram.org/file/bot123:TEST/music/file_1.mp3");
  });

  it("answerCallbackQuery с текстом и alert", async () => {
    const { api, calls } = fakeApi({ answerCallbackQuery: true });
    const tg = createTg(api, "123:TEST");
    await tg.answerCallbackQuery("cb1", { text: "Эскирган", alert: true });
    expect(calls[0].payload).toMatchObject({ callback_query_id: "cb1", text: "Эскирган", show_alert: true });
  });
});
