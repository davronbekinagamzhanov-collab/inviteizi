import {afterEach,describe,it,expect,vi} from "vitest";
import {FORMATS,PRICES,getDesign} from "@/templates/registry";
import * as registry from "@/templates/registry";
import {formatFlowContract} from "./testing/formats.contract";
import {Sim,ADMIN} from "./testing/sim";
import {nikohOrder,startUz,startRu} from "./testing/paths";
import {uz} from "@/texts/bot-uz";
import {ru} from "@/texts/bot-ru";
import {designsFor,formatsFor} from "./flow/util";
import {buttonLabels} from "./testing/fake-tg";

afterEach(()=>{vi.unstubAllEnvs();vi.restoreAllMocks();});
describe("three invitation formats",()=>{
  formatFlowContract(()=>{const sim=new Sim();return{sim,repo:sim.repo};},740001);
  it.each(["uz","ru"] as const)("%s: all three choices show registry prices and correct catalogs",async lang=>{
    const s=new Sim(),tx=lang==="uz"?uz:ru;
    await(lang==="uz"?startUz:startRu)(s,1);await s.click(1,tx.category.nikoh);
    expect(buttonLabels(s.last(1))).toEqual(expect.arrayContaining(FORMATS.map(f=>tx.format[f](`${PRICES[f].toLocaleString("ru-RU").replace(/\u00a0/g," ")} ₸`))));
    await s.click(1,new RegExp(tx.format.names.scroll));
    expect(s.last(1).media).toContain(`${designsFor("nikoh","scroll")[0].id}.jpg`);
    expect(s.lastText(1)).toContain("6 000 ₸");
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
    await s.callback(3,`pay:${o.number}`,1);expect(s.lastText(3)).toContain("6 543 ₸");
    await s.photo(3,"old-quote");await s.callback(ADMIN,`ok:${o.number}`,1);
    expect(await s.repo.getOrder(o.id)).toMatchObject({format:"simple",amount:6543,slug:o.slug,status:"active"});
    const metrics=await s.repo.analytics(ADMIN,"all",s.clock);
    expect(metrics.formats.find(f=>f.id==="simple")?.revenue).toBe(6543);
    expect(metrics.formats.some(f=>f.id==="scroll")).toBe(false);
  });
  it.each(["buy","next","prev"])("old empty Simple catalog callback %s returns format selection",async value=>{
    // Batch four fills this former gap; keep exercising an empty offer explicitly.
    const active=registry.activeDesigns();
    vi.spyOn(registry,"activeDesigns").mockReturnValue(active.filter(d=>d.occasion!=="nahorgi"||d.format!=="simple"));
    const s=new Sim();await startUz(s,4);
    await s.repo.saveStep(4,"catalog",{q:50,occasion:"nahorgi",format:"simple",catIdx:0});
    await s.callback(4,`a:50:${value}`,1);
    expect((await s.user(4))?.step).toBe("fmt");expect(s.lastText(4)).toContain(uz.format.ask);
    expect(formatsFor("nahorgi")).not.toContain("simple");expect(formatsFor("nahorgi")).toContain("scroll");
  });
  it("an old catalog index never silently selects a different design after tariff changes",async()=>{
    // Каталог до чистки 03.11: там у никоҳ/Оддий было 5+ дизайнов, индекс 4 существовал
    vi.spyOn(registry,"activeDesigns").mockImplementation(()=>registry.everAccepted().sort((a,b)=>registry.catalogPosition(a)-registry.catalogPosition(b)));
    const s=new Sim();await startUz(s,5);
    await s.repo.saveStep(5,"catalog",{q:50,occasion:"nikoh",format:"simple",catIdx:4});
    await s.callback(5,"a:50:buy",1);
    expect((await s.user(5))?.step).toBe("catalog");
    expect(s.last(5).media).toContain(`${designsFor("nikoh","simple")[0].id}.jpg`);
    expect(await s.repo.listOrdersByUser(5)).toEqual([]);
    await s.click(5,uz.catalog.buy);expect((await s.user(5))?.step).toBe("groom");
  });
  it("dashboard labels and ranking sections include all three formats",async()=>{
    const s=new Sim();
    for(const [i,f] of FORMATS.entries()){
      const o=await nikohOrder(s,100+i,undefined,f);
      await s.callback(100+i,`pay:${o.number}`,1);await s.photo(100+i,"dashboard-format");await s.callback(ADMIN,`ok:${o.number}`,1);
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
