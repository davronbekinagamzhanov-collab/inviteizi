/** Ответ гостя «Келаман / Келолмайман» со страницы приглашения */
import { PgRepo } from "@/bot/repo-pg";
import { env } from "@/lib/env";
import { pageMode } from "@/lib/orders";
import { handleRsvpRequest } from "@/lib/rsvp";

export async function POST(request: Request) {
  try {
    return await handleRsvpRequest(request, {
      repo: new PgRepo(),
      secret: env.telegramWebhookSecret(),
      isOpen: (o) => pageMode(o, new Date()) === "full",
    });
  } catch (e) {
    console.error("rsvp", e instanceof Error ? e.name : "Error");
    return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
