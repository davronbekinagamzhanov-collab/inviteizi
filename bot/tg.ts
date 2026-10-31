/**
 * Всё, что логика бота делает в Telegram. Реализации:
 *  - bot/telegram.ts — настоящий Telegram через grammY (bot.api);
 *  - bot/testing/fake-tg.ts — записывает вызовы для тестов.
 * Текст всегда простой (без parse_mode): имена клиентов могут содержать любые символы.
 */

export type InlineButton =
  | { text: string; data: string }
  | { text: string; url: string }
  /** Кнопка «скопировать текст» (copy_text, Bot API 7.11) */
  | { text: string; copy: string }
  /** Открыть страницу окном внутри Telegram (только личные чаты, только https) */
  | { text: string; webApp: string };

export type ReplyButton = { text: string; location?: boolean };

export type Markup =
  | { inline: InlineButton[][] }
  | { reply: ReplyButton[][]; oneTime?: boolean }
  | { removeReply: true };

export type SendOpts = { markup?: Markup; noPreview?: boolean };

export type Sent = { messageId: number };

export interface Tg {
  sendMessage(chatId: number, text: string, opts?: SendOpts): Promise<Sent>;
  editMessageText(chatId: number, messageId: number, text: string, opts?: { markup?: { inline: InlineButton[][] }; noPreview?: boolean }): Promise<void>;
  /** Заменить фото и подпись в том же сообщении (листание каталога) */
  editMessageMedia(chatId: number, messageId: number, photoUrl: string, caption: string, markup?: { inline: InlineButton[][] }): Promise<void>;
  /** Поменять/убрать inline-кнопки у сообщения */
  editMessageReplyMarkup(chatId: number, messageId: number, markup: { inline: InlineButton[][] } | null): Promise<void>;
  /** photo — url, file_id или байты картинки (QR-код) */
  sendPhoto(chatId: number, photo: string | Uint8Array, opts?: SendOpts & { caption?: string }): Promise<Sent>;
  sendDocument(chatId: number, fileId: string, opts?: SendOpts & { caption?: string }): Promise<Sent>;
  /** audio — url или file_id; возвращает file_id отправленного файла */
  sendAudio(chatId: number, audio: string, opts?: { caption?: string; title?: string }): Promise<Sent & { fileId: string | null }>;
  answerCallbackQuery(callbackId: string, opts?: { text?: string; alert?: boolean }): Promise<void>;
  /** Временная ссылка на файл Telegram (для копирования песни клиента в Storage) */
  getFileUrl(fileId: string): Promise<string>;
  /** Имя бота без @ (для ссылок t.me) */
  botUsername(): Promise<string>;
}
