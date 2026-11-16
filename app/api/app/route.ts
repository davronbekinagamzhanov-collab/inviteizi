/** API приложения (/app): одно действие на запрос. Пользователь — только из проверенного initData */
import { createBotDeps } from "@/bot/deps";
import { appGate, json } from "@/lib/app-auth";
import { allow, LIMITS } from "@/lib/rate-limit";
import { appAction } from "@/bot/app/dispatch";

export const maxDuration = 30;
const MAX_BODY = 32_000;

export async function POST(req: Request) {
  // Preview must never write through inherited live credentials. Native fixture tests cover mutations.
  if (process.env.VERCEL_ENV === "preview") return new Response(null, { status: 404 });
  const user = appGate(req);
  if (user instanceof Response) return user;
  if (!allow(`api:${user.id}`, LIMITS.api)) return json({ error: "tooOften" }, 429);
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
    const r = await appAction(deps, user, body);
    return json(r.body, r.status);
  } catch (e) {
    console.error("api/app", body.action, e instanceof Error ? e.name : "Error");
    return json({ error: "server" }, 500);
  }
}
