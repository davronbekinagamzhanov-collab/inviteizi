/** Каждый запрос приложения: initData из заголовка x-tg-init-data, подпись токеном бота. Нет подписи — 401 */
import { env } from "./env";
import { verifyInitData, type AppUser } from "./tg-init-data";

export const INIT_HEADER = "x-tg-init-data";

export function appUserFrom(req: Request, now = new Date()): AppUser | null {
  return verifyInitData(req.headers.get(INIT_HEADER), env.telegramBotToken(), now);
}

export const unauthorized = () => Response.json({ error: "auth" }, { status: 401, headers: { "cache-control": "no-store" } });
export const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });

/** Вход в API приложения: выключено флагом — 404, нет подписи — 401, иначе пользователь */
export function appGate(req: Request): AppUser | Response {
  if (!env.miniAppEnabled()) return json({ error: "off" }, 404);
  return appUserFrom(req) ?? unauthorized();
}
