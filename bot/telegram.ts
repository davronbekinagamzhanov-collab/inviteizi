/**
 * Адаптер grammY: интерфейс Tg поверх bot.api. Текст всегда без parse_mode.
 * Токен нужен только для адреса файла (getFileUrl) — этот адрес нельзя логировать.
 */
import { InputFile, type Api } from "grammy";
import type { InlineKeyboardButton, InlineKeyboardMarkup, ReplyKeyboardMarkup, ReplyKeyboardRemove } from "grammy/types";
import type { InlineButton, Markup, SendOpts, Tg } from "./tg";
import { isEditImpossible, isNotModified, isStaleCallback } from "./errors";

function inlineKb(rows: InlineButton[][]): InlineKeyboardMarkup {
  return {
    inline_keyboard: rows.map((row) =>
      row.map((b): InlineKeyboardButton => {
        if ("url" in b) return { text: b.text, url: b.url };
        if ("webApp" in b) return { text: b.text, web_app: { url: b.webApp } };
        if ("copy" in b) return { text: b.text, copy_text: { text: b.copy } };
        return { text: b.text, callback_data: b.data };
      }),
    ),
  };
}

function markupOf(m?: Markup): InlineKeyboardMarkup | ReplyKeyboardMarkup | ReplyKeyboardRemove | undefined {
  if (!m) return undefined;
  if ("inline" in m) return inlineKb(m.inline);
  if ("reply" in m) {
    return {
      keyboard: m.reply.map((row) => row.map((b) => (b.location ? { text: b.text, request_location: true } : { text: b.text }))),
      resize_keyboard: true,
      is_persistent: true,
      ...(m.oneTime ? { one_time_keyboard: true } : {}),
    };
  }
  return { remove_keyboard: true };
}

function sendExtra(o: SendOpts = {}) {
  const reply_markup = markupOf(o.markup);
  return {
    ...(reply_markup ? { reply_markup } : {}),
    ...(o.noPreview ? { link_preview_options: { is_disabled: true } } : {}),
  };
}

/** Правка, которая ничего не меняет (двойное нажатие ▶), — не ошибка */
async function ignoreNotModified(p: Promise<unknown>) {
  try {
    await p;
  } catch (e) {
    if (isNotModified(e)) return;
    throw e;
  }
}

export function createTg(api: Api, token: string): Tg {
  let username: string | undefined;
  return {
    async botUsername() {
      username ??= (await api.getMe()).username;
      return username;
    },
    async sendMessage(chatId, text, opts) {
      const m = await api.sendMessage(chatId, text, sendExtra(opts));
      return { messageId: m.message_id };
    },
    async editMessageText(chatId, messageId, text, opts = {}) {
      await ignoreNotModified(
        api.editMessageText(chatId, messageId, text, {
          ...(opts.markup ? { reply_markup: inlineKb(opts.markup.inline) } : {}),
          ...(opts.noPreview ? { link_preview_options: { is_disabled: true } } : {}),
        }),
      );
    },
    async editMessageMedia(chatId, messageId, photoUrl, caption, markup) {
      await ignoreNotModified(
        api.editMessageMedia(
          chatId,
          messageId,
          { type: "photo", media: photoUrl, caption },
          markup ? { reply_markup: inlineKb(markup.inline) } : {},
        ),
      );
    },
    async editMessageReplyMarkup(chatId, messageId, markup) {
      try {
        await ignoreNotModified(api.editMessageReplyMarkup(chatId, messageId, markup ? { reply_markup: inlineKb(markup.inline) } : {}));
      } catch (e) {
        // Кнопки на удалённом или старом сообщении убирать незачем
        if (!isEditImpossible(e)) throw e;
      }
    },
    async sendPhoto(chatId, photo, opts = {}) {
      const file = typeof photo === "string" ? photo : new InputFile(photo, opts.fileName ?? "qr.png");
      const m = await api.sendPhoto(chatId, file, { ...sendExtra(opts), ...(opts.caption ? { caption: opts.caption } : {}) });
      return { messageId: m.message_id, fileId: m.photo?.at(-1)?.file_id };
    },
    async sendDocument(chatId, doc, opts = {}) {
      const file = typeof doc === "string" ? doc : new InputFile(doc, opts.fileName ?? "file.pdf");
      const m = await api.sendDocument(chatId, file, { ...sendExtra(opts), ...(opts.caption ? { caption: opts.caption } : {}) });
      return { messageId: m.message_id, fileId: m.document?.file_id };
    },
    async setMenuButton(chatId, button) {
      await api.setChatMenuButton({
        ...(chatId ? { chat_id: chatId } : {}),
        menu_button: button ? { type: "web_app", text: button.text, web_app: { url: button.url } } : { type: "commands" },
      });
    },
    async sendAudio(chatId, audio, opts = {}) {
      const m = await api.sendAudio(chatId, audio, {
        ...(opts.caption ? { caption: opts.caption } : {}),
        ...(opts.title ? { title: opts.title } : {}),
      });
      return { messageId: m.message_id, fileId: m.audio?.file_id ?? null };
    },
    async answerCallbackQuery(callbackId, opts = {}) {
      try {
        await api.answerCallbackQuery(callbackId, {
          ...(opts.text ? { text: opts.text } : {}),
          ...(opts.alert ? { show_alert: true } : {}),
        });
      } catch (e) {
        if (!isStaleCallback(e)) throw e;
      }
    },
    async getFileUrl(fileId) {
      const f = await api.getFile(fileId);
      if (!f.file_path) throw new Error("Telegram не отдал путь к файлу");
      return `https://api.telegram.org/file/bot${token}/${f.file_path}`;
    },
  };
}
