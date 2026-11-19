/**
 * «📥 Сақлаб олиш» (19.11.2026): после ✅ — сообщение с кнопками файлов; фото/PDF — в чат; видео — очередь,
 * ответ runner'а, повтор 1 раз, сообщение владельцу. Отказы: чужой заказ, неоплаченный, двойное нажатие,
 * нет рендера видео (кнопки нет), неверный секрет ответа, чужой адрес видео.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { resetRateLimits } from "@/lib/rate-limit";
import { uz } from "@/texts/bot-uz";
import { ru } from "@/texts/bot-ru";
import { payTexts } from "@/texts/pay";
import type { AppUser } from "@/lib/tg-init-data";
import type { OrderRecord } from "@/lib/domain";
import { appAction } from "./app/dispatch";
import { nikohOrder } from "./testing/paths";
import { ADMIN, Sim } from "./testing/sim";
import { deliverKeepsake, videoResult, type KeepsakeIo, type VideoJob } from "./keepsake";
import { handleRenderCallback } from "./render-callback";

const T = payTexts.uz;
const K = uz.keepsake;
const user = (id: number): AppUser => ({ id, firstName: null, username: null, languageCode: null });
const BLOB = "https://abc123.public.blob.vercel-storage.com/keepsake/0123456789abcdef0123456789abcdef/x-video.mp4";

const btns = (m: unknown) => ((m as { inline: { text: string }[][] }).inline ?? []).flat().map((b) => b.text);

function withKeepsake(s: Sim, video = true) {
  const rendered: string[] = [];
  const jobs: VideoJob[] = [];
  let failDispatch = false;
  const io: KeepsakeIo = {
    async render(o, url, kind) {
      rendered.push(`${o.number}:${kind}`);
      await new Promise((r) => setTimeout(r, 5));
      return new Uint8Array([1, 2, 3]);
    },
    store: async (o, kind) => `https://abc123.public.blob.vercel-storage.com/keepsake/f/${o.slug}-${kind}.png`,
    ownerIds: () => [ADMIN],
    ...(video
      ? {
          videoJob: async (o: OrderRecord) => ({
            orderId: o.id,
            slug: o.slug,
            url: `https://inviteizi.vercel.app/${o.slug}?render=video`,
            musicUrl: null,
            cta: "Таклифномани очинг",
            link: `inviteizi.vercel.app/${o.slug}`,
            paper: "#ffffff",
            ink: "#000000",
            callback: "https://inviteizi.vercel.app/api/render",
          }),
          dispatchVideo: async (job: VideoJob) => {
            if (failDispatch) throw new Error("GitHub dispatch 500");
            jobs.push(job);
          },
        }
      : {}),
  };
  s.deps.keepsake = io;
  return { rendered, jobs, failDispatch: (v: boolean) => (failDispatch = v) };
}

/** Клиент заказал, оплатил «Тўладим», владелец ✅ */
async function paidOrder(s: Sim, id: number) {
  const o = await nikohOrder(s, id);
  await s.click(id, /^💳 Тўлаш/);
  await s.click(id, uz.pay.confirmYes);
  await s.click(id, T.paid);
  await s.text(id, "Давронбек И.");
  const card = s.tg.to(ADMIN).find((m) => m.text.includes("Давронбек И."))!;
  await s.callback(ADMIN, `ok:${o.number}`, card.id);
  return (await s.repo.getOrder(o.id))!;
}

