/**
 * «Сақлаб олиш» на настоящей PostgreSQL (19.11.2026): таблица order_renders из миграции, PgRepo — очередь видео
 * без дублей при одновременных нажатиях, повтор после неудачи, зависшие, адреса для автоочистки.
 * Только изолированная локальная база (scripts/marketing-test-db.mjs, MARKETING_LOCAL_PG=1); DATABASE_URL не читается.
 */
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { userInfo } from "node:os";
import postgres from "postgres";
import { PgRepo } from "./repo-pg";
import { designs, PRICES } from "@/templates/registry";
import type { Sql } from "@/lib/db";

vi.mock("next/font/local", () => ({ default: () => ({ variable: "fixture-font" }) }));
const native = process.env.MARKETING_LOCAL_PG === "1";
let sql: Sql, repo: PgRepo;
const opts = {
  host: "127.0.0.1",
  port: 55437,
  username: userInfo().username,
  database: "inviteizi_task7",
  ssl: false as const,
  prepare: false,
  onnotice: () => {},
  types: { bigint: { to: 20, from: [20], serialize: String, parse: Number } },
};
beforeAll(async () => {
  if (!native) return;
  sql = postgres({ ...opts, max: 4 }) as unknown as Sql;
  expect((await sql`select current_setting('inviteizi.local_fixture',true) as m`)[0].m).toBe("on");
  const d = designs.find((x) => x.format === "animated")!;
  await sql`insert into public.templates(id,number,occasion,format,price) values(${d.id},${d.number},${d.occasion},${d.format},${PRICES[d.format]}) on conflict do nothing`;
  repo = new PgRepo(sql);
});
afterAll(async () => {
  if (sql) await sql.end();
});

it.skipIf(!native)("order_renders: сохранение, одновременные нажатия видео — одна очередь, повтор после неудачи, зависшие, адреса", async () => {
  const d = designs.find((x) => x.format === "animated")!;
  await repo.touchUser({ id: 990001, username: null, firstName: "К" });
  const o = await repo.createOrder({
    userId: 990001,
    occasion: d.occasion,
    format: d.format,
    templateId: d.id,
    data: d.sample,
    music: { kind: "none" },
    amount: 7990,
    slugBase: "renders-pg",
  });
  expect(await repo.getRender(o.id, "story")).toBeNull();
  const saved = await repo.saveRender(o.id, "story", { status: "done", url: "https://a.public.blob.vercel-storage.com/keepsake/x/a.png", telegramFileId: "TG1" });
  expect(saved).toMatchObject({ orderId: o.id, kind: "story", status: "done", telegramFileId: "TG1" });
  // частичное обновление не стирает остальное
  expect(await repo.saveRender(o.id, "story", { telegramFileId: "TG2" })).toMatchObject({ url: saved.url, telegramFileId: "TG2", status: "done" });
  // 5 одновременных нажатий «🎬 Видео» → ровно одно fresh
  const claims = await Promise.all(Array.from({ length: 5 }, () => repo.claimRender(o.id, "video")));
  expect(claims.filter((c) => c.fresh)).toHaveLength(1);
  await repo.saveRender(o.id, "video", { status: "failed", attempts: 2, error: "x".repeat(400) });
  expect((await repo.getRender(o.id, "video"))!.error).toHaveLength(300);
  const again = await repo.claimRender(o.id, "video");
  expect(again).toMatchObject({ fresh: true, record: { status: "queued", attempts: 0, error: null } });
  // зависшие и адреса для автоочистки
  expect((await repo.listRenders({ stuckBefore: new Date(Date.now() + 60_000) })).map((r) => r.kind)).toContain("video");
  expect((await repo.listRenders({ stuckBefore: new Date(Date.now() - 60_000) })).some((r) => r.orderId === o.id)).toBe(false);
  expect((await repo.listRenders({ withUrl: true, orderId: o.id })).map((r) => r.kind)).toEqual(["story"]);
  // неверный вид файла база не примет
  await expect(sql`insert into public.order_renders(order_id,kind) values(${o.id},'gif')`).rejects.toThrow();
});

it.skipIf(!native)("listMusic на PostgreSQL: песни без файла скрыты, никоҳ берёт подходящие мелодии других тадбиров (≥ 3)", async () => {
  const site = (id: string) => `https://inviteizi.vercel.app/audio/originals/${id}.mp3`;
  for (const [id, occ] of [
    ["inviteizi-sunnat-oilaviy-shodlik", "sunnat"],
    ["inviteizi-yubiley-diydor", "yubiley"],
    ["inviteizi-sunnat-mehr-rishtasi", "sunnat"],
    ["inviteizi-sunnat-qutlug-qadam", "sunnat"],
  ] as const)
    await sql`insert into public.music(id,title_uz,title_ru,file_url,sort,is_active,occasion) values(${id},'t','t',${site(id)},100,true,${occ}) on conflict (id) do nothing`;
  await sql`insert into public.music(id,title_uz,title_ru,file_url,sort,is_active,occasion) values('nikoh-dead','t','t','https://x.supabase.co/storage/v1/object/public/music/nikoh/a.mp3',1,true,'nikoh') on conflict (id) do nothing`;
  const nikoh = (await repo.listMusic("nikoh")).map((m) => m.id);
  expect(nikoh).not.toContain("nikoh-dead");
  expect(nikoh).toEqual(expect.arrayContaining(["inviteizi-sunnat-oilaviy-shodlik", "inviteizi-yubiley-diydor", "inviteizi-sunnat-mehr-rishtasi"]));
  expect(nikoh).not.toContain("inviteizi-sunnat-qutlug-qadam");
  expect((await repo.listMusic("sunnat")).every((m) => m.occasion === "sunnat")).toBe(true);
});

it.skipIf(!native)("этап 3: оплаченный заказ оптовика забирает клиент (ref wholesale); обычная ссылка оплаченный не отдаёт", async () => {
  const { WHOLESALE_REF } = await import("./repo");
  const { createHash } = await import("node:crypto");
  const d = designs.find((x) => x.format === "animated")!;
  const h = (t: string) => createHash("sha256").update(t).digest("hex");
  for (const id of [990101, 990102, 990103]) await repo.touchUser({ id, username: null, firstName: "К" });
  const mk = async (slug: string) => {
    const o = await repo.createOrder({ userId: 990101, occasion: d.occasion, format: d.format, templateId: d.id, data: d.sample, music: { kind: "none" }, amount: 6390, slugBase: slug });
    await sql`update public.orders set status = 'active', paid_at = now() where id = ${o.id}`;
    return o;
  };
  const a = await mk("ws-paid");
  await repo.issueClientOrder({ orderId: a.id, createdBy: 990101, tokenHash: h("tok-a"), refSource: WHOLESALE_REF });
  expect(await repo.claimClientOrder(h("tok-a"), 990102, new Date())).toMatchObject({ status: "claimed" });
  expect((await repo.getOrder(a.id))!.userId).toBe(990102);
  expect((await repo.claimClientOrder(h("tok-a"), 990103, new Date())).status).toBe("used");
  const b = await mk("ws-plain");
  await repo.issueClientOrder({ orderId: b.id, createdBy: 990101, tokenHash: h("tok-b"), refSource: null });
  expect((await repo.claimClientOrder(h("tok-b"), 990102, new Date())).status).toBe("closed");
  expect((await repo.getOrder(b.id))!.userId).toBe(990101);
});
