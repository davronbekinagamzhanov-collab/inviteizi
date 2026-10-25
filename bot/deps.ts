/**
 * Настоящие зависимости бота для продакшна: Telegram (grammY Api), Postgres (repo-pg), env, Storage.
 * Один набор на процесс (serverless-функция живёт между запросами).
 */
import { Api } from "grammy";
import type { Deps } from "./flow/types";
import { createTg } from "./telegram";
import { createPgRepo } from "./repo-pg";
import { audioFileInfo } from "./audio-type";
import { env } from "@/lib/env";
import { uploadFile } from "@/lib/storage";
import { createHmac } from "node:crypto";

let cached: Deps | undefined;

export function createBotDeps(): Deps {
  if (cached) return cached;
  const token = env.telegramBotToken();
  const tg = createTg(new Api(token, {timeoutSeconds:20}), token);
  cached = {
    repo: createPgRepo(),
    tg,
    env: {
      ownerUsername: env.ownerUsername(),
      kaspiPhone: env.kaspiPhone(),
      kaspiName: env.kaspiName(),
      publicBaseUrl: env.publicBaseUrl(),
    },
    now: () => new Date(),
    /** Песня клиента: файл из Telegram → бакет music (адрес файла Telegram содержит токен — не логируем) */
    async saveMusic(fileId) {
      const url = await tg.getFileUrl(fileId);
      const res = await fetch(url,{signal:AbortSignal.timeout(20_000)});
      if (!res.ok) throw new Error(`Не удалось скачать песню из Telegram: HTTP ${res.status}`);
      const { ext, contentType } = audioFileInfo(url);
      const bytes = new Uint8Array(await res.arrayBuffer());
      // Opaque and stable on retries: no user ID/file ID in the public path, no orphan per retry.
      const objectId = createHmac("sha256",token).update("inviteizi:own-music:v1\0").update(fileId).digest("hex");
      return uploadFile("music", `own/${objectId}.${ext}`, bytes, contentType);
    },
  };
  return cached;
}
