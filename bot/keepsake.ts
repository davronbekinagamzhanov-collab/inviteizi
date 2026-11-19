/**
 * «📥 Сақлаб олиш» (19.11.2026): после оплаты клиент получает не только ссылку, но и готовые файлы
 * своего приглашения — фото для статуса и ленты, PDF для печати (A5/A6), видео (только «Анимацияли»).
 * Одно ядро для бота и Mini App (deliverKeepsake). Файлы строит lib/keepsake/render.tsx (через deps.keepsake),
 * видео — GitHub Actions (scripts/render-video.mjs) по repository_dispatch, ответ — /api/cron?t=render.
 */
import type { Deps } from "./flow/types";
import type { Lang, OrderRecord } from "@/lib/domain";
import type { InlineButton } from "./tg";
import type { RenderKind, RenderRecord } from "./repo";
import { txFor } from "./flow/util";
import { recordBotError } from "./errors";
import { staff } from "@/texts/bot-ru";

export type FileKind = "story" | "feed" | "a5" | "a6";
export const FILE_KINDS: readonly FileKind[] = ["story", "feed", "a5", "a6"];
export const KEEPSAKE_KINDS: readonly RenderKind[] = [...FILE_KINDS, "video"];
export const isKeepsakeKind = (k: unknown): k is RenderKind => typeof k === "string" && (KEEPSAKE_KINDS as string[]).includes(k);

/** Задание видео для рендера вне Vercel */
export type VideoJob = {
  orderId: string;
  slug: string;
  /** Адрес приглашения, который записывается (…/<slug>?render=video) */
  url: string;
  /** Музыка заказа (или демо-мелодия тадбира), полный адрес */
  musicUrl: string | null;
  /** Последний кадр: «Таклифномани очинг» и ссылка — на языке приглашения */
  cta: string;
  link: string;
  /** Цвета дизайна для последнего кадра */
  paper: string;
  ink: string;
  /** Куда runner сообщает результат */
  callback: string;
};

export type KeepsakeIo = {
  /** PNG (story, feed) или PDF (a5, a6) приглашения */
  render(order: OrderRecord, url: string, kind: FileKind): Promise<Uint8Array>;
  /** Сохранить файл в Vercel Blob (нет токена — нет функции): адрес файла */
  store?(order: OrderRecord, kind: RenderKind, bytes: Uint8Array): Promise<string>;
  /** Отдать видео в рендер (GitHub Actions). Нет секретов — нет функции, и кнопки «🎬 Видео» нет */
  dispatchVideo?(job: VideoJob): Promise<void>;
  /** Данные для задания видео (музыка, цвета, подписи) — сервер знает, runner нет */
  videoJob?(order: OrderRecord): Promise<VideoJob>;
  /** Кому писать о неудаче видео: OWNER_TELEGRAM_ID, иначе ADMIN_IDS */
  ownerIds(): number[];
};

export const videoAvailable = (deps: Deps, o: Pick<OrderRecord, "format">) =>
  o.format === "animated" && Boolean(deps.keepsake?.dispatchVideo && deps.keepsake.videoJob);

const pageUrl = (deps: Deps, o: OrderRecord) => `${deps.env.publicBaseUrl}/${o.slug}`;

/** Сообщение «📥 Сақлаб олиш» с кнопками (бот) */
export function keepsakeOffer(deps: Deps, o: OrderRecord, lang: Lang) {
  const k = txFor(lang).keepsake;
  const b = (kind: RenderKind): InlineButton => ({ text: k[kind], data: `ks:${o.number}:${kind}` });
  const video = videoAvailable(deps, o);
  const rows: InlineButton[][] = [
    [b("story"), b("feed")],
    [b("a5"), b("a6")],
    ...(video ? [[b("video")]] : []),
  ];
  return { text: [k.offer, ...(video ? [k.offerVideo] : []), "", k.pick].join("\n"), markup: { inline: rows } };
}