describe("«📥 Сақлаб олиш» в боте", () => {
  beforeEach(() => resetRateLimits());

  it("после ✅ — одно сообщение с кнопками: фото, PDF A5/A6, видео (анимацияли)", async () => {
    const s = new Sim();
    withKeepsake(s);
    const o = await paidOrder(s, 1);
    expect(o.format).toBe("animated");
    const offers = s.tg.to(1).filter((m) => m.text.startsWith(K.offer));
    expect(offers).toHaveLength(1);
    const buttons = btns(offers[0].markup);
    expect(buttons).toEqual([K.story, K.feed, K.a5, K.a6, K.video]);
    expect(offers[0].text).toContain("A5/A6");
  });

  it("без рендера видео кнопки «🎬 Видео» нет; без «Сақлаб олиш» — сообщения нет вовсе", async () => {
    const s = new Sim();
    withKeepsake(s, false);
    await paidOrder(s, 1);
    const offer = s.tg.to(1).find((m) => m.text.startsWith(K.offer))!;
    expect(btns(offer.markup)).not.toContain(K.video);
    const s2 = new Sim();
    await paidOrder(s2, 1);
    expect(s2.tg.to(1).some((m) => m.text.startsWith(K.offer))).toBe(false);
  });

  it("кнопка «Статус учун» → фото в чат; повтор — из кэша Telegram без нового рендера; PDF — документом", async () => {
    const s = new Sim();
    const k = withKeepsake(s);
    const o = await paidOrder(s, 1);
    const offer = s.tg.to(1).find((m) => m.text.startsWith(K.offer))!;
    await s.callback(1, `ks:${o.number}:story`, offer.id);
    const photo = s.tg.to(1).at(-1)!;
    expect(photo.type).toBe("photo");
    expect(photo.text).toBe(K.storyCaption);
    await s.callback(1, `ks:${o.number}:story`, offer.id);
    expect(k.rendered).toEqual([`${o.number}:story`]);
    expect((await s.repo.getRender(o.id, "story"))!.url).toContain("/keepsake/");
    await s.callback(1, `ks:${o.number}:a5`, offer.id);
    const pdf = s.tg.to(1).at(-1)!;
    expect(pdf.type).toBe("document");
    expect(pdf.text).toBe(K.printCaption("A5"));
    expect(pdf.fileName).toBe(`${o.slug}-A5.pdf`);
  });

  it("двойное нажатие одновременно — один файл", async () => {
    const s = new Sim();
    const k = withKeepsake(s);
    const o = await paidOrder(s, 1);
    const r = await Promise.all([
      deliverKeepsake(s.deps, 1, { number: o.number }, "feed"),
      deliverKeepsake(s.deps, 1, { number: o.number }, "feed"),
    ]);
    expect(r.sort()).toEqual(["busy", "sent"]);
    expect(k.rendered.filter((x) => x.endsWith(":feed"))).toHaveLength(1);
  });

  it("чужой заказ и неоплаченный — нет файла", async () => {
    const s = new Sim();
    const k = withKeepsake(s);
    const o = await paidOrder(s, 1);
    expect(await deliverKeepsake(s.deps, 2, { number: o.number }, "story")).toBe("notFound");
    const draft = await nikohOrder(s, 3);
    expect(await deliverKeepsake(s.deps, 3, { number: draft.number }, "story")).toBe("notActive");
    expect(await deliverKeepsake(s.deps, 1, { number: o.number }, "bad" as never)).toBe("unavailable");
    expect(k.rendered).toEqual([]);
    // админ может получить файлы любого заказа (для помощи клиенту)
    expect(await deliverKeepsake(s.deps, ADMIN, { number: o.number }, "story")).toBe("sent");
  });

  it("видео: в очередь один раз; ответ runner'а → видео клиенту один раз", async () => {
    const s = new Sim();
    const k = withKeepsake(s);
    const o = await paidOrder(s, 1);
    const offer = s.tg.to(1).find((m) => m.text.startsWith(K.offer))!;
    await s.callback(1, `ks:${o.number}:video`, offer.id);
    expect(s.lastText(1)).toBe(K.videoQueued);
    await s.callback(1, `ks:${o.number}:video`, offer.id);
    expect(k.jobs).toHaveLength(1);
    expect(k.jobs[0].url).toBe(`https://inviteizi.vercel.app/${o.slug}?render=video`);
    expect(await videoResult(s.deps, o.id, { status: "running" })).toBe("ok");
    expect(await videoResult(s.deps, o.id, { status: "done", url: BLOB })).toBe("ok");
    expect(await videoResult(s.deps, o.id, { status: "done", url: BLOB })).toBe("ok");
    expect(s.tg.to(1).filter((m) => m.type === "video")).toHaveLength(1);
    // готовое видео по кнопке — сразу из Telegram, без нового рендера
    await s.callback(1, `ks:${o.number}:video`, offer.id);
    expect(s.tg.to(1).filter((m) => m.type === "video")).toHaveLength(2);
    expect(k.jobs).toHaveLength(1);
  });

  it("видео не получилось: повтор 1 раз, потом клиенту «расм ва PDF тайёр», владельцу сообщение", async () => {
    const s = new Sim();
    const k = withKeepsake(s);
    const o = await paidOrder(s, 1);
    await deliverKeepsake(s.deps, 1, { number: o.number }, "video");
    expect(await videoResult(s.deps, o.id, { status: "failed", error: "timeout" })).toBe("retried");
    expect(k.jobs).toHaveLength(2);
    expect(await videoResult(s.deps, o.id, { status: "failed", error: "timeout" })).toBe("failed");
    expect(k.jobs).toHaveLength(2);
    expect(s.tg.to(1).filter((m) => m.text === K.videoFailed)).toHaveLength(1);
    expect(s.tg.to(ADMIN).some((m) => m.text.startsWith(`⚠️ Видео №${o.number}`))).toBe(true);
    // после неудачи клиент может попробовать ещё раз
    expect(await deliverKeepsake(s.deps, 1, { number: o.number }, "video")).toBe("queued");
  });

  it("GitHub недоступен — клиенту честно, владельцу сообщение, повторное нажатие снова пробует", async () => {
    const s = new Sim();
    const k = withKeepsake(s);
    const o = await paidOrder(s, 1);
    k.failDispatch(true);
    expect(await deliverKeepsake(s.deps, 1, { number: o.number }, "video")).toBe("failed");
    expect(s.tg.to(ADMIN).some((m) => m.text.includes("GitHub dispatch 500"))).toBe(true);
    k.failDispatch(false);
    expect(await deliverKeepsake(s.deps, 1, { number: o.number }, "video")).toBe("queued");
  });

  it("«Менинг таклифномаларим»: кнопка «📥 Сақлаб олиш» у оплаченного → кнопки файлов (ru)", async () => {
    const s = new Sim();
    withKeepsake(s);
    const o = await paidOrder(s, 1);
    await s.repo.setLang(1, "ru");
    await s.callback(1, `ks:${o.number}`, 1);
    expect(s.lastText(1)).toContain(ru.keepsake.offer);
    expect(btns(s.last(1).markup)).toContain(ru.keepsake.a6);
    // чужому — «не найдено»
    await s.callback(2, `ks:${o.number}`, 1);
    expect(s.tg.to(2).some((m) => m.text.startsWith(ru.keepsake.offer))).toBe(false);
  });
});

