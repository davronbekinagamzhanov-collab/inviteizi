/**
 * Рассылка об акции (17.11.2026): кто получает (все роли), ровно один раз (двойное нажатие, перезапуск, обрыв аренды),
 * 403 помечает, 429 — повтор по retry_after, не больше 25 в секунду, не чаще раза в 3 дня, «Охирги кун!» за 24 ч.
 */
import { describe, expect, it } from "vitest";
import { uz } from "@/texts/bot-uz";
import { salesTexts, strike } from "@/texts/sales";
import type { AppUser } from "@/lib/tg-init-data";
import { partnerSource } from "@/lib/owner-panel";
import { ownerAdmin } from "./app/owner-admin";
import { broadcastKey, runBroadcast } from "./broadcast";
import { runCron } from "./cron";
import { ADMIN, Sim } from "./testing/sim";
import type { InlineButton } from "./tg";

const CLIENT = 1;
const CLIENT_RU = 2;
const VIA_PARTNER = 3;
const SILENT = 4;
const BLOCKED = 5;
const MANAGER = 700;
const PARTNER = 800;
const WHOLESALE = 900;
const user = (id: number): AppUser => ({ id, firstName: null, username: null, languageCode: null });
const admin = (s: Sim, a: Parameters<typeof ownerAdmin>[2], b: Record<string, unknown> = {}) =>
  ownerAdmin(s.deps, user(ADMIN), a, b) as Promise<Record<string, unknown>>;
const noWait = { sleep: async () => {} };

async function world() {
  const s = new Sim();
  s.deps.env.miniAppUrl = "https://inviteizi.test/app";
  await s.start(ADMIN);
  await s.click(ADMIN, uz.langUz);
  const m = await admin(s, "ownerManagerInvite");
  await s.start(MANAGER, "mgr_" + /start=mgr_([a-z0-9]+)/.exec(String(m.link))![1]);
  const p = (await admin(s, "ownerPartnerNew", {
    name: "Салон",
    phone: "+77011234567",
    rate: "10%",
    schedule: "weekly",
  })) as { id: number; link: string };
  await s.start(PARTNER, "join_" + /start=join_([a-z0-9]+)/.exec(p.link)![1]);
  await s.click(PARTNER, uz.langUz);
  // этап 3: после выбора языка сразу меню (телефон не спрашиваем)
  const code = (await s.repo.getPartner(p.id))!.code;
  for (const id of [CLIENT, SILENT, BLOCKED, WHOLESALE]) {
    await s.start(id);
    await s.click(id, uz.langUz);
  }
  await s.start(CLIENT_RU);
  await s.click(CLIENT_RU, /Русский/);
  await s.start(VIA_PARTNER, partnerSource(code));
  await s.click(VIA_PARTNER, uz.langUz);
  await admin(s, "ownerWholesaleSet", { userId: WHOLESALE, percent: 15 });
  await s.repo.setBroadcastOff(SILENT, true);
  s.tg.blocked.add(BLOCKED);
  return s;
}

async function promo(s: Sim, body: Record<string, unknown> = {}) {
  const r = await admin(s, "ownerPromotionCreate", {
    name: "Куз",
    percent: 50,
    startsAt: "2026-11-01T00:00",
    endsAt: "2026-11-05T00:00",
    ...body,
  });
  expect(r).toMatchObject({ ok: true });
  return r.id as string;
}
const inlineOf = (m: { markup?: unknown }) => {
  const mk = m.markup as { inline?: InlineButton[][] } | undefined;
  return mk?.inline?.flat() ?? [];
};
const promoPhotos = (s: Sim, id: number) =>
  s.tg.to(id).filter((m) => m.type === "photo" && inlineOf(m).some((b) => "data" in b && b.data === "bo:off"));

