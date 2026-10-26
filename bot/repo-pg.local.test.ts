import {formatFlowContract} from "./testing/formats.contract";
import {Sim} from "./testing/sim";
/** Isolated wire-protocol integration. Never reads DATABASE_URL or any production credentials. */
import { beforeAll, afterAll, describe, it, expect, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import postgres from "postgres";
import { readFile, writeFile } from "node:fs/promises";
import { PgRepo } from "./repo-pg";
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
