/** Webhook Telegram: POST от Telegram с заголовком X-Telegram-Bot-Api-Secret-Token */
import { createBotDeps } from "@/bot/deps";
import { handleWebhookRequest } from "@/bot/webhook";
import { env } from "@/lib/env";

// Песня клиента (до 20 МБ) копируется в Storage — нужно время
export const maxDuration = 60;

export async function POST(req: Request) {
  if(process.env.VERCEL_ENV==="preview")return Response.json({ok:false},{status:404});
  return handleWebhookRequest(req, { secret: env.telegramWebhookSecret(), getDeps: createBotDeps });
}