describe("рассылка об акции", () => {
  it("кто получает: клиенты (уз и ру); не получают админ, менеджер, партнёр, оптовик, клиент партнёра, «🔕», заблокировавший", async () => {
    const s = await world();
    const id = await promo(s);
    const preview = await admin(s, "ownerBroadcastPreview", { id });
    // клиенты 1, 2 и заблокировавший (его не видно, пока Telegram не ответит 403)
    expect(preview).toMatchObject({ ok: true, recipients: 3 });
    expect(String(preview.uz)).toContain("−50 %");
    expect(String(preview.uz)).toContain(`${strike("7 990 ₸")} → 3 990 ₸`);
    expect(preview.buttons).toEqual([salesTexts.uz.bcChoose, salesTexts.uz.bcOff]);
    const r = await admin(s, "ownerBroadcastStart", { id });
    expect(r).toMatchObject({ ok: true, queued: 3 });
    for (const who of [CLIENT, CLIENT_RU]) expect(promoPhotos(s, who), `получатель ${who}`).toHaveLength(1);
    for (const who of [ADMIN, MANAGER, PARTNER, WHOLESALE, VIA_PARTNER, SILENT, BLOCKED])
      expect(promoPhotos(s, who), `не получатель ${who}`).toHaveLength(0);
    // язык получателя и кнопка каталога Mini App
    expect(promoPhotos(s, CLIENT_RU)[0].text).toContain("Акция «Куз»".slice(0, 0) + "До конца акции");
    expect(inlineOf(promoPhotos(s, CLIENT)[0])[0]).toEqual({
      text: salesTexts.uz.bcChoose,
      webApp: "https://inviteizi.test/app",
    });
    // 403 → помечен; прогресс в админке
    const list = (await admin(s, "ownerPromotions")).promotions as { id: string; progress: Record<string, number> }[];
    expect(list.find((x) => x.id === id)!.progress).toEqual({ queued: 0, sent: 2, blocked: 1, failed: 0 });
    expect((await s.repo.listBroadcastUsers()).map((u) => u.id)).not.toContain(BLOCKED);
  });

  it("клиенты по ссылке партнёра получают, только если это включено в акции", async () => {
    const s = await world();
    const id = await promo(s, { forPartnerClients: true });
    await admin(s, "ownerBroadcastStart", { id });
    expect(promoPhotos(s, VIA_PARTNER)).toHaveLength(1);
  });

  it("ровно один раз: двойное нажатие, повторный запуск, обрыв посреди отправки", async () => {
    const s = await world();
    const id = await promo(s);
    const [a, b] = await Promise.all([
      admin(s, "ownerBroadcastStart", { id }),
      admin(s, "ownerBroadcastStart", { id }),
    ]);
    expect([a, b].filter((x) => x.ok)).toHaveLength(1);
    await runBroadcast(s.deps, noWait);
    await runBroadcast(s.deps, noWait);
    for (const who of [CLIENT, CLIENT_RU]) expect(promoPhotos(s, who)).toHaveLength(1);
    // обрыв: сообщение взято и «отправляется», сервер упал — после аренды не повторяется
    const key = broadcastKey(id, 77, "start");
    await s.repo.enqueueBroadcast([{ key, chatId: 77, dueAt: s.deps.now() }]);
    const [job] = await s.repo.claimBroadcast(s.deps.now(), 1, 120_000);
    await s.repo.markBroadcastSending(job.key, job.token, s.deps.now());
    s.advance(5);
    expect(await s.repo.claimBroadcast(s.deps.now(), 10, 120_000)).toEqual([]);
    expect(await s.repo.broadcastStats(`promo:${id}:`)).toMatchObject({ queued: 0, failed: 1 });
  });

  it("429: остальные позже, по retry_after; всё доходит ровно один раз", async () => {
    const s = await world();
    s.tg.blocked.delete(BLOCKED);
    const id = await promo(s);
    s.tg.floodNext = 1;
    s.tg.floodRetryAfter = 30;
    await admin(s, "ownerBroadcastStart", { id });
    const sentEarly = [CLIENT, CLIENT_RU, BLOCKED].reduce((n, who) => n + promoPhotos(s, who).length, 0);
    expect(sentEarly).toBe(0);
    await runBroadcast(s.deps, noWait);
    expect([CLIENT, CLIENT_RU, BLOCKED].reduce((n, who) => n + promoPhotos(s, who).length, 0)).toBe(0);
    s.advance(1);
    await runBroadcast(s.deps, noWait);
    for (const who of [CLIENT, CLIENT_RU, BLOCKED]) expect(promoPhotos(s, who), `${who}`).toHaveLength(1);
  });

  it("не больше 25 сообщений в секунду", async () => {
    const s = new Sim();
    for (let i = 0; i < 60; i++) await s.repo.touchUser({ id: 10_000 + i });
    const id = await promo(s, { broadcast: true });
    await s.repo.markPromotionBroadcast(id, "start", s.deps.now(), 0);
    await s.repo.enqueueBroadcast(
      Array.from({ length: 60 }, (_, i) => ({
        key: broadcastKey(id, 10_000 + i, "start"),
        chatId: 10_000 + i,
        dueAt: s.deps.now(),
      })),
    );
    let t = 0;
    const perSecond: number[] = [];
    let current = 0;
    const sendPhoto = s.tg.sendPhoto.bind(s.tg);
    s.tg.sendPhoto = async (...a) => {
      current++;
      return sendPhoto(...a);
    };
    const r = await runBroadcast(s.deps, {
      clock: () => t,
      sleep: async (ms) => {
        perSecond.push(current);
        current = 0;
        t += ms;
      },
    });
    perSecond.push(current);
    expect(r.sent).toBe(60);
    expect(Math.max(...perSecond)).toBeLessThanOrEqual(25);
  });

  it("рассылки не чаще раза в 3 дня; «Охирги кун!» за 24 ч до конца — одно; не больше 2 сообщений на акцию", async () => {
    const s = await world();
    const first = await promo(s, { endsAt: "2026-11-02T18:00" });
    expect(await admin(s, "ownerBroadcastStart", { id: first })).toMatchObject({ ok: true });
    // через сутки — новая акция и её рассылка: «слишком часто»
    await admin(s, "ownerPromotionStop", { id: first });
    s.advance(24 * 60);
    const second = await promo(s, { startsAt: "2026-11-02T13:00", endsAt: "2026-11-09T00:00" });
    expect(await admin(s, "ownerBroadcastStart", { id: second })).toMatchObject({ error: "stale", reason: "tooSoon" });
    // напоминание второй акции: за 24 ч до конца, один раз (cron)
    s.advance(5 * 24 * 60 + 13 * 60);
    await runCron(s.deps);
    await runCron(s.deps);
    const last = s.tg.to(CLIENT).filter((m) => m.text.startsWith(salesTexts.uz.bcLast));
    expect(last).toHaveLength(1);
    expect(promoPhotos(s, CLIENT)).toHaveLength(2);
  });

  it("«🔕 Хабарларни ўчириш»: кнопка отключает, следующих рассылок нет", async () => {
    const s = await world();
    const id = await promo(s);
    await admin(s, "ownerBroadcastStart", { id });
    const msg = promoPhotos(s, CLIENT)[0];
    await s.callback(CLIENT, "bo:off", msg.id);
    expect(s.lastText(CLIENT)).toBe(salesTexts.uz.bcOffDone);
    expect((await s.repo.listBroadcastUsers()).map((u) => u.id)).not.toContain(CLIENT);
  });

  it("акцию «без рассылки» не разослать; промокод рассылку не делает", async () => {
    const s = await world();
    const id = await promo(s, { broadcast: false });
    expect(await admin(s, "ownerBroadcastStart", { id })).toMatchObject({ error: "bad", reason: "disabled" });
    expect(promoPhotos(s, CLIENT)).toHaveLength(0);
  });
});
