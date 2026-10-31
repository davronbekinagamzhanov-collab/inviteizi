/**
 * Ошибки бота: что повторять, что нет, и безопасная запись причин в bot_errors.
 * В базу и журнал не попадают токены, адреса файлов, телефоны, Telegram ID и имена клиентов.
 */
import type { Deps } from "./flow/types";
import type { BotUpdate } from "./update";

export type BotErrorEntry = {
  step: string | null;
  updateKind: string;
  errorName: string;
  errorCode: string | null;
  message: string;
  stack: string | null;
  /** retry — вернули 503, Telegram повторит; ack — вернули 200, повтора не будет */
  outcome: "retry" | "ack";
};

type Described = { error_code?: unknown; description?: unknown; code?: unknown; name?: unknown; message?: unknown };

const described = (e: unknown): Described => (e && typeof e === "object" ? (e as Described) : {});
const apiCode = (e: unknown) => (typeof described(e).error_code === "number" ? (described(e).error_code as number) : null);
const apiText = (e: unknown) => (typeof described(e).description === "string" ? (described(e).description as string) : "");

const NETWORK_CODES = new Set(["ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "ENOTFOUND", "EAI_AGAIN", "EPIPE", "CONNECTION_CLOSED", "CONNECTION_ENDED", "CONNECTION_DESTROYED", "CONNECT_TIMEOUT"]);
/** SQLSTATE: соединение, конфликт транзакций, нехватка ресурсов, остановка сервера */
const PG_TRANSIENT = /^(08|40|53|57|58)/;
const PG_STATE = /^[0-9A-Z]{5}$/;

/**
 * transient — повтор может помочь и действие не завершено; permanent — повтор даст ту же ошибку.
 * Неизвестная ошибка считается временной: число повторов ограничено в flow/delivery.ts.
 */
export function classifyError(e: unknown): "transient" | "permanent" {
  const api = apiCode(e);
  if (api !== null) return api === 429 || api >= 500 ? "transient" : "permanent";
  const { code, name, message } = described(e);
  if (typeof code === "string") {
    if (NETWORK_CODES.has(code) || PG_TRANSIENT.test(code)) return "transient";
    if (PG_STATE.test(code)) return "permanent";
  }
  if (name === "HttpError" || name === "AbortError" || name === "TimeoutError") return "transient";
  if (name === "TypeError" && /fetch failed|network/i.test(String(message ?? ""))) return "transient";
  if (e instanceof TypeError || e instanceof ReferenceError || e instanceof RangeError || e instanceof SyntaxError) return "permanent";
  return "transient";
}

/** Сообщения для правки больше нет или его нельзя править: показываем новым сообщением */
export const isEditImpossible = (e: unknown) =>
  apiCode(e) === 400 && /message to edit not found|message can't be edited|no text in the message to edit|no media in the message to edit|message_id_invalid/i.test(apiText(e));

export const isNotModified = (e: unknown) => apiCode(e) === 400 && /message is not modified/i.test(apiText(e));

/** Кнопку нажали давно: отвечать на неё уже нельзя, и это не ошибка */
export const isStaleCallback = (e: unknown) => apiCode(e) === 400 && /query is too old|query id is invalid/i.test(apiText(e));

/** Клиент заблокировал бота или чат недоступен: сообщение об ошибке отправлять некому */
export const isUnreachable = (e: unknown) => apiCode(e) === 403 || (apiCode(e) === 400 && /chat not found/i.test(apiText(e)));

/** Telegram отдаёт файлы только до 20 МБ */
export const isFileTooBig = (e: unknown) => apiCode(e) === 400 && /file is too big/i.test(apiText(e));

export function redact(text: string, known: (string | null | undefined)[] = []) {
  let out = text;
  for (const value of known) if (value && value.trim().length > 1) out = out.split(value).join("[client]");
  return out
    .replace(/https?:\/\/\S+/gi, "[url]")
    .replace(/postgres(ql)?:\/\/\S+/gi, "[db-url]")
    .replace(/\bbot\d+:[\w-]+/gi, "[token]")
    .replace(/\b\d{5,}:[\w-]{20,}\b/g, "[token]")
    .replace(/\b(eyJ[\w-]{10,}(\.[\w-]+)*|[a-f0-9]{32,})\b/gi, "[secret]")
    .replace(/\+?\d[\d\s()-]{7,}\d/g, "[number]")
    .replace(/\d{5,}/g, "[number]");
}

/** То, что клиент прислал сам: может оказаться в тексте ошибки */
function clientValues(u: BotUpdate) {
  return [u.from.firstName, u.from.username, u.kind === "text" ? u.text : null, u.kind === "command" ? u.args : null];
}

export function toEntry(e: unknown, u: BotUpdate, step: string | null, outcome: BotErrorEntry["outcome"]): BotErrorEntry {
  const known = clientValues(u);
  const { code, name, message } = described(e);
  const stack = e instanceof Error && e.stack ? e.stack.split("\n").filter((l) => /^\s+at /.test(l)).slice(0, 12).join("\n") : "";
  const api = apiCode(e);
  return {
    step,
    updateKind: u.kind,
    errorName: redact(typeof name === "string" ? name : "Error", known).slice(0, 80),
    errorCode: api !== null ? String(api) : typeof code === "string" || typeof code === "number" ? redact(String(code), known).slice(0, 40) : null,
    message: redact(apiText(e) || (typeof message === "string" ? message : String(e)), known).slice(0, 500),
    stack: stack ? redact(stack, known).slice(0, 2000) : null,
    outcome,
  };
}

/** Журнал ошибок не должен мешать клиенту: не бросает исключений и не ждёт дольше 1,5 с */
export async function recordBotError(deps: Pick<Deps, "repo">, entry: BotErrorEntry, timeoutMs = 1500) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      deps.repo.logBotError(entry),
      new Promise<void>((resolve) => { timer = setTimeout(resolve, timeoutMs); }),
    ]);
  } catch (e) {
    // Например, миграция bot_errors ещё не применена
    console.error("bot_errors not saved", e instanceof Error ? e.name : "Error");
  } finally {
    clearTimeout(timer);
  }
}
