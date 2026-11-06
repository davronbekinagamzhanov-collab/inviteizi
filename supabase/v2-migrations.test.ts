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
    await pg.query("insert into public.templates(id,number,occasion,format,price) values('muhr',113,'nikoh','animated',8000)");
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

  it("языки приглашения: сохраняются, читаются, лишнее отбрасывается; без языков — только узбекский", async () => {
    await repo.touchUser({ id: 777001 });
    const base = { occasion: "nikoh" as const, groom: "Азиз", bride: "Мадина", hosts: "Оила", events: [], customText: "Ўз матним" };
    const o = await repo.createOrder({ userId: 777001, occasion: "nikoh", format: "simple", templateId: "muhr", data: { ...base, langs: ["ru", "kk"], customTexts: { ru: "Мой текст" } }, music: { kind: "none" }, amount: 5000, slugBase: "langs-test", status: "preview" });
    expect((await repo.getOrder(o.id))?.data).toMatchObject({ langs: ["ru", "kk"], customTexts: { ru: "Мой текст" } });
    await repo.updateOrder(o.id, { data: { ...base, langs: [], customTexts: {} } });
    const back = (await repo.getOrder(o.id))!.data;
    expect(back.langs).toBeUndefined();
    expect(back.customTexts).toBeUndefined();
    const plain = await repo.createOrder({ userId: 777001, occasion: "nikoh", format: "simple", templateId: "muhr", data: base, music: { kind: "none" }, amount: 5000, slugBase: "langs-plain", status: "preview" });
    const [row] = await sql<{ langs: string[] }[]>`select langs from public.orders where id = ${plain.id}`;
    expect(row.langs).toEqual(["uz"]);
    await sql`reset role`;
    await expect(sql`update public.orders set langs = '{ru}' where id = ${plain.id}`).rejects.toThrow(/orders_langs_check/);
    await expect(sql`update public.orders set langs = '{uz,en}' where id = ${plain.id}`).rejects.toThrow(/orders_langs_check/);
    await sql`set role inviteizi_server`;
  });

  it("ставка в процентах: начисление 15% от оплаченной суммы; подтверждение перед оплатой сохраняется", async () => {
    await repo.touchUser({ id: 777101 });
    const p = await repo.createPartner({ code: "pct15abc", name: "Салон 15", telegramId: null, username: null, rate: 0, ratePercent: 15, status: "active" });
    expect(p.ratePercent).toBe(15);
    const o = await repo.createOrder({ userId: 777101, occasion: "nikoh", format: "animated", templateId: "muhr", data: { occasion: "nikoh", groom: "А", bride: "Б", hosts: "О", events: [] }, music: { kind: "none" }, amount: 8000, slugBase: "pct-test", status: "preview" });
    const confirmed = await repo.transition(o.id, ["preview"], "awaiting_payment", { payConfirmedAt: new Date("2026-11-06T05:00:00Z") });
    expect(confirmed?.payConfirmedAt?.toISOString()).toBe("2026-11-06T05:00:00.000Z");
    await repo.transition(o.id, ["awaiting_payment"], "active", { paidAt: new Date() });
    const credit = await repo.creditPartnerOrder(o.id, 777101, "pct15abc");
    expect(credit?.amount).toBe(1200);
    await repo.proposePartnerTerms(p.id, 0, "monthly", 20);
    expect((await repo.settlePartnerProposal(p.id, true))?.ratePercent).toBe(20);
  });

  it("миграция pay_confirm ещё не применена — оплата не встаёт (заказ сохраняется без новой отметки)", async () => {
    await repo.touchUser({ id: 777201 });
    const o = await repo.createOrder({ userId: 777201, occasion: "nikoh", format: "animated", templateId: "muhr", data: { occasion: "nikoh", groom: "А", bride: "Б", hosts: "О", events: [] }, music: { kind: "none" }, amount: 8000, slugBase: "no-migr", status: "preview" });
    await sql`reset role`;
    await sql`alter table public.orders drop column pay_confirmed_at`;
    await sql`set role inviteizi_server`;
    const r = await repo.transition(o.id, ["preview"], "awaiting_payment", { payConfirmedAt: new Date() });
    expect(r?.status).toBe("awaiting_payment");
    await sql`reset role`;
    await sql.unsafe(await readFile("supabase/migrations/20261111120000_pay_confirm.sql", "utf8"));
    await sql`set role inviteizi_server`;
  });

  it("повторное применение новой миграции безопасно", async () => {
    await sql`reset role`;
    await sql.unsafe(await readFile("supabase/migrations/20261108120000_notices.sql", "utf8"));
    await sql.unsafe(await readFile("supabase/migrations/20261109120000_invite_langs.sql", "utf8"));
    for (const f of ["20261110120000_care.sql", "20261111120000_pay_confirm.sql", "20261112120000_partner_percent.sql", "20261114120000_cancellations.sql"]) await sql.unsafe(await readFile(`supabase/migrations/${f}`, "utf8"));
    await sql`set role inviteizi_server`;
    expect(await repo.queueNotice({ key: "after-rerun", chatId: 2, text: "ok", dueAt: new Date() })).toBe(true);
  });

  it("отмена клиентом: только свой неоплаченный заказ; запись шага без user_id", async () => {
    await repo.touchUser({ id: 777301 });
    const data = { occasion: "nikoh" as const, groom: "А", bride: "Б", hosts: "О", events: [], photos: ["p1"] };
    const o = await repo.createOrder({ userId: 777301, occasion: "nikoh", format: "animated", templateId: "muhr", data, music: { kind: "none" }, amount: 8000, slugBase: "cancel-test", status: "preview" });
    expect(await repo.cancelOrder(o.id, 777302)).toBeNull();
    expect(await repo.cancelOrder("not-a-uuid", 777301)).toBeNull();
    const paid = await repo.createOrder({ userId: 777301, occasion: "nikoh", format: "animated", templateId: "muhr", data, music: { kind: "none" }, amount: 8000, slugBase: "cancel-paid", status: "preview" });
    await repo.updateOrder(paid.id, { status: "active", paidAt: new Date() });
    expect(await repo.cancelOrder(paid.id, 777301)).toBeNull();
    expect(await repo.cancelOrder(o.id, 777301)).toEqual({ photos: ["p1"], music: null });
    expect(await repo.getOrder(o.id)).toBeNull();
    await repo.recordCancellation({ step: 3, occasion: "nikoh", format: "animated", templateId: "muhr" });
    const [row] = await sql<{ step: number; template_id: string }[]>`select step, template_id from public.order_cancellations`;
    expect(row).toMatchObject({ step: 3, template_id: "muhr" });
  });
});
