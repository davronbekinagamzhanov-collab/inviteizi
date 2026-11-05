import {it,expect,vi} from "vitest";
import {FORMATS,PRICES,getDesign} from "@/templates/registry";
import {uz} from "@/texts/bot-uz";
import {pageMode,invitationData} from "@/lib/orders";
import type {Repo} from "../repo";
import {Sim,ADMIN} from "./sim";
import {nikohToReview} from "./paths";

/** Same bot/payment assertions against MemoryRepo and an isolated SQL Repo. */
export function formatFlowContract(make:()=>{sim:Sim;repo:Repo},base:number){
  for(const [i,format] of FORMATS.entries())it(`${format}: create, edit, demo, receipt, confirm once, analytics and paid guard`,async()=>{
    vi.stubEnv("ADMIN_IDS",String(ADMIN));vi.stubEnv("OWNER_TELEGRAM_ID",String(ADMIN));
    const {sim:s,repo}=make(),id=base+i;
    await nikohToReview(s,id,undefined,format);
    // v2: слова формата клиент не видит — только цена (и «Бот танлади» в заголовке сводки)
    expect(s.lastText(id)).not.toContain(uz.format.names[format]);
    expect(s.lastText(id)).toContain(PRICES[format].toLocaleString("ru-RU").replace(/\u00a0/g," "));
    await s.click(id,uz.review.confirm);
    const [o]=await repo.listOrdersByUser(id);
    expect(o).toMatchObject({format,amount:PRICES[format],status:"preview"});
    expect(getDesign(o.templateId)?.format).toBe(format);
    expect(pageMode(o,o.createdAt)).toBe("demo");
    expect(pageMode(o,new Date(+o.createdAt+86400000))).toBe("expired");
    await s.callback(id,`edit:${o.number}`,1);
    await s.click(id,uz.review.editNames);await s.text(id,"Янги исм");await s.text(id,"Мадина");
    await s.click(id,uz.review.confirm);
    expect(await repo.getOrder(o.id)).toMatchObject({format,amount:o.amount,slug:o.slug,data:{groom:"Янги исм"}});
    const before=await repo.analytics(ADMIN,"all",s.clock);
    await s.callback(id,`pay:${o.number}`,1);await s.photo(id,"format-receipt");
    expect((await repo.getOrder(o.id))?.status).toBe("receipt_sent");
    await s.callback(ADMIN,`ok:${o.number}`,1);await s.callback(ADMIN,`ok:${o.number}`,1);
    const paid=(await repo.getOrder(o.id))!;
    expect(paid).toMatchObject({format,amount:o.amount,slug:o.slug,status:"active"});
    expect(pageMode(paid,s.clock)).toBe("full");
    expect(invitationData(paid).groom).toBe("Янги исм");
    await repo.updateOrder(o.id,{slug:`format-paid-${id}`});
    expect(await repo.resolveSlug(o.slug)).toBe(`format-paid-${id}`);
    expect((await repo.getOrderBySlug(`format-paid-${id}`))?.id).toBe(o.id);
    await s.callback(id,`edit:${o.number}`,1);
    expect(s.lastText(id)).toBe(uz.order.closed);
    expect(await repo.getOrder(o.id)).toMatchObject({format,amount:o.amount});
    const after=await repo.analytics(ADMIN,"all",s.clock);
    expect(after.revenue-before.revenue).toBe(o.amount);
    expect((after.formats.find(f=>f.id===format)?.revenue??0)-(before.formats.find(f=>f.id===format)?.revenue??0)).toBe(o.amount);
  });
}
