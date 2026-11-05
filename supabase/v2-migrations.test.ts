/**
 * v2: все миграции по порядку на чистой PGlite (как будут применяться до Merge) и новые запросы PgRepo
 * через настоящий протокол Postgres. Боевую базу не трогает.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import postgres from "postgres";
import { readdir, readFile } from "node:fs/promises";
import { PgRepo } from "@/bot/repo-pg";
import type { Sql } from "@/lib/db";

describe("v2: миграции и новые запросы PgRepo на PGlite", () => {
  let pg: PGlite, server: PGLiteSocketServer, sql: Sql, repo: PgRepo;
  beforeAll(async () => {
    pg = new PGlite();
    await pg.exec("create role anon; create role authenticated; create role inviteizi_server; create schema if not exists storage; create table if not exists storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);");
    // pg_cron в PGlite нет — эту миграцию пропускаем (расписание в боевой базе уже есть)
    for (const name of (await readdir("supabase/migrations")).filter((n) => n.endsWith(".sql") && !n.includes("_cron")).sort()) {
      await pg.exec(await readFile(`supabase/migrations/${name}`, "utf8"));
    }
    server = new PGLiteSocketServer({ db: pg, host: "127.0.0.1", port: 0, maxConnections: 1 });
    await server.start();
    const port = Number(server.getServerConn().split(":").at(-1));
    sql = postgres({ host: "127.0.0.1", port, username: "postgres", password: "postgres", database: "postgres", ssl: false, max: 1, prepare: false, connect_timeout: 5, onnotice: () => {}, types: { bigint: { to: 20, from: [20], serialize: String, parse: Number } } }) as unknown as Sql;
    await sql`set role inviteizi_server`;
    repo = new PgRepo(sql);
  }, 60_000);
  afterAll(async () => {
    await sql?.end({ timeout: 2 });
    await server?.stop();
    await pg?.close();
  });

  it("очередь сообщений: ключ один раз, забрать один раз, созревшие — после due_at", async () => {
    const now = new Date("2026-11-05T10:00:00Z");
    const n = { key: "ev:2026-11-05:1", chatId: 1, text: "Тест ў қ", markup: { inline: [[{ text: "✅", data: "po:1:1000" }]] }, dueAt: now };
    expect(await repo.queueNotice(n)).toBe(true);
    expect(await repo.queueNotice(n)).toBe(false);
    expect(await repo.claimNotice(n.key, now)).toBe(true);
    expect(await repo.claimNotice(n.key, now)).toBe(false);
    await repo.queueNotice({ ...n, key: "late", dueAt: new Date("2026-11-06T03:00:00Z") });
    expect(await repo.claimDueNotices(now, 10)).toEqual([]);
    const due = await repo.claimDueNotices(new Date("2026-11-06T03:01:00Z"), 10);
    expect(due).toMatchObject([{ key: "late", chatId: 1, text: "Тест ў қ", markup: n.markup }]);
    expect(await repo.claimDueNotices(new Date("2026-11-06T04:00:00Z"), 10)).toEqual([]);
  });

  it("выплата менеджеру за месяц — один раз; снимок панели видит её и заказы «для клиента»", async () => {
    const row = { managerId: 700, month: "2026-10", amount: 11500, orders: 23, createdBy: 500 };
    expect(await repo.recordManagerPayout(row)).toBe(true);
    expect(await repo.recordManagerPayout(row)).toBe(false);
    expect(await repo.recordManagerPayout({ ...row, month: "2026-11", amount: 0 })).toBe(false);
    const s = await repo.panelSnapshot();
    expect(s.managerPayouts).toMatchObject([{ managerId: 700, month: "2026-10", amount: 11500, orders: 23 }]);
    expect(s.clientOrders).toEqual([]);
    expect(s.partnersReady).toBe(true);
  });

  it("повторное применение новой миграции безопасно", async () => {
    await sql`reset role`;
    await sql.unsafe(await readFile("supabase/migrations/20261108120000_notices.sql", "utf8"));
    await sql`set role inviteizi_server`;
    expect(await repo.queueNotice({ key: "after-rerun", chatId: 2, text: "ok", dueAt: new Date() })).toBe(true);
  });
});