describe("«📥 Сақлаб олиш»: находки ревью", () => {
  beforeEach(() => resetRateLimits());
  it("поздний «failed»/«running» после готового видео — без второго рендера и без смены статуса", async () => {
    const s = new Sim();
    const k = withKeepsake(s);
    const o = await paidOrder(s, 1);
    await deliverKeepsake(s.deps, 1, { number: o.number }, "video");
    await videoResult(s.deps, o.id, { status: "done", url: BLOB });
    expect(await videoResult(s.deps, o.id, { status: "failed", error: "late" })).toBe("ok");
    expect(await videoResult(s.deps, o.id, { status: "running" })).toBe("ok");
    expect(k.jobs).toHaveLength(1);
    expect((await s.repo.getRender(o.id, "video"))!.status).toBe("done");
  });
  it("runner пропал без ответа: через 20 минут клиент может заказать видео снова", async () => {
    const s = new Sim();
    const k = withKeepsake(s);
    const o = await paidOrder(s, 1);
    expect(await deliverKeepsake(s.deps, 1, { number: o.number }, "video")).toBe("queued");
    s.advance(5);
    expect(await deliverKeepsake(s.deps, 1, { number: o.number }, "video")).toBe("already");
    // repo-memory ставит updatedAt по настоящим часам — сдвигаем отметку назад
    s.repo.renders.get(`${o.id}:video`)!.updatedAt = new Date(+s.deps.now() - 21 * 60_000);
    expect(await deliverKeepsake(s.deps, 1, { number: o.number }, "video")).toBe("queued");
    expect(k.jobs).toHaveLength(2);
  });
  it("мусор вместо номера/id — «не найдено», без запроса в базу с ошибкой", async () => {
    const s = new Sim();
    withKeepsake(s);
    expect(await deliverKeepsake(s.deps, 1, { id: "abc" }, "story")).toBe("notFound");
    expect(await deliverKeepsake(s.deps, 1, { number: NaN }, "story")).toBe("notFound");
    expect((await appAction(s.deps, user(1), { action: "keepsake", orderId: "'; drop table", kind: "story" })).status).toBe(403);
    await s.callback(1, "ks:abc", 1);
    await s.callback(1, "ks:abc:story", 1);
  });
});

