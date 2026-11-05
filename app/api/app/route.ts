/** API приложения (/app): одно действие на запрос. Пользователь — только из проверенного initData */
import { createBotDeps } from "@/bot/deps";
import { appGate, json } from "@/lib/app-auth";
import * as app from "@/bot/app/service";
import type { Lang } from "@/lib/domain";

export const maxDuration = 30;
const MAX_BODY = 32_000;

export async function POST(req: Request) {
  const user = appGate(req);
  if (user instanceof Response) return user;
  const raw = await req.text();
  if (raw.length > MAX_BODY) return json({ error: "bad" }, 413);
  let body: { action?: string; [k: string]: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: "bad" }, 400);
  }
  const deps = createBotDeps();
  try {
    switch (body.action) {
      case "session":
        return json(await app.openSession(deps, user));
      case "lang":
        return json(await app.setLang(deps, user, body.lang));
      case "favorite":
        return json(await app.toggleFavorite(deps, user, body.templateId, body.saved));
      case "music":
        return json(await app.musicFor(deps, body.templateId, (body.lang === "ru" ? "ru" : "uz") as Lang));
      case "draft":
        return json(await app.saveDraft(deps, user, body.draft as app.AppDraft));
      case "submit":
        return json(await app.submitDraft(deps, user, body.draft as app.AppDraft));
      case "edit":
        return json(await app.editOrder(deps, user, body.orderId));
      case "new":
        return json(await app.newDraft(deps, user));
      case "orders":
        return json(await app.listOrders(deps, user));
      default:
        return json({ error: "bad" }, 400);
    }
  } catch (e) {
    console.error("api/app", body.action, e instanceof Error ? e.name : "Error");
    return json({ error: "server" }, 500);
  }
}
