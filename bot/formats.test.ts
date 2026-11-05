import {afterEach,describe,it,expect,vi} from "vitest";
import {FORMATS,PRICES,getDesign} from "@/templates/registry";
import * as registry from "@/templates/registry";
import {formatFlowContract} from "./testing/formats.contract";
import {Sim,ADMIN} from "./testing/sim";
import {nikohOrder,pickDesign,startUz,startRu} from "./testing/paths";
import {catalogList,PAGE} from "./flow/steps-order";
import {uz} from "@/texts/bot-uz";
import {ru} from "@/texts/bot-ru";

afterEach(()=>{vi.unstubAllEnvs();vi.restoreAllMocks();});
describe("three invitation formats",()=>{
  formatFlowContract(()=>{const sim=new Sim();return{sim,repo:sim.repo};},740001);
  it.each(["uz","ru"] as const)("%s: каталог одним списком — у каждого дизайна цена из реестра, есть все три цены, слов формата нет",async lang=>{
    const s=new Sim(),tx=lang==="uz"?uz:ru;
    await(lang==="uz"?startUz:startRu)(s,1);await s.click(1,tx.category.nikoh);
    const list=catalogList({s:{occasion:"nikoh"}});
    const seen=new Set<number>();
    for(let page=0;page<Math.ceil(list.length/PAGE);page++){
      const text=s.lastText(1);
      for(const d of list.slice(page*PAGE,page*PAGE+PAGE)){
        const line=text.split("\n").find(l=>l.includes(`№${d.number} `))!;
        expect(line,d.id).toContain(`${PRICES[d.format].toLocaleString("ru-RU").replace(/\u00a0/g," ")} ₸`);
        seen.add(PRICES[d.format]);
      }
      for(const f of FORMATS)expect(text).not.toContain(tx.format.names[f]);
      await s.click(1,"▶");
    }
    expect([...seen].sort()).toEqual(FORMATS.map(f=>PRICES[f]).sort());
  });
  it.each(FORMATS)("saved orders reject a forged %s format change without repricing",async format=>{
    const s=new Sim(),o=await nikohOrder(s,2);
    await s.repo.saveStep(2,"review",{q:200,orderId:o.id,occasion:o.occasion,templateId:o.templateId,format,data:o.data,music:o.music});
    await s.callback(2,"a:200:ok",1);
    expect(await s.repo.getOrder(o.id)).toMatchObject({format:o.format,amount:o.amount,slug:o.slug});
    if(format!==o.format)expect(s.tg.to(2).some(m=>m.text===uz.order.formatLocked)).toBe(true);
  });

  it("old Simple quote survives registry reclassification, edit and payment",async()=>{
    const s=new Sim(),o=await nikohOrder(s,3);
    await s.repo.updateOrder(o.id,{format:"simple",templateId:"shohona-baxmal",amount:6543});
    expect(getDesign("shohona-baxmal")?.format).toBe("scroll");
    await s.callback(3,`edit:${o.number}`,1);expect(s.lastText(3)).toContain("6 543 ₸");
    await s.click(3,uz.review.editNames);await s.text(3,"Эски тариф");await s.text(3,"Мадина");await s.click(3,uz.review.confirm);
    await s.callback(3,`payok:${o.number}`,1);expect(s.lastText(3)).toContain("6 543 ₸");
    await s.photo(3,"old-quote");await s.callback(ADMIN,`ok:${o.number}`,1);
    expect(await s.repo.getOrder(o.id)).toMatchObject({format:"simple",amount:6543,slug:o.slug,status:"active"});
    const metrics=await s.repo.analytics(ADMIN,"all",s.clock);
    expect(metrics.formats.find(f=>f.id==="simple")?.revenue).toBe(6543);
    expect(metrics.formats.some(f=>f.id==="scroll")).toBe(false);
  });
  it("черновик, застрявший на старом шаге «формат», после обновления сразу видит каталог",async()=>{
    const s=new Sim();await startUz(s,4);
    await s.repo.saveStep(4,"fmt",{q:50,occasion:"nahorgi",catIdx:0});
    await s.callback(4,"a:50:simple",1);
    expect((await s.user(4))?.step).toBe("catalog");expect(s.lastText(4)).toContain(uz.catalog.pageTitle.split("\n")[0]);
    await pickDesign(s,4);expect((await s.user(4))?.step).toBe("person");
  });
  it("пустой каталог тадбира возвращает к выбору тадбира, а не ломается",async()=>{
    vi.spyOn(registry,"activeDesigns").mockReturnValue(registry.activeDesigns().filter(d=>d.occasion!=="nahorgi"));
    const s=new Sim();await startUz(s,6);await s.click(6,uz.category.nahorgi);
    expect((await s.user(6))?.step).toBe("cat");expect(s.lastText(6)).toBe(uz.category.ask);
  });
  it("старая кнопка «Сотиб олиш» по индексу не покупает другой дизайн",async()=>{
    const s=new Sim();await startUz(s,5);
    await s.repo.saveStep(5,"catalog",{q:50,occasion:"nikoh",format:"simple",catIdx:4});
    await s.callback(5,"a:50:buy",1);
    expect(await s.repo.listOrdersByUser(5)).toEqual([]);
    expect((await s.user(5))?.step).toBe("catalog");
    await pickDesign(s,5);expect((await s.user(5))?.step).toBe("groom");
  });
  it("dashboard labels and ranking sections include all three formats",async()=>{
    const s=new Sim();
    for(const [i,f] of FORMATS.entries()){
      const o=await nikohOrder(s,100+i,undefined,f);
      await s.callback(100+i,`payok:${o.number}`,1);await s.photo(100+i,"dashboard-format");await s.callback(ADMIN,`ok:${o.number}`,1);
    }
    await s.start(ADMIN);await s.click(ADMIN,uz.langUz);await s.command(ADMIN,"dashboard");
    const screen=s.last(ADMIN);
    await s.callback(ADMIN,"dash:designs:all",screen.id);
    for(const f of FORMATS)expect(screen.text).toContain(`${uz.format.names[f]}: 1`);
    await s.callback(ADMIN,"dash:revenue:all",screen.id);
    for(const f of FORMATS)expect(screen.text).toContain(uz.format.names[f]);
    expect(s.tg.to(ADMIN).some(m=>m.text?.includes("undefined"))).toBe(false);
  });
});
