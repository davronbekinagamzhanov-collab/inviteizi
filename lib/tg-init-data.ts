/**
 * Проверка initData Telegram Mini App (core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app).
 * secret = HMAC_SHA256(key="WebAppData", bot_token); hash = HMAC_SHA256(secret, data_check_string).
 * Каждый запрос приложения проверяется здесь: без верной подписи сервер ничего не делает.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export type AppUser = { id: number; firstName: string | null; username: string | null; languageCode: string | null };

/** initData старше суток не принимаем: ссылку с ним нельзя переслать и использовать потом */
export const INIT_DATA_MAX_AGE_SEC = 24 * 60 * 60;
const MAX_LEN = 4096;

export function signInitData(fields: Record<string, string>, botToken: string): string {
  const check = Object.keys(fields)
    .filter((k) => k !== "hash")
    .sort()
    .map((k) => `${k}=${fields[k]}`)
    .join("\n");
  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  const hash = createHmac("sha256", secret).update(check).digest("hex");
  return new URLSearchParams({ ...fields, hash }).toString();
}

export function verifyInitData(raw: unknown, botToken: string, now: Date, maxAgeSec = INIT_DATA_MAX_AGE_SEC): AppUser | null {
  if (typeof raw !== "string" || !raw || raw.length > MAX_LEN) return null;
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(raw);
  } catch {
    return null;
  }
  const hash = params.get("hash");
  if (!hash || !/^[0-9a-f]{64}$/.test(hash)) return null;
  const fields: Record<string, string> = {};
  for (const [k, v] of params) if (k !== "hash") fields[k] = v;
  const expected = new URLSearchParams(signInitData(fields, botToken)).get("hash")!;
  if (!timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(expected, "hex"))) return null;

  const authDate = Number(fields.auth_date);
  const age = now.getTime() / 1000 - authDate;
  if (!Number.isFinite(authDate) || age > maxAgeSec || age < -300) return null;

  try {
    const u = JSON.parse(fields.user ?? "null") as { id?: unknown; first_name?: unknown; username?: unknown; language_code?: unknown } | null;
    if (!u || typeof u.id !== "number" || !Number.isSafeInteger(u.id) || u.id <= 0) return null;
    const str = (v: unknown) => (typeof v === "string" && v ? v.slice(0, 64) : null);
    return { id: u.id, firstName: str(u.first_name), username: str(u.username), languageCode: str(u.language_code) };
  } catch {
    return null;
  }
}
