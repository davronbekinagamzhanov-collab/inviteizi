/** Existing main schema only: no analytics migration, no production credentials. */
import {beforeAll,afterAll,afterEach,describe,it,expect,vi} from "vitest";
import {PGlite} from "@electric-sql/pglite";
import {PGLiteSocketServer} from "@electric-sql/pglite-socket";
import postgres from "postgres";
import {readFile} from "node:fs/promises";
import {PgRepo} from "./repo-pg";
import type {Sql} from "@/lib/db";
import {designs,PRICES} from "@/templates/registry";
import {Sim,ADMIN} from "./testing/sim";
import { startUz, nikohToReview, pickDesign } from "./testing/paths";
import {uz} from "@/texts/bot-uz";
import {pageMode,invitationData} from "@/lib/orders";

describe.skipIf(process.env.INVITEIZI_LOCAL_PG!=="1")("compatibility with main before analytics migration",()=>{
  let pg:PGlite,server:PGLiteSocketServer,sql:Sql,repo:PgRepo;
  beforeAll(async()=>{
    pg=new PGlite();
    await pg.exec("create role anon; create role authenticated; create role inviteizi_server;");
    for(const file of ["20261023180530_schema.sql","20261024031409_slug_reserved_dev.sql","20261024120000_slug_history.sql","20261024150000_music_occasion.sql"])await pg.exec(await readFile(`supabase/migrations/${file}`,"utf8"));
    for(const name of ["20261103120000_rsvp_flag.sql","20261104090000_design_version.sql"])await pg.exec(await readFile(`supabase/migrations/${name}`,"utf8"));
    for(const d of designs)await pg.query("insert into public.templates(id,number,occasion,format,price) values($1,$2,$3,$4,$5)",[d.id,d.number,d.occasion,d.format==="scroll"?"simple":d.format,PRICES[d.format==="scroll"?"simple":d.format]]);
    server=new PGLiteSocketServer({db:pg,host:"127.0.0.1",port:0,maxConnections:1});await server.start();
    sql=postgres({host:"127.0.0.1",port:Number(server.getServerConn().split(":").at(-1)),username:"postgres",password:"postgres",database:"postgres",ssl:false,max:1,prepare:false,connect_timeout:5,onnotice:()=>{},types:{bigint:{to:20,from:[20],serialize:String,parse:Number}}});
    await sql`set role inviteizi_server`;repo=new PgRepo(sql);
  },30000);
  afterEach(()=>vi.unstubAllEnvs());
  afterAll(async()=>{if(sql)await sql.end({timeout:2});if(server)await server.stop();if(pg)await pg.close();});
  const sim=()=>{const s=new Sim();s.deps.repo=repo;return s;};

  it("buy still enters the existing form when analytics_events does not exist",async()=>{
    const s=sim();await startUz(s,720001);await s.click(720001,uz.category.nikoh);await pickDesign(s, 720001, "animated");
    expect((await repo.getUser(720001))?.step).toBe("groom");
    expect(s.lastText(720001)).toBe(uz.form.groom);
  });
  it("missing can_analytics denies an ungranted admin without throwing; explicit grants still work",async()=>{
    vi.stubEnv("ADMIN_IDS",String(ADMIN));vi.stubEnv("OWNER_TELEGRAM_ID","");vi.stubEnv("ANALYTICS_ADMIN_IDS","");
    expect(await repo.canAnalyze(ADMIN)).toBe(false);
    vi.stubEnv("ANALYTICS_ADMIN_IDS",String(ADMIN));expect(await repo.canAnalyze(ADMIN)).toBe(true);
    vi.stubEnv("OWNER_TELEGRAM_ID",String(ADMIN));expect(await repo.canAnalyze(ADMIN)).toBe(true);
  });
  it("the existing complete form creates one priced order without analytics migration",async()=>{
    const s=sim();await nikohToReview(s,720004);await s.click(720004,uz.review.confirm);
    const orders=await repo.listOrdersByUser(720004);
    expect(orders).toHaveLength(1);expect(orders[0].amount).toBe(PRICES.animated);
    expect(orders[0].data.groom).toBe("Азиз");expect(orders[0].data.events).toHaveLength(1);
    expect((await repo.getUser(720004))?.step).toBe("idle");
  });
  it("reads an old SQL order, preserves its price/music and redirects its historical slug",async()=>{
    await sql`insert into public.users(id,lang) values(720002,'uz')`;
    await sql`insert into public.orders(user_id,occasion,format,template_id,status,groom,bride,hosts,music_kind,music_file_id,music_url,slug,amount)
      values(720002,'nikoh','animated','ganch-peshtoq','active','Старое имя','Келин','Оила','own','old-file','https://fixture.invalid/old.mp3','compat-old-paid',4321)`;
    const o=(await repo.getOrderBySlug("compat-old-paid"))!;
    expect(o.amount).toBe(4321);expect(o.data.groom).toBe("Старое имя");
    expect(pageMode(o,new Date("2026-12-01"))).toBe("full");expect(invitationData(o).musicUrl).toBe("https://fixture.invalid/old.mp3");
    await repo.updateOrder(o.id,{slug:"compat-paid-current"});
    expect(await repo.resolveSlug("compat-old-paid")).toBe("compat-paid-current");
    expect((await repo.getOrderBySlug("compat-paid-current"))?.id).toBe(o.id);
  });
  it("legacy pay/receipt/ok callbacks confirm once without analytics tables or a repriced order",async()=>{
    vi.stubEnv("ADMIN_IDS",String(ADMIN));
    const s=sim();await repo.touchUser({id:720003});await repo.setLang(720003,"uz");
    const o=await repo.createOrder({userId:720003,occasion:"nikoh",format:"animated",templateId:"ganch-peshtoq",data:{occasion:"nikoh",groom:"Азиз",bride:"Мадина",hosts:"Оила",events:[]},music:{kind:"none"},amount:4321,slugBase:"compat-payment",status:"preview"});
    const before=(await repo.stats(s.clock)).revenue.total;
    await s.callback(720003,`pay:${o.number}`,1);await s.photo(720003,"fixture-receipt");
    expect((await repo.getOrder(o.id))?.status).toBe("receipt_sent");
    await s.callback(ADMIN,`ok:${o.number}`,1);await s.callback(ADMIN,`ok:${o.number}`,1);
    expect((await repo.getOrder(o.id))?.status).toBe("active");
    expect((await repo.getOrder(o.id))?.slug).toBe(o.slug);
    expect((await repo.stats(s.clock)).revenue.total-before).toBe(4321);
  });
});
