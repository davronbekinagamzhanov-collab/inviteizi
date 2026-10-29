import {nikohToReview} from "./testing/paths";
import {uz} from "@/texts/bot-uz";
import {formatFlowContract} from "./testing/formats.contract";
import {Sim} from "./testing/sim";
/** Isolated wire-protocol integration. Never reads DATABASE_URL or any production credentials. */
import { beforeAll, afterAll, describe, it, expect, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import postgres from "postgres";
import { readFile, writeFile } from "node:fs/promises";
import { PgRepo } from "./repo-pg";
import { execFileSync } from "node:child_process";
import ts from "typescript";
import { isReservedSlug } from "@/lib/slug";
import { env } from "@/lib/env";
import { repoContract } from "./repo.contract";
import { designs,PRICES } from "@/templates/registry";
import type { Sql } from "@/lib/db";

describe.skipIf(process.env.INVITEIZI_LOCAL_PG !== "1")("PgRepo through isolated PGlite PostgreSQL protocol",()=>{
  let pg:PGlite,server:PGLiteSocketServer,sql:Sql,repo:PgRepo;
  const loadResults: {clients:number;ms:number;revenueDelta:number}[]=[];
  beforeAll(async()=>{
    pg=new PGlite();
    await pg.exec("create role anon; create role authenticated; create role inviteizi_server;");
    for(const name of ["20261023180530_schema.sql","20261024031409_slug_reserved_dev.sql","20261024120000_slug_history.sql","20261024150000_music_occasion.sql","20261025120000_analytics_favorites.sql","20261026120000_scroll_format.sql"]) await pg.exec(await readFile(`supabase/migrations/${name}`,"utf8"));
    for(const d of designs) await pg.query("insert into public.templates(id,number,occasion,format,price) values($1,$2,$3,$4,$5)",[d.id,d.number,d.occasion,d.format,PRICES[d.format]]);
    await pg.exec("insert into public.music(id,title_uz,title_ru,file_url) values('yor-yor','Ёр-ёр','Ёр-ёр','https://fixture.invalid/music.mp3');");
    server=new PGLiteSocketServer({db:pg,host:"127.0.0.1",port:0,maxConnections:1});
    await server.start();
    const port=Number(server.getServerConn().split(":").at(-1));
    sql=postgres({host:"127.0.0.1",port,username:"postgres",password:"postgres",database:"postgres",ssl:false,max:1,prepare:false,connect_timeout:5,onnotice:()=>{},types:{bigint:{to:20,from:[20],serialize:String,parse:Number}}});
    await sql`set role inviteizi_server`;
    repo=new PgRepo(sql);
  },30000);
  afterAll(async()=>{if(sql)await sql.end({timeout:2});if(server)await server.stop();if(pg)await pg.close();vi.unstubAllEnvs();if(process.env.INVITEIZI_WRITE_REPORTS==="1")await writeFile("docs/reviews/2026-10-25-pg-local-load.json",JSON.stringify({scope:"PgRepo + postgres.js + loopback + PGlite; one connection; not native multi-backend PostgreSQL or production throughput",loadResults},null,2)+"\n");});
  it("venue stage: SQL roundtrip preserves both families and owner place fields",async()=>{
    const sim=new Sim();sim.deps.repo=repo;
    await nikohToReview(sim,760001);await sim.click(760001,uz.review.editSides);await sim.click(760001,uz.form.sideYes);await sim.text(760001,"Юсуповлар оиласи");
    await sim.click(760001,uz.review.editEvent(1,"Никоҳ базми"));await sim.click(760001,uz.review.evLocation);await sim.click(760001,uz.event.readyVenues);await sim.click(760001,"✅ Nayryz");await sim.click(760001,uz.review.confirm);
    const [o]=await repo.listOrdersByUser(760001);
    expect(o.data.sides).toEqual({groom:"Каримовлар оиласи",bride:"Юсуповлар оиласи"});
    expect(o.data.events[0]).toMatchObject({venueName:"Nayryz",address:"Ибрагим Ата, 174",mapUrl:"https://go.2gis.com/JReZD"});
    expect((await repo.getOrderBySlug(o.slug))?.data).toEqual(o.data);
  });
  it("release: pinned main SQL code operates on future schema without changing saved prices",async()=>{
    const root=process.cwd().replaceAll("\\","/");
    const source=execFileSync("git",["-c",`safe.directory=${root}`,"show","ab5eb2ee1925e75a733e7a186fe510f28d9b85c7:bot/repo-pg.ts"],{encoding:"utf8"});
    const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
    const exported:{PgRepo?:typeof PgRepo}={};
    // Execute only the pinned repository SQL adapter; a default/production DB connection is forbidden.
    new Function("require","exports",js)((id:string)=>{
      if(id==="@/lib/db")return {db:()=>{throw Error("Explicit isolated SQL required");}};
      if(id==="@/lib/env")return {env};
      if(id==="@/lib/slug")return {isReservedSlug};
      throw Error("Unexpected baseline dependency");
    },exported);
    const old=new exported.PgRepo!(sql);
    const userId=890000001;await old.touchUser({id:userId});
    const data={occasion:"nikoh" as const,groom:"Азиз",bride:"Мадина",hosts:"Оила",events:[]};
    const historical=await old.createOrder({userId,occasion:"nikoh",format:"simple",templateId:"sapfir",data,music:{kind:"none"},amount:4321,slugBase:"release-old-main",status:"preview"});
    await old.transition(historical.id,["preview"],"receipt_sent");
    expect(await old.transition(historical.id,["receipt_sent"],"active",{paidAt:new Date()})).not.toBeNull();
    expect(await old.transition(historical.id,["receipt_sent"],"active",{paidAt:new Date()})).toBeNull();
    expect(await repo.getOrder(historical.id)).toMatchObject({amount:4321,format:"simple",slug:historical.slug,status:"active"});
    const events=await sql`select kind from public.analytics_events where kind='payment_confirmed' and dedupe_key=${historical.id}`;
    expect(events).toHaveLength(1);
    const scroll=await repo.createOrder({userId,occasion:"nikoh",format:"scroll",templateId:"shohona-baxmal",data,music:{kind:"none"},amount:PRICES.scroll,slugBase:"release-new-scroll",status:"active"});
    expect(await old.getOrder(scroll.id)).toMatchObject({amount:6000,format:"scroll",slug:scroll.slug,status:"active"});
    // This proves SQL read compatibility, not that the old renderer knows every new template ID.
  });
  it("venue stage: SQL saved quote rejects format changes and counts payment once",async()=>{
    vi.stubEnv("ADMIN_IDS","500");vi.stubEnv("OWNER_TELEGRAM_ID","500");
    const sim=new Sim();sim.deps.repo=repo;await nikohToReview(sim,760002);await sim.click(760002,uz.review.confirm);const [o]=await repo.listOrdersByUser(760002);
    await repo.updateOrder(o.id,{amount:10000});await sim.callback(760002,`edit:${o.number}`,1);await sim.click(760002,uz.review.editDesign);await sim.click(760002,"▶");await sim.click(760002,uz.catalog.buy);await sim.click(760002,uz.review.confirm);
    expect(await repo.getOrder(o.id)).toMatchObject({amount:10000,format:"animated"});
    await repo.saveStep(760002,"review",{q:200,orderId:o.id,occasion:o.occasion,format:"simple",templateId:"sapfir",data:o.data,music:o.music});await sim.callback(760002,"a:200:ok",1);
    expect(await repo.getOrder(o.id)).toMatchObject({format:"animated",amount:10000});
    const before=(await repo.analytics(500,"all",sim.clock)).revenue;
    await sim.callback(760002,`pay:${o.number}`,1);await sim.photo(760002,"receipt");await sim.callback(500,`ok:${o.number}`,1);await sim.callback(500,`ok:${o.number}`,1);
    expect(await repo.getOrder(o.id)).toMatchObject({amount:10000,format:"animated",status:"active",slug:o.slug});
    expect((await repo.analytics(500,"all",sim.clock)).revenue-before).toBe(10000);
  });
  it("venue stage: SQL JSON null holes are normalized without losing completed events",async()=>{
    const sim=new Sim();sim.deps.repo=repo;const id=760003;
    await repo.touchUser({id});await repo.setLang(id,"uz");const e={kind:"nikohBazm",date:"2026-11-14",time:"18:00",venueName:"Fixture",address:"Address"};
    await repo.saveStep(id,"evLoc",{q:10,occasion:"nikoh",ev:2,data:{occasion:"nikoh",groom:"Азиз",bride:"Мадина",hosts:"Оила",events:[e,null,{...e,kind:"nahorgi",time:"06:00"}]}});
    await sim.text(id,uz.event.skip);expect((await repo.getUser(id))?.step).toBe("more");
    expect((await repo.getUser(id))?.state).toMatchObject({ev:1,data:{events:[e,{...e,kind:"nahorgi",time:"06:00"}]}});
  });
  repoContract(async()=>repo);
  formatFlowContract(()=>{const sim=new Sim();sim.deps.repo=repo;return{sim,repo};},750001);
  it("failed draft insert rolls back question; repeated confirmation inserts exactly one order",async()=>{
    const userId=80000001;
    await repo.touchUser({id:userId});await repo.saveStep(userId,"review",{q:10});
    const order={userId,occasion:"sunnat" as const,format:"animated" as const,templateId:"missing-template",data:{occasion:"sunnat" as const,hosts:"Fixture",events:[]},music:{kind:"none" as const},amount:10000,slugBase:"local-atomic",status:"preview" as const};
    await expect(repo.createOrderFromDraft(order,10)).rejects.toMatchObject({code:"23503"});
    expect((await repo.getUser(userId))?.state.q).toBe(10);
    const attempts=await Promise.all([repo.createOrderFromDraft({...order,templateId:"oq-ot"},10),repo.createOrderFromDraft({...order,templateId:"oq-ot"},10)]);
    expect(attempts.filter(Boolean)).toHaveLength(1);
    expect(await repo.listOrdersByUser(userId)).toHaveLength(1);
    expect((await repo.getUser(userId))?.step).toBe("idle");
  });
  it("runs actual analytics snapshot SQL and idempotent favorites",async()=>{
    vi.stubEnv("OWNER_TELEGRAM_ID","989898");
    await repo.setFavorite(80000001,"oq-ot",true);await repo.setFavorite(80000001,"oq-ot",true);
    expect(await repo.listFavorites(80000001)).toEqual(["oq-ot"]);
    const report=await repo.analytics(989898,"all",new Date(Date.now()+1000),true);
    expect(report.designs.find(d=>d.id==="oq-ot")?.favorites).toBe(1);
    await expect(repo.analytics(80000001,"all",new Date(),true)).rejects.toThrow("access denied");
  });
  it("favorites ordering matches the shared contract and repeat add keeps its creation time",async()=>{
    await repo.touchUser({id:80000002});
    await sql`insert into public.design_favorites(user_id,template_id,created_at) values
      (80000002,'oq-ot','2020-01-01T00:00:00Z'),(80000002,'ganch-peshtoq','2020-01-01T00:00:01Z')`;
    expect(await repo.listFavorites(80000002)).toEqual(["ganch-peshtoq","oq-ot"]);
    await repo.setFavorite(80000002,"oq-ot",true);
    expect(await repo.listFavorites(80000002)).toEqual(["ganch-peshtoq","oq-ot"]);
    await repo.setFavorite(80000002,"oq-ot",false);await repo.setFavorite(80000002,"oq-ot",true);
    expect(await repo.listFavorites(80000002)).toEqual(["oq-ot","ganch-peshtoq"]);
  });
  it("private analytics uses the existing SQL projection for custom dates and zero dimensions",async()=>{
    vi.stubEnv("OWNER_TELEGRAM_ID","989898");
    const now=new Date(Date.now()+3600000);
    const report=await repo.analytics(989898,"date=2020-01-01..2020-01-02",now);
    expect(report.categories.map(c=>c.id)).toEqual(["nikoh","nahorgi","sunnat","yubiley"]);
    expect(report.formats.map(f=>f.id)).toEqual(["simple","scroll","animated"]);
    expect(report.revenue).toBe(0);expect(report.details).toEqual([]);
    await expect(repo.analytics(80000001,"date=2020-01-01",now)).rejects.toThrow("access denied");
    const all=await repo.analytics(989898,"all",now);
    expect(all.categories.reduce((n,c)=>n+c.revenue,0)).toBe(all.revenue);
    expect(all.formats.reduce((n,f)=>n+f.paid,0)).toBe(all.paid);
    expect(all.details.every(o=>!Object.hasOwn(o,"userId"))).toBe(true);
  });
  it.each([100,1000])("%i isolated SQL customers preserve orders, money and favorites under queued retries",async n=>{
    vi.stubEnv("OWNER_TELEGRAM_ID","989898");
    const start=performance.now(),base=81000000+n*10;
    const before=await repo.analytics(989898,"all",new Date(Date.now()+3600000));
    await sql`insert into public.users(id,step,state) select ${base}+i,'review','{"q":1}'::jsonb from generate_series(1,${n}) i`;
    await Promise.all(Array.from({length:n},async(_,i)=>{
      const userId=base+i+1;
      const order={userId,occasion:"sunnat" as const,format:"animated" as const,templateId:"oq-ot",data:{occasion:"sunnat" as const,hosts:"Fixture",events:[]},music:{kind:"none" as const},amount:10000,slugBase:`sql-load-${userId}`,status:"preview" as const};
      const attempts=await Promise.all([repo.createOrderFromDraft(order,1),repo.createOrderFromDraft(order,1)]);
      expect(attempts.filter(Boolean)).toHaveLength(1);
      const created=attempts.find(Boolean)!;
      await repo.transition(created.id,["preview"],"receipt_sent");
      const paid=await Promise.all([repo.transition(created.id,["receipt_sent"],"active",{paidAt:new Date()}),repo.transition(created.id,["receipt_sent"],"active",{paidAt:new Date()})]);
      expect(paid.filter(Boolean)).toHaveLength(1);
      await repo.setFavorite(userId,"oq-ot",true);await repo.setFavorite(userId,"oq-ot",true);
    }));
    const after=await repo.analytics(989898,"all",new Date(Date.now()+3600000));
    expect(after.orders-before.orders).toBe(n);expect(after.paid-before.paid).toBe(n);expect(after.revenue-before.revenue).toBe(n*10000);
    const result={clients:n,ms:Math.round(performance.now()-start),revenueDelta:after.revenue-before.revenue};
    loadResults.push(result);console.log(JSON.stringify(result));
  },60000);
});
