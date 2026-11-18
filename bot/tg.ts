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

export type ReplyButton = { text: string; location?: boolean; contact?: boolean };

export type Markup =
  | { inline: InlineButton[][] }
  | { reply: ReplyButton[][]; oneTime?: boolean }
  | { removeReply: true };

export type SendOpts = { markup?: Markup; noPreview?: boolean };

export type Sent = { messageId: number };
/** Отправленный файл: file_id нужен, чтобы переслать его позже без повторной загрузки (чек из приложения) */
export type SentFile = Sent & { fileId?: string };
/** Байты файла из приложения: имя нужно Telegram, чтобы показать документ */
export type FileOpts = SendOpts & { caption?: string; fileName?: string };

export interface Tg {
  sendMessage(chatId: number, text: string, opts?: SendOpts): Promise<Sent>;
  editMessageText(chatId: number, messageId: number, text: string, opts?: { markup?: { inline: InlineButton[][] }; noPreview?: boolean }): Promise<void>;
  /** Заменить фото и подпись в том же сообщении (листание каталога) */
  editMessageMedia(chatId: number, messageId: number, photoUrl: string, caption: string, markup?: { inline: InlineButton[][] }): Promise<void>;
  /** Поменять/убрать inline-кнопки у сообщения */
  editMessageReplyMarkup(chatId: number, messageId: number, markup: { inline: InlineButton[][] } | null): Promise<void>;
  /** photo — url, file_id или байты картинки (QR-код, чек из приложения) */
  sendPhoto(chatId: number, photo: string | Uint8Array, opts?: FileOpts): Promise<SentFile>;
  /** doc — file_id или байты (чек PDF из приложения, выгрузка xlsx) */
  sendDocument(chatId: number, doc: string | Uint8Array, opts?: FileOpts): Promise<SentFile>;
  /** Видео (MP4 по адресу или file_id): «Сақлаб олиш» → «🎬 Видео» */
  sendVideo(chatId: number, video: string, opts?: FileOpts & { width?: number; height?: number }): Promise<SentFile>;
  /** Альбом из 2–10 фото (каталог в чате: 3 обложки сразу). Возвращает id всех сообщений альбома */
  sendMediaGroup(chatId: number, photos: { url: string; caption?: string }[]): Promise<Sent & { messageIds: number[] }>;
  /** Удалить своё сообщение (старый альбом каталога, старое меню). Уже удалённое — не ошибка */
  deleteMessage(chatId: number, messageId: number): Promise<void>;
  /** Кнопка меню Telegram у поля ввода: открыть приложение (null — обычное меню команд) */
  setMenuButton(chatId: number | undefined, button: { text: string; url: string } | null): Promise<void>;
  /** audio — url или file_id; возвращает file_id отправленного файла */
  sendAudio(chatId: number, audio: string, opts?: { caption?: string; title?: string }): Promise<Sent & { fileId: string | null }>;
  answerCallbackQuery(callbackId: string, opts?: { text?: string; alert?: boolean }): Promise<void>;
  /** Временная ссылка на файл Telegram (для копирования песни клиента в Storage) */
  getFileUrl(fileId: string): Promise<string>;
  /** Имя бота без @ (для ссылок t.me) */
  botUsername(): Promise<string>;
}
