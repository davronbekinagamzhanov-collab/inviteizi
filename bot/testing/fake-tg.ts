/** Tg для тестов: записывает исходящие сообщения и правки. Никакой сети. */
import type { InlineButton, Markup, SendOpts, Sent, Tg } from "../tg";

export type FakeMessage = {
  id: number;
  chatId: number;
  type: "text" | "photo" | "document" | "audio";
  text: string; // текст или подпись
  markup?: Markup;
  /** url / file_id / байты */
  media?: string | Uint8Array;
  edits: number;
};

export type CallbackAnswer = { callbackId: string; text?: string; alert?: boolean };

export class FakeTg implements Tg {
  messages: FakeMessage[] = [];
  answers: CallbackAnswer[] = [];
  private nextId = 1000;
  private nextFile = 1;
  /** Сколько раз дёргали методы (для проверок «не отправил повторно» и т.п.) */
  calls: { method: string; chatId?: number }[] = [];

  async sendMessage(chatId: number, text: string, opts: SendOpts = {}): Promise<Sent> {
    return this.push({ chatId, type: "text", text, markup: opts.markup });
  }

  async editMessageText(chatId: number, messageId: number, text: string, opts: { markup?: { inline: InlineButton[][] } } = {}) {
    this.calls.push({ method: "editMessageText", chatId });
    const m = this.find(chatId, messageId);
    m.text = text;
    m.markup = opts.markup;
    m.edits++;
  }

  async editMessageMedia(chatId: number, messageId: number, photoUrl: string, caption: string, markup?: { inline: InlineButton[][] }) {
    this.calls.push({ method: "editMessageMedia", chatId });
    const m = this.find(chatId, messageId);
    if (m.type !== "photo") throw new Error("editMessageMedia: сообщение не фото");
    m.media = photoUrl;
    m.text = caption;
    m.markup = markup;
    m.edits++;
  }

  async editMessageReplyMarkup(chatId: number, messageId: number, markup: { inline: InlineButton[][] } | null) {
    this.calls.push({ method: "editMessageReplyMarkup", chatId });
    const m = this.find(chatId, messageId);
    m.markup = markup ?? undefined;
    m.edits++;
  }

  async sendPhoto(chatId: number, photo: string | Uint8Array, opts: SendOpts & { caption?: string } = {}) {
    return this.push({ chatId, type: "photo", text: opts.caption ?? "", markup: opts.markup, media: photo });
  }

  async sendDocument(chatId: number, fileId: string, opts: SendOpts & { caption?: string } = {}) {
    return this.push({ chatId, type: "document", text: opts.caption ?? "", markup: opts.markup, media: fileId });
  }

  async sendAudio(chatId: number, audio: string, opts: { caption?: string } = {}) {
    const sent = this.push({ chatId, type: "audio", text: opts.caption ?? "", media: audio });
    const fileId = audio.startsWith("http") ? `TGAUDIO_${this.nextFile++}` : audio;
    return { ...sent, fileId };
  }

  async answerCallbackQuery(callbackId: string, opts: { text?: string; alert?: boolean } = {}) {
    this.calls.push({ method: "answerCallbackQuery" });
    this.answers.push({ callbackId, ...opts });
  }

  async getFileUrl(fileId: string) {
    return `https://api.telegram.org/file/botTEST/${fileId}`;
  }

  // ── Для проверок ──
  to(chatId: number) {
    return this.messages.filter((m) => m.chatId === chatId);
  }

  last(chatId: number) {
    const list = this.to(chatId);
    return list[list.length - 1];
  }

  private push(m: Omit<FakeMessage, "id" | "edits">): Sent {
    const id = this.nextId++;
    this.calls.push({ method: `send:${m.type}`, chatId: m.chatId });
    this.messages.push({ ...m, id, edits: 0 });
    return { messageId: id };
  }

  private find(chatId: number, messageId: number) {
    const m = this.messages.find((x) => x.chatId === chatId && x.id === messageId);
    if (!m) throw new Error(`Нет сообщения ${messageId} в чате ${chatId}`);
    return m;
  }
}

/** Все inline-кнопки сообщения одним списком */
export function inlineButtons(m: FakeMessage | undefined): InlineButton[] {
  if (!m?.markup || !("inline" in m.markup)) return [];
  return m.markup.inline.flat();
}

/** Подписи кнопок (inline или reply) */
export function buttonLabels(m: FakeMessage | undefined): string[] {
  if (!m?.markup) return [];
  if ("inline" in m.markup) return m.markup.inline.flat().map((b) => b.text);
  if ("reply" in m.markup) return m.markup.reply.flat().map((b) => b.text);
  return [];
}
