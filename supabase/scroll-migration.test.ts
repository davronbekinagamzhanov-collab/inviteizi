/** Isolated PGlite SQL regression, not native PostgreSQL or production. */
import {PGlite} from "@electric-sql/pglite";
import {readFile} from "node:fs/promises";
import {it,expect} from "vitest";
import {designs,PRICES} from "@/templates/registry";

it("new format checks accept Scroll, reject unknown formats and preserve old paid snapshots",async()=>{
  const pg=new PGlite();
  try{
    await pg.exec("create role anon;create role authenticated;create role inviteizi_server;");
    for(const name of ["20261023180530_schema.sql","20261024031409_slug_reserved_dev.sql","20261024120000_slug_history.sql","20261024150000_music_occasion.sql","20261025120000_analytics_favorites.sql"])
      await pg.exec(await readFile(`supabase/migrations/${name}`,"utf8"));
    await pg.exec("insert into public.users(id) values(1);insert into public.templates(id,number,occasion,format,price) values('shohona-baxmal',70,'nikoh','simple',7000);insert into public.orders(user_id,occasion,format,template_id,status,slug,amount) values(1,'nikoh','simple','shohona-baxmal','active','legacy-paid',4321);");
    await expect(pg.exec("insert into public.templates(id,number,occasion,format,price) values('scroll-before',999,'nikoh','scroll',8000)")).rejects.toMatchObject({code:"23514"});
    await pg.exec(await readFile("supabase/migrations/20261026120000_scroll_format.sql","utf8"));
    // Same metadata upsert as seed-templates: changes templates only.
    for(const d of designs)await pg.query("insert into public.templates(id,number,occasion,format,price) values($1,$2,$3,$4,$5) on conflict(id) do update set format=excluded.format,price=excluded.price",[d.id,d.number,d.occasion,d.format,PRICES[d.format]]);
    expect((await pg.query("select format,price from public.templates where id='shohona-baxmal'")).rows).toEqual([{format:"scroll",price:PRICES.scroll}]);
    expect((await pg.query("select format,amount,status,slug from public.orders where slug='legacy-paid'")).rows).toEqual([{format:"simple",amount:4321,status:"active",slug:"legacy-paid"}]);
    await pg.exec("insert into public.orders(user_id,occasion,format,template_id,slug,amount) values(1,'nikoh','scroll','shohona-baxmal','scroll-new',8000)");
    await expect(pg.exec("insert into public.templates(id,number,occasion,format,price) values('invalid',999,'nikoh','video',8000)")).rejects.toMatchObject({code:"23514"});
    await expect(pg.exec("insert into public.orders(user_id,occasion,format,template_id,slug,amount) values(1,'nikoh','video','shohona-baxmal','invalid-order',8000)")).rejects.toMatchObject({code:"23514"});
  }finally{await pg.close();}
},30000);
