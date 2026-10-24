/**
 * Repo на Postgres (Supabase). Идёт в настоящую базу, поэтому запускается только с доступом:
 *   npm run test:pg   (= node --env-file=.env.local … vitest run bot/repo-pg.test.ts)
 * Без DATABASE_URL / DB_SERVER_PASSWORD весь файл пропускается.
 * Тестовые записи: user_id ≥ 9 000 000 000, music/admins с меткой t-…; всё удаляется в afterAll.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { CONTRACT_USER_BASE, repoContract } from "./repo.contract";
import type { InvitationData } from "@/lib/domain";

// База в Сеуле (ap-northeast-2): из Казахстана один запрос идёт 0,4–1 с, транзакция — несколько секунд
vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

const hasDb = Boolean(process.env.DATABASE_URL || process.env.DB_SERVER_PASSWORD);
const tag = Math.random().toString(36).slice(2, 8);
const uid = () => CONTRACT_USER_BASE + 500_000_000 + Math.floor(Math.random() * 100_000_000);

describe.skipIf(!hasDb)("PgRepo (Supabase)", () => {
  let createdYorYor = false;

  beforeAll(async () => {
    const { db } = await import("@/lib/db");
    const sql = db();
    // контракт ставит музыку из списка «yor-yor»: в базе это внешний ключ — трек должен существовать
    const r = await sql`
      insert into public.music (id, title_uz, title_ru, file_url, sort, is_active)
      values ('yor-yor', 'Ёр-ёр (тест)', 'Ёр-ёр (тест)', 'https://example.com/yor-yor.mp3', 9999, false)
      on conflict (id) do nothing returning id`;
    createdYorYor = r.length > 0;
  });

  afterAll(async () => {
    const { db, closeDb } = await import("@/lib/db");
    const sql = db();
    await sql`delete from public.users where id >= ${CONTRACT_USER_BASE}`; // заказы и тадбиры — каскадом
    await sql`delete from public.admins where telegram_id >= ${CONTRACT_USER_BASE}`;
    await sql`delete from public.music where id like ${`t-${tag}-%`}`;
    if (createdYorYor) await sql`delete from public.music where id = 'yor-yor'`;
    await closeDb();
  });

  repoContract(async () => {
    const { createPgRepo } = await import("./repo-pg");
    return createPgRepo();
  });

  describe("PgRepo (своё, вне общего контракта)", () => {
    const repo = async () => (await import("./repo-pg")).createPgRepo();
    const full: InvitationData = {
      occasion: "nikoh",
      groom: "Ғайрат",
      bride: "Ҳилола",
      relation: "ozimiz",
      hosts: "Каримовлар оиласи",
      sides: { groom: "Каримовлар", bride: "Алиевлар" },
      textId: "2",
      customText: "Азиз меҳмонлар!",
      events: [
        { kind: "nahorgi", date: "2026-12-12", time: "06:00", venueName: "Хонадонимиз", address: "Сайрам", location: { lat: 42.3, lng: 69.76 } },
        { kind: "nikohBazm", date: "2026-12-12", time: "18:00", venueName: "«Наврўз»", address: "Сайрам, 45", mapUrl: "https://2gis.kz/x" },
        { kind: "kelinSalom", date: "2026-12-13", time: "09:00", venueName: "Уйимизда", address: "" },
      ],
    };

    async function order(over: Partial<Parameters<Awaited<ReturnType<typeof repo>>["createOrder"]>[0]> = {}) {
      const r = await repo();
      const userId = uid();
      await r.touchUser({ id: userId, username: `pg${userId}` });
      return r.createOrder({
        userId,
        occasion: "nikoh",
        format: "animated",
        templateId: "ganch-peshtoq",
        data: full,
        music: { kind: "none" },
        amount: 10_000,
        slugBase: `t-${tag}-pg`,
        ...over,
      });
    }

    it("данные пригласительного возвращаются без потерь (стороны, 3 тадбира, локация, ссылка, свой текст)", async () => {
      const o = await order({ slugBase: `t-${tag}-full` });
      const back = await (await repo()).getOrder(o.id);
      expect(back?.data).toEqual(full);
      expect(o.data).toEqual(full);
    });

    it("updateOrder с новыми тадбирами заменяет их целиком", async () => {
      const o = await order({ slugBase: `t-${tag}-ev` });
      const data = { ...full, events: [full.events[1]] };
      const u = await (await repo()).updateOrder(o.id, { data });
      expect(u.data.events).toEqual([full.events[1]]);
    });

    it("createOrder — одна транзакция: ошибка в тадбире не оставляет заказа", async () => {
      const r = await repo();
      const bad = { ...full, events: [{ ...full.events[0], time: "25:99" }] };
      await expect(order({ data: bad, slugBase: `t-${tag}-bad` })).rejects.toThrow();
      expect(await r.getOrderBySlug(`t-${tag}-bad`)).toBeNull();
    });

    it("одновременные заказы с одним slug получают разные адреса", async () => {
      const base = `t-${tag}-race`;
      const list = await Promise.all([order({ slugBase: base }), order({ slugBase: base }), order({ slugBase: base })]);
      expect(new Set(list.map((o) => o.slug)).size).toBe(3);
      expect(list.map((o) => o.slug).sort()).toEqual([base, `${base}-2`, `${base}-3`]);
    });

    it("isSlugTaken: адреса страниц сайта (demo, catalog…) заняты", async () => {
      const r = await repo();
      expect(await r.isSlugTaken("demo")).toBe(true);
      expect(await r.isSlugTaken("catalog")).toBe(true);
    });

    it("updateOrder несуществующего заказа — ошибка", async () => {
      const r = await repo();
      await expect(r.updateOrder("00000000-0000-4000-8000-000000000000", { amount: 1 })).rejects.toThrow();
    });

    it("isAdmin / listAdminIds — ADMIN_IDS из env и таблица admins", async () => {
      const { db } = await import("@/lib/db");
      const id = uid();
      await db()`insert into public.admins (telegram_id, name) values (${id}, 'тест')`;
      const r = await repo();
      expect(await r.isAdmin(id)).toBe(true);
      expect(await r.isAdmin(uid())).toBe(false);
      expect(await r.listAdminIds()).toContain(id);
      const fromEnv = (process.env.ADMIN_IDS ?? "").split(",").map(Number).filter(Boolean);
      for (const a of fromEnv) expect(await r.isAdmin(a)).toBe(true);
    });

    it("listMusic — только активные по sort; setMusicTelegramFileId запоминает file_id", async () => {
      const { db } = await import("@/lib/db");
      const a = `t-${tag}-a`;
      const b = `t-${tag}-b`;
      const off = `t-${tag}-off`;
      await db()`insert into public.music (id, title_uz, title_ru, file_url, sort, is_active) values
        (${b}, 'Б', 'Б', 'https://x/b.mp3', -1, true),
        (${a}, 'А', 'А', 'https://x/a.mp3', -2, true),
        (${off}, 'В', 'В', 'https://x/c.mp3', -3, false)`;
      const r = await repo();
      const mine = (await r.listMusic()).filter((m) => m.id.startsWith(`t-${tag}-`));
      expect(mine.map((m) => m.id)).toEqual([a, b]);
      expect(mine[0]).toEqual({
        id: a, titleUz: "А", titleRu: "А", fileUrl: "https://x/a.mp3", telegramFileId: null, sort: -2, occasion: null, isArtist: false,
      });
      await r.setMusicTelegramFileId(b, "TG_B");
      expect((await r.listMusic()).find((m) => m.id === b)?.telegramFileId).toBe("TG_B");
    });

    it("listMusic(occasion) — только треки тадбира и треки без тадбира", async () => {
      const { db } = await import("@/lib/db");
      const n = `t-${tag}-nikoh`;
      const s = `t-${tag}-sunnat`;
      await db()`insert into public.music (id, title_uz, title_ru, file_url, sort, is_active, occasion, is_artist) values
        (${n}, 'Н', 'Н', 'https://x/n.mp3', -5, true, 'nikoh', true),
        (${s}, 'С', 'С', 'https://x/s.mp3', -4, true, 'sunnat', false)`;
      const r = await repo();
      const nikoh = (await r.listMusic("nikoh")).filter((m) => m.id.startsWith(`t-${tag}-`)).map((m) => m.id);
      expect(nikoh).toContain(n);
      expect(nikoh).not.toContain(s);
      expect((await r.listMusic("nikoh")).find((m) => m.id === n)?.isArtist).toBe(true);
    });

    it("stats: новые заказы и выручка попадают в «сегодня», источник считается", async () => {
      const r = await repo();
      const s0 = await r.stats(new Date());
      const source = `t-${tag}-src`;
      const userId = uid();
      await r.touchUser({ id: userId, source });
      const base = {
        userId,
        occasion: "nikoh" as const,
        format: "animated" as const,
        templateId: "ganch-peshtoq",
        data: full,
        music: { kind: "none" as const },
      };
      const paid = await r.createOrder({ ...base, amount: 10_000, slugBase: `t-${tag}-st1`, status: "active" });
      await r.updateOrder(paid.id, { paidAt: new Date() });
      await r.createOrder({ ...base, amount: 7_000, slugBase: `t-${tag}-st2`, status: "preview" });
      const s1 = await r.stats(new Date(Date.now() + 1000));
      expect(s1.orders.today - s0.orders.today).toBe(2);
      expect(s1.orders.total - s0.orders.total).toBe(2);
      expect(s1.revenue.today - s0.revenue.today).toBe(10_000);
      expect(s1.revenue.total - s0.revenue.total).toBe(10_000);
      expect((s1.byStatus.active ?? 0) - (s0.byStatus.active ?? 0)).toBe(1);
      expect(s1.bySource).toContainEqual({ source, users: 1, paid: 1 });
    });
  });
});