describe("«📥 Сақлаб олиш» в Mini App", () => {
  beforeEach(() => resetRateLimits());
  it("свой оплаченный — файл в чат; чужой — 403; неоплаченный — 403", async () => {
    const s = new Sim();
    withKeepsake(s);
    const o = await paidOrder(s, 1);
    const own = await appAction(s.deps, user(1), { action: "keepsake", orderId: o.id, kind: "a6" });
    expect(own).toEqual({ status: 200, body: { outcome: "sent" } });
    expect(s.tg.to(1).at(-1)!.type).toBe("document");
    const other = await appAction(s.deps, user(2), { action: "keepsake", orderId: o.id, kind: "a6" });
    expect(other.status).toBe(403);
    const draft = await nikohOrder(s, 3);
    expect((await appAction(s.deps, user(3), { action: "keepsake", orderId: draft.id, kind: "story" })).status).toBe(403);
    const list = (await appAction(s.deps, user(1), { action: "orders" })).body as { orders?: { keepsake?: unknown }[] } | { keepsake?: unknown }[];
    expect(JSON.stringify(list)).toContain('"keepsake":{"video":true}');
  });
});

describe("/api/render — ответ runner'а", () => {
  const req = (auth: string | null, body: unknown) =>
    new Request("https://x/api/render", {
      method: "POST",
      headers: { "content-type": "application/json", ...(auth ? { authorization: auth } : {}) },
      body: JSON.stringify(body),
    });
  it("без секрета / с неверным — 401; чужой адрес видео — 400; не тот заказ — 404", async () => {
    const s = new Sim();
    withKeepsake(s);
    const o = await paidOrder(s, 1);
    await deliverKeepsake(s.deps, 1, { number: o.number }, "video");
    const deps = () => s.deps;
    expect((await handleRenderCallback(req(null, {}), "sec", deps)).status).toBe(401);
    expect((await handleRenderCallback(req("Bearer bad", {}), "sec", deps)).status).toBe(401);
    expect((await handleRenderCallback(req("Bearer sec", {}), undefined, deps)).status).toBe(401);
    expect(
      (await handleRenderCallback(req("Bearer sec", { orderId: o.id, status: "done", url: "https://evil.example/v.mp4" }), "sec", deps)).status,
    ).toBe(400);
    expect(
      (await handleRenderCallback(req("Bearer sec", { orderId: "00000000-0000-4000-8000-00000000dead", status: "running" }), "sec", deps))
        .status,
    ).toBe(404);
    const ok = await handleRenderCallback(req("Bearer sec", { orderId: o.id, status: "done", url: BLOB }), "sec", deps);
    expect(ok.status).toBe(200);
    expect(s.tg.to(1).filter((m) => m.type === "video")).toHaveLength(1);
  });
});
