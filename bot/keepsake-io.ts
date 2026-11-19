/**
 * Боевые зависимости «Сақлаб олиш» (bot/keepsake.ts): построение файлов, Vercel Blob, запуск рендера видео
 * в GitHub Actions. Видео включается только когда есть оба секрета (GITHUB_DISPATCH_TOKEN, RENDER_CALLBACK_SECRET)
 * и хранилище Blob — иначе кнопки «🎬 Видео» нет, фото и PDF работают.
 */
import { createHmac } from "node:crypto";
import { env } from "@/lib/env";
import { storageConfigured, uploadFile } from "@/lib/storage";
import { defaultHealthIo } from "./health";
import type { KeepsakeIo, VideoJob } from "./keepsake";
import type { OrderRecord } from "@/lib/domain";
import { textsFor } from "@/texts/uz-cyrl";
import { demoMusicUrl } from "@/lib/music";

const TYPES = { story: "image/png", feed: "image/png", a5: "application/pdf", a6: "application/pdf", video: "video/mp4" };
const EXT = { story: "png", feed: "png", a5: "pdf", a6: "pdf", video: "mp4" };

/** Папка файлов заказа в Blob: 32 hex без данных клиента (стабильна для заказа, не угадывается) */
export function keepsakeFolder(orderId: string, secret: string) {
  return createHmac("sha256", secret).update("inviteizi:keepsake:v1\0").update(orderId).digest("hex").slice(0, 32);
}

/**
 * Запуск workflow «render-video» (workflow_dispatch): токену достаточно права «Actions: write» на этот репозиторий
 * (repository_dispatch требовал бы «Contents: write»). Данные заказа — одним входом job (JSON).
 */
export async function dispatchVideoJob(job: VideoJob, token: string, repo: string, fetchImpl: typeof fetch = fetch) {
  const res = await fetchImpl(`https://api.github.com/repos/${repo}/actions/workflows/render-video.yml/dispatches`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      "content-type": "application/json",
    },
    body: JSON.stringify({ ref: "main", inputs: { job: JSON.stringify(job) } }),
    signal: AbortSignal.timeout(10_000),
  });
  if (res.status !== 204) throw new Error(`GitHub dispatch ${res.status}`);
}

export function keepsakeIo(publicBaseUrl: string): KeepsakeIo {
  const secret = env.renderCallbackSecret();
  const token = env.renderDispatchToken();
  const folderSecret = secret ?? process.env.TELEGRAM_BOT_TOKEN ?? "inviteizi";
  const io: KeepsakeIo = {
    async render(order, url, kind) {
      const k = await import("@/lib/keepsake/render");
      return kind === "a5" || kind === "a6" ? k.keepsakePdf(order, url, kind) : k.keepsakePng(order, url, kind);
    },
    ownerIds: () => defaultHealthIo().recipients(),
  };
  if (storageConfigured())
    io.store = (order, kind, bytes) =>
      uploadFile("keepsake", `${keepsakeFolder(order.id, folderSecret)}/${order.slug}-${kind}.${EXT[kind]}`, bytes, TYPES[kind]);
  if (secret && token && storageConfigured()) {
    io.videoJob = async (order: OrderRecord) => {
      const { getInvitationBySlug } = await import("@/lib/orders");
      const { lookOf } = await import("@/lib/keepsake/render");
      const page = await getInvitationBySlug(order.slug);
      const rel = page?.data.musicUrl ?? demoMusicUrl(order.occasion) ?? null;
      const lang = order.data.mainLang ?? "uz";
      const look = lookOf(order.templateId);
      const link = `${publicBaseUrl}/${order.slug}`;
      return {
        orderId: order.id,
        slug: order.slug,
        url: `${link}?render=video`,
        musicUrl: rel ? new URL(rel, publicBaseUrl).href : null,
        cta: textsFor(lang).statusPoster.videoCta,
        link: link.replace(/^https?:\/\//, ""),
        paper: look.paper,
        ink: look.ink,
        callback: `${publicBaseUrl}/api/cron?t=render`,
      };
    };
    io.dispatchVideo = (job) => dispatchVideoJob(job, token, env.renderRepo());
  }
  return io;
}