/** После ссылки — второе сообщение с кнопками файлов. Не ушло — ссылка важнее, ошибку не поднимаем */
export async function sendKeepsakeOffer(deps: Deps, o: OrderRecord, lang: Lang) {
  if (!deps.keepsake || o.status !== "active") return;
  try {
    const m = keepsakeOffer(deps, o, lang);
    await deps.tg.sendMessage(o.userId, m.text, { markup: m.markup });
  } catch (e) {
    console.error("keepsake offer", e instanceof Error ? e.name : "Error");
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Заказ по id (Mini App) или номеру (бот); мусор в запросе — «не найден», а не ошибка базы */
export async function findOrder(deps: Deps, ref: { id?: string; number?: number }) {
  if (ref.id !== undefined) return UUID.test(ref.id) ? deps.repo.getOrder(ref.id).catch(() => null) : null;
  if (ref.number !== undefined && Number.isSafeInteger(ref.number) && ref.number > 0)
    return deps.repo.getOrderByNumber(ref.number).catch(() => null);
  return null;
}

/** Видео в очереди дольше этого без ответа runner'а — можно заказать заново */
export const VIDEO_STUCK_MS = 20 * 60_000;

/** Двойное нажатие: один и тот же файл одного заказа не строим дважды одновременно */
const busy = new Set<string>();

export type KeepsakeOutcome = "sent" | "queued" | "already" | "busy" | "failed" | "notActive" | "unavailable" | "notFound";

const caption = (lang: Lang, kind: FileKind) => {
  const k = txFor(lang).keepsake;
  return kind === "story" ? k.storyCaption : kind === "feed" ? k.feedCaption : k.printCaption(kind.toUpperCase());
};
const fileName = (o: OrderRecord, kind: FileKind) =>
  `${o.slug}-${{ story: "status", feed: "post", a5: "A5", a6: "A6" }[kind]}.${kind === "a5" || kind === "a6" ? "pdf" : "png"}`;

async function safeRender<T>(f: () => Promise<T>): Promise<T | null> {
  try {
    return await f();
  } catch {
    // таблицы order_renders ещё нет (миграция не применена) — файлы работают без кэша
    return null;
  }
}

/** Отправить файл в чат клиента: из кэша Telegram или построить заново */
async function sendFile(deps: Deps, o: OrderRecord, to: number, kind: FileKind, lang: Lang) {
  const cached = await safeRender(() => deps.repo.getRender(o.id, kind));
  const opts = { caption: caption(lang, kind), fileName: fileName(o, kind) };
  // Картинка — фото (сохраняется в галерею одним касанием, Telegram держит до 2560 px); PDF — документ
  const send = (file: string | Uint8Array) =>
    kind === "story" || kind === "feed" ? deps.tg.sendPhoto(to, file, opts) : deps.tg.sendDocument(to, file, opts);
  if (cached?.status === "done" && cached.telegramFileId) {
    try {
      await send(cached.telegramFileId);
      return;
    } catch {
      /* file_id устарел — строим заново */
    }
  }
  const bytes = await deps.keepsake!.render(o, pageUrl(deps, o), kind);
  const sent = await send(bytes);
  let url: string | null = cached?.url ?? null;
  if (!url && deps.keepsake!.store) url = await deps.keepsake!.store(o, kind, bytes).catch(() => null);
  await safeRender(() =>
    deps.repo.saveRender(o.id, kind, { status: "done", url, telegramFileId: sent.fileId ?? null, error: null }),
  );
}

/**
 * Главное действие «Сақлаб олиш»: заказ должен быть оплачен (active) и принадлежать пользователю (или админу).
 * Фото/PDF — сразу в чат; видео — в очередь (повторное нажатие очередь не дублирует).
 */
export async function deliverKeepsake(
  deps: Deps,
  userId: number,
  orderRef: { id?: string; number?: number },
  kind: RenderKind,
): Promise<KeepsakeOutcome> {
  if (!deps.keepsake || !isKeepsakeKind(kind)) return "unavailable";
  const o = await findOrder(deps, orderRef);
  if (!o || (o.userId !== userId && !(await deps.repo.isAdmin(userId)))) return "notFound";
  if (o.status !== "active") return "notActive";
  // язык подписей — того, кто получает файл (админ, помогающий клиенту, — на своём)
  const lang = (await deps.repo.getUser(userId))?.lang ?? "uz";
  const to = userId;

  if (kind === "video") {
    if (!videoAvailable(deps, o)) return "unavailable";
    const claim = await safeRender(() => deps.repo.claimRender(o.id, "video"));
    if (!claim) return "unavailable";
    if (!claim.fresh) {
      const r = claim.record;
      if (r.status === "done" && (r.telegramFileId || r.url)) {
        await deps.tg.sendVideo(to, r.telegramFileId ?? r.url!, { caption: txFor(lang).keepsake.videoCaption });
        return "sent";
      }
      // runner пропал без ответа (упал до первого сообщения) — клиент может заказать снова
      if (+deps.now() - +r.updatedAt < VIDEO_STUCK_MS) return "already";
      return (await dispatch(deps, o, { ...r, attempts: 0 })) ? "queued" : "failed";
    }
    return (await dispatch(deps, o, claim.record)) ? "queued" : "failed";
  }

  const key = `${o.id}:${kind}`;
  if (busy.has(key)) return "busy";
  busy.add(key);
  try {
    await sendFile(deps, o, to, kind, lang);
    return "sent";
  } catch (e) {
    await recordBotError(deps, {
      step: "keepsake",
      updateKind: kind,
      errorName: e instanceof Error ? e.name : "Error",
      errorCode: null,
      message: `№${o.number} ${kind}: ${e instanceof Error ? e.message : "Error"}`.slice(0, 300),
      stack: e instanceof Error ? (e.stack ?? null)?.slice(0, 2000) ?? null : null,
      outcome: "ack",
    });
    return "failed";
  } finally {
    busy.delete(key);
  }
}

/** Отдать видео в рендер; не вышло — строка failed, владельцу сообщение */
async function dispatch(deps: Deps, o: OrderRecord, r: RenderRecord): Promise<boolean> {
  try {
    const job = await deps.keepsake!.videoJob!(o);
    await deps.keepsake!.dispatchVideo!(job);
    await safeRender(() => deps.repo.saveRender(o.id, "video", { status: "queued", attempts: r.attempts + 1 }));
    return true;
  } catch (e) {
    const error = e instanceof Error ? `${e.name}: ${e.message}` : "dispatch";
    await safeRender(() => deps.repo.saveRender(o.id, "video", { status: "failed", attempts: r.attempts + 1, error }));
    await tellOwner(deps, o, error);
    return false;
  }
}

async function tellOwner(deps: Deps, o: OrderRecord, error: string) {
  for (const id of deps.keepsake?.ownerIds() ?? []) {
    await deps.tg
      .sendMessage(id, staff.keepsakeVideoFailed(o.number, error.slice(0, 200)))
      .catch(() => undefined);
  }
}

/** Ответ runner'а видео (/api/cron?t=render): running / done (адрес MP4 в Blob) / failed (повтор 1 раз) */
export async function videoResult(
  deps: Deps,
  orderId: string,
  result: { status: "running" | "done" | "failed"; url?: string; error?: string },
): Promise<"ok" | "notFound" | "retried" | "failed"> {
  const o = await deps.repo.getOrder(orderId);
  const r = await deps.repo.getRender(orderId, "video");
  if (!o || !r) return "notFound";
  const lang = (await deps.repo.getUser(o.userId))?.lang ?? "uz";
  // видео уже готово: поздние/повторные ответы runner'а ничего не меняют (без второго рендера и второго видео)
  if (r.status === "done" && result.status !== "done") return "ok";
  if (result.status === "running") {
    await deps.repo.saveRender(orderId, "video", { status: "running" });
    return "ok";
  }
  if (result.status === "done" && result.url) {
    if (r.status === "done" && r.telegramFileId) return "ok"; // повторный ответ — клиенту второй раз не шлём
    await deps.repo.saveRender(orderId, "video", { status: "done", url: result.url, error: null });
    const sent = await deps.tg.sendVideo(o.userId, result.url, { caption: txFor(lang).keepsake.videoCaption, width: 720, height: 1280 });
    await deps.repo.saveRender(orderId, "video", { telegramFileId: sent.fileId ?? null });
    return "ok";
  }
  // неудача: один повтор, потом — клиенту честно, владельцу сообщение
  if (r.attempts < 2 && r.status !== "failed") {
    if (await dispatch(deps, o, r)) return "retried";
    await deps.tg.sendMessage(o.userId, txFor(lang).keepsake.videoFailed).catch(() => undefined);
    return "failed";
  }
  if (r.status === "failed") return "failed";
  await deps.repo.saveRender(orderId, "video", { status: "failed", error: (result.error ?? "render").slice(0, 300) });
  await deps.tg.sendMessage(o.userId, txFor(lang).keepsake.videoFailed).catch(() => undefined);
  await tellOwner(deps, o, result.error ?? "render");
  return "failed";
}

/** Кнопка бота «ks:<номер>:<вид>» → всплывающий ответ */
export function keepsakeToast(lang: Lang, outcome: KeepsakeOutcome) {
  const k = txFor(lang).keepsake;
  switch (outcome) {
    case "sent":
      return k.sentToChat;
    case "queued":
      return k.videoQueued;
    case "already":
      return k.videoAlready;
    case "busy":
      return k.busy;
    case "notActive":
      return k.notActive;
    case "notFound":
      return txFor(lang).order.notFound;
    default:
      return k.failed;
  }
}
