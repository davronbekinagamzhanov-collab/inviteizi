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

let cached: Deps | undefined;

export function createBotDeps(): Deps {
  if (cached) return cached;
  const token = env.telegramBotToken();
  const tg = createTg(new Api(token), token);
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
    async saveMusic(fileId, userId) {
      const url = await tg.getFileUrl(fileId);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Не удалось скачать песню из Telegram: HTTP ${res.status}`);
      const { ext, contentType } = audioFileInfo(url);
      const bytes = new Uint8Array(await res.arrayBuffer());
      const safeId = fileId.replace(/[^A-Za-z0-9_-]/g, "").slice(-48);
      return uploadFile("music", `own/${userId}/${safeId}.${ext}`, bytes, contentType);
    },
  };
  return cached;
}
