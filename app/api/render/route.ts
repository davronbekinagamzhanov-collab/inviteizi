/** Видео «Сақлаб олиш»: ответ runner'а GitHub Actions (bot/render-callback.ts) */
import { createBotDeps } from "@/bot/deps";
import { handleRenderCallback } from "@/bot/render-callback";
import { env } from "@/lib/env";

export const maxDuration = 60;

export async function POST(req: Request) {
  return handleRenderCallback(req, env.renderCallbackSecret(), createBotDeps);
}
