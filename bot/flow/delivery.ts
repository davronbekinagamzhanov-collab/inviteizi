/**
 * Повтор одного update: Telegram присылает его снова после 503. Сообщения, которые уже ушли,
 * второй раз не отправляем. Журнал живёт в памяти процесса (при max_connections 1 повтор обычно
 * приходит в тот же экземпляр), поэтому изменения в базе всё равно защищены своими проверками.
 */
import type { Sent, Tg } from "../tg";
import type { Deps } from "./types";

/** Больше попыток не даём: зависший update держит очередь всего бота (max_connections 1) */
export const MAX_ATTEMPTS = 3;
const MAX_TRACKED = 200;

type Attempts = { attempts: number; sent: Map<string, Sent> };

const ledgers = new WeakMap<object, Map<number, Attempts>>();

export function beginAttempt(deps: Deps, updateId?: number): { tg: Tg; canRetry: boolean; finish(): void } {
  const tg = deps.tg;
  if (updateId === undefined) return { tg, canRetry: false, finish() {} };
  let ledger = ledgers.get(deps);
  if (!ledger) ledgers.set(deps, (ledger = new Map()));
  const known = ledger.get(updateId);
  const entry: Attempts = known ?? { attempts: 0, sent: new Map() };
  if (!known) {
    if (ledger.size >= MAX_TRACKED) ledger.delete(ledger.keys().next().value as number);
    ledger.set(updateId, entry);
  }
  entry.attempts++;

  // Одинаковое сообщение можно отправить дважды за попытку, поэтому ключ учитывает порядковый номер
  const seen = new Map<string, number>();
  async function once<T extends Sent>(content: string, deliver: () => Promise<T>): Promise<T> {
    const n = seen.get(content) ?? 0;
    const key = `${n}:${content}`;
    const done = entry.sent.get(key);
    if (done) {
      seen.set(content, n + 1);
      return done as T;
    }
    const result = await deliver();
    seen.set(content, n + 1);
    entry.sent.set(key, result);
    return result;
  }

  const media = (m: string | Uint8Array) => (typeof m === "string" ? m : "bytes");
  const guarded: Tg = {
    sendMessage: (chat, text, opts) => once(`m:${chat}:${text}`, () => tg.sendMessage(chat, text, opts)),
    sendPhoto: (chat, photo, opts) => once(`p:${chat}:${media(photo)}:${opts?.caption ?? ""}`, () => tg.sendPhoto(chat, photo, opts)),
    sendDocument: (chat, file, opts) => once(`d:${chat}:${file}:${opts?.caption ?? ""}`, () => tg.sendDocument(chat, file, opts)),
    sendAudio: (chat, audio, opts) => once(`a:${chat}:${audio}`, () => tg.sendAudio(chat, audio, opts)),
    editMessageText: (...args) => tg.editMessageText(...args),
    editMessageMedia: (...args) => tg.editMessageMedia(...args),
    editMessageReplyMarkup: (...args) => tg.editMessageReplyMarkup(...args),
    answerCallbackQuery: (...args) => tg.answerCallbackQuery(...args),
    getFileUrl: (...args) => tg.getFileUrl(...args),
    botUsername: () => tg.botUsername(),
  };
  const map = ledger;
  return { tg: guarded, canRetry: entry.attempts < MAX_ATTEMPTS, finish: () => void map.delete(updateId) };
}
