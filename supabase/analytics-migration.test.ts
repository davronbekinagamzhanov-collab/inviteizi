import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { beforeAll, afterAll, it, expect } from "vitest";
const pg = new PGlite();
beforeAll(async () => {
  await pg.exec("create role anon; create role authenticated; create role inviteizi_server;");
  for (const name of ["20261023180530_schema.sql", "20261024150000_music_occasion.sql", "20261025120000_analytics_favorites.sql"]) {
    await pg.exec(await readFile(`supabase/migrations/${name}`,"utf8"));
  }
  await pg.exec(`insert into public.users(id) values(1);
    insert into public.templates(id,number,occasion,format,price) values('oq-ot',31,'sunnat','animated',10000);
    insert into public.music(id,title_uz,title_ru,file_url,is_active) values('hidden','Яширин','Скрытый','',false);
    set role inviteizi_server;`);
}, 30000);
afterAll(async () => pg.close());
it("analytics trigger accepts music identifiers supported by the existing music/order schema",async()=>{
  const musicId="legacy-"+"track".repeat(30);
  await pg.query("insert into public.music(id,title_uz,title_ru,file_url) values($1,'Fixture','Fixture','https://fixture.invalid/music.mp3')",[musicId]);
  await pg.query("insert into public.orders(user_id,occasion,format,template_id,music_kind,music_id,slug,amount,status) values(1,'sunnat','animated','oq-ot','list',$1,'long-music-id',10000,'preview')",[musicId]);
  const rows=await pg.query<{target:string}>("select target from public.analytics_events where kind='music_selected' and target=$1",[musicId]);
  expect(rows.rows).toHaveLength(1);expect(rows.rows[0].target).toBe(musicId);
});
it("migration installs on the actual base schema; financial events are transactional and idempotent", async () => {
  const ownEvents=(kind:string)=>pg.query("select target from public.analytics_events where kind=$1 and dedupe_key=$2",[kind,"00000000-0000-4000-8000-000000000001"]);
  await pg.exec(`insert into public.orders(id,user_id,occasion,format,template_id,music_kind,music_id,slug,amount,status)
    values('00000000-0000-4000-8000-000000000001',1,'sunnat','animated','oq-ot','list','hidden','test',10000,'preview');
    update public.orders set status='receipt_sent' where slug='test';`);
  expect((await ownEvents("payment_confirmed")).rows).toHaveLength(0);
  await pg.exec(`update public.orders set status='active', paid_at=now() where slug='test' and status='receipt_sent';
    update public.orders set status='active', paid_at=now() where slug='test' and status='receipt_sent';
    update public.orders set status='archived' where slug='test';`);
  expect((await ownEvents("payment_confirmed")).rows).toHaveLength(1);
  expect((await ownEvents("order_created")).rows).toHaveLength(1);
  expect((await ownEvents("music_selected")).rows).toEqual([{target:"hidden"}]);
});
it("favorite constraints and event keys reject duplicates with the production conflict clauses", async () => {
  for(let i=0;i<2;i++) await pg.exec(`insert into public.design_favorites(user_id,template_id) values(1,'oq-ot') on conflict do nothing;
    insert into public.analytics_events(kind,user_id,target,dedupe_key) values('design_favorited',1,'oq-ot','oq-ot') on conflict do nothing;`);
  expect((await pg.query("select * from public.design_favorites")).rows).toHaveLength(1);
  expect((await pg.query("select * from public.analytics_events where kind='design_favorited'")).rows).toHaveLength(1);
});
it("public database roles cannot read analytics, favorites or tracking config", async () => {
  await pg.exec("reset role; set role anon;");
  for (const table of ["analytics_config","analytics_events","design_favorites"]) await expect(pg.query(`select * from public.${table}`)).rejects.toThrow(/permission denied/);
  await pg.exec("reset role; set role authenticated;");
  await expect(pg.query("select * from public.analytics_events")).rejects.toThrow(/permission denied/);
  await pg.exec("reset role; set role inviteizi_server;");
});
