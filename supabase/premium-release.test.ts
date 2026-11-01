import {describe,it,expect} from 'vitest';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import original from '@/docs/reviews/final/original-catalog.json';
const file=(name:string)=>readFile(name,'utf8');
async function fixture(){const pg=new PGlite();await pg.exec('create role anon; create role authenticated; create role inviteizi_server;');for(const name of ['20261023180530_schema.sql','20261024031409_slug_reserved_dev.sql','20261024120000_slug_history.sql','20261024150000_music_occasion.sql','20261025120000_analytics_favorites.sql','20261026120000_scroll_format.sql'])await pg.exec(await file('supabase/migrations/'+name));for(const d of original)await pg.query('insert into public.templates(id,number,occasion,format,price,is_active) values($1,$2,$3,$4,$5,$6)',[d.id,d.number,d.occasion,d.format,d.price,d.is_active]);return pg}
describe('owner-only additive premium release SQL',()=>{
 it('adds six identities twice without changing any original row or order',async()=>{const pg=await fixture();try{
  await pg.exec("insert into public.users(id) values(991);insert into public.orders(user_id,occasion,format,template_id,status,hosts,slug,amount) values(991,'nikoh','animated','kabutar-salom','active','Оила','existing-paid',4321);");
  const before=(await pg.query('select * from public.templates order by id')).rows;const paid=(await pg.query('select to_jsonb(o) as data from public.orders o')).rows;
  const migration=await file('supabase/migrations/20261104090000_design_version.sql');await pg.exec(migration);await pg.exec(migration);
  expect((await pg.query('select (to_jsonb(o) - \'design_version\') as data from public.orders o')).rows).toEqual(paid);
  expect((await pg.query('select design_version from public.orders')).rows).toEqual([{design_version:null}]);
  const sql=await file('supabase/release/premium-six-templates.sql');await pg.exec(sql);await pg.exec(sql);
  expect((await pg.query('select * from public.templates where number <= 106 order by id')).rows).toEqual(before);
  expect((await pg.query('select count(*)::int as n from public.templates where is_active')).rows).toEqual([{n:56}]);
  expect((await pg.query("select amount,status,slug from public.orders")).rows).toEqual([{amount:4321,status:'active',slug:'existing-paid'}]);
 }finally{await pg.close()}},20000);
 it('fails closed on an externally reserved number with zero partial inserts',async()=>{const pg=await fixture();try{await pg.exec("insert into public.templates(id,number,occasion,format,price) values('externally-reserved',107,'sunnat','animated',8000)");await expect(pg.exec(await file('supabase/release/premium-six-templates.sql'))).rejects.toThrow(/identity\/number conflict/);await pg.exec('rollback');expect((await pg.query('select count(*)::int as n from public.templates')).rows).toEqual([{n:52}]);expect((await pg.query("select id from public.templates where id='sunnat-muqova'")).rows).toHaveLength(0)}finally{await pg.close()}},20000);
 it('adds twelve original tracks idempotently and retains unknown active music',async()=>{const pg=await fixture();try{await pg.exec("insert into public.music(id,title_uz,title_ru,file_url,is_active,occasion) values('existing-unmounted','Эски куй','Старая мелодия','https://fixture.invalid/existing.mp3',true,'sunnat')");const before=(await pg.query("select * from public.music where id='existing-unmounted'")).rows;const sql=await file('supabase/release/original-music-after-deploy.sql');await pg.exec(sql);await pg.exec(sql);expect((await pg.query("select * from public.music where id='existing-unmounted'")).rows).toEqual(before);expect((await pg.query("select occasion,count(*)::int as n from public.music where id like 'inviteizi-%' group by occasion order by occasion")).rows).toEqual([{occasion:'sunnat',n:6},{occasion:'yubiley',n:6}]);}finally{await pg.close()}},20000);
});
