import { verifyDemoToken } from "@/lib/demo-tracking";
import { PgRepo } from "@/bot/repo-pg";
import { getDesign } from "@/templates/registry";
export async function POST(request: Request) {
  const denied = () => new Response(null, { status: 400 });
  if (request.headers.get("origin") !== new URL(request.url).origin || /bot|crawler|spider|preview/i.test(request.headers.get("user-agent") ?? "")) return denied();
  if (!request.headers.get("content-type")?.startsWith("application/json")) return denied();
  const reader = request.body?.getReader();
  if (!reader) return denied();
  let text = "";
  const decoder = new TextDecoder();
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 1024) { await reader.cancel(); return denied(); }
      text += decoder.decode(value, { stream: true });
    }
    const body = JSON.parse(text + decoder.decode());
    const event = typeof body.token === "string" ? verifyDemoToken(body.token, new Date()) : null;
    if (!event || !getDesign(event.template)) return denied();
    await new PgRepo().recordEvent(event.userId, "demo_opened", event.template, event.key);
    return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  } catch { return denied(); }
}
