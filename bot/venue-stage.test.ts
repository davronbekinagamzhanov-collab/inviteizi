import {describe,it,expect,vi,afterEach} from "vitest";
import {Sim,ADMIN} from "./testing/sim";
import {startUz,nikohOrder} from "./testing/paths";
import {uz} from "@/texts/bot-uz";
import {ru} from "@/texts/bot-ru";
import {VENUES,venuePickerUrl} from "./venues";
import {inlineButtons} from "./testing/fake-tg";
import {invitationData,pageMode} from "@/lib/orders";
import {normalizeUpdate} from "./update";
import {env} from "@/lib/env";
afterEach(()=>vi.unstubAllEnvs());

const event={kind:"nikohBazm",date:"2026-11-14",time:"18:00",venueName:"Тўйхона",address:"Сайрам"};
async function atLocation(events:unknown[]=[event],ev=0){
  const s=new Sim();await startUz(s,1);
  await s.repo.saveStep(1,"evLoc",{q:11,occasion:"nikoh",ev,data:{occasion:"nikoh",groom:"Азиз",bride:"Мадина",hosts:"Оила",events}});
  return s;
}
describe("location skip regressions",()=>{
  it("valid skip completes the event without a map",async()=>{
    const s=await atLocation();await s.text(1,uz.event.skip);
    expect((await s.user(1))?.step).toBe("more");expect(s.lastText(1)).not.toBe(uz.error);
  });
  it("a persisted null hole between events does not crash skip or discard completed events",async()=>{
    const s=await atLocation([event,null,{...event,kind:"nahorgi",time:"06:00"}],2);
    await s.text(1,uz.event.skip);
    expect(s.lastText(1)).not.toBe(uz.error);expect((await s.user(1))?.step).toBe("more");
    expect((await s.user(1))?.state).toMatchObject({data:{events:[event,{...event,kind:"nahorgi",time:"06:00"}]}});
    await s.click(1,uz.back);expect((await s.user(1))?.state).toMatchObject({ev:1});await s.click(1,uz.event.skip);
    expect((await s.user(1))?.state).toMatchObject({data:{events:[event,{...event,kind:"nahorgi",time:"06:00"}]}});
  });
});

async function atVenue(){
  const s=new Sim();await startUz(s,1);await s.click(1,uz.category.nikoh);await s.click(1,/Анимацияли/);await s.click(1,uz.catalog.buy);
  await s.text(1,"Азиз");await s.text(1,"Мадина");await s.click(1,"Фарзандларимиз");await s.text(1,"Куёвлар оиласи");
  await s.click(1,uz.form.sideYes);await s.text(1,"Келинлар оиласи");await s.click(1,"14");await s.click(1,"18:00");return s;
}
async function choose(s:Sim,i:number){
  await s.click(1,uz.event.readyVenues);if(i>=5)await s.click(1,"▶");
  const p=VENUES[i],m=s.tg.to(1).findLast(m=>m.text.includes(`${p.name}\n${p.address}`))!;
  expect(inlineButtons(m)).toContainEqual({text:`🗺 ${p.name}`,url:p.mapUrl});
  const b=inlineButtons(m).find(b=>"data" in b&&b.data.endsWith("venue:"+p.id))!;if(!("data" in b))throw Error("missing choice");
  await s.callback(1,b.data,m.id);return{m,b};
}
describe("owner catalog and independent place entry",()=>{
  it.each(VENUES.map((_,i)=>i))("owner place %i preserves the exact name, address and URL without coordinates",async i=>{
    const s=await atVenue(),{m,b}=await choose(s,i),p=VENUES[i];
    expect((await s.user(1))?.state).toMatchObject({data:{events:[{venueName:p.name,address:p.address,mapUrl:p.mapUrl}]}});
    expect(JSON.stringify((await s.user(1))?.state)).not.toContain('"location"');
    expect((await s.user(1))?.step).toBe("more");
    const before=JSON.stringify((await s.user(1))?.state);await s.callback(1,b.data,m.id);expect(JSON.stringify((await s.user(1))?.state)).toBe(before);
    expect(s.tg.answers.at(-1)?.text).toBe(uz.oldButton);
  });
  it("catalog pagination does not trap Back; other cities remain supported",async()=>{
    const s=await atVenue();await s.click(1,uz.event.readyVenues);await s.click(1,"▶");await s.click(1,uz.back);
    expect((await s.user(1))?.step).toBe("evVenue");await s.click(1,uz.event.manualChoice);await s.text(1,"Алматыдағы үй");await s.text(1,"Алматы, бошқа манзил");
    expect((await s.user(1))?.step).toBe("evLoc");await s.click(1,uz.event.linkChoice);await s.text(1,"https://maps.app.goo.gl/fixture-place");
    expect((await s.user(1))?.state).toMatchObject({data:{events:[{venueName:"Алматыдағы үй",address:"Алматы, бошқа манзил",mapUrl:"https://maps.app.goo.gl/fixture-place"}]}});
  });
  it("native Telegram venue messages save user-selected coordinates and place details",async()=>{
    const s=await atVenue();await s.click(1,uz.event.mapChoice);
    expect(JSON.stringify(s.last(1).markup)).not.toContain('"location":true');
    await s.send({kind:"venue",from:s.from(1),chatId:1,messageId:999,title:"Native place",address:"User selected address",lat:42.3,lng:69.7});
    expect((await s.user(1))?.state).toMatchObject({data:{events:[{venueName:"Native place",address:"User selected address",location:{lat:42.3,lng:69.7}}]}});
  });
  it("skip without required place fields asks for them instead of claiming success",async()=>{
    const s=await atVenue();await s.click(1,uz.event.skip);expect((await s.user(1))?.step).toBe("evVenueName");
    await s.text(1,"Хонадон");await s.text(1,"Бошқа шаҳар");await s.click(1,uz.event.skip);expect((await s.user(1))?.step).toBe("more");
  });
  it("manual replacement from an existing review asks for a fresh address and removes the old map",async()=>{
    const s=new Sim(),o=await nikohOrder(s,1);await s.callback(1,`edit:${o.number}`,1);
    await s.click(1,uz.review.editEvent(1,"Никоҳ базми"));await s.click(1,uz.review.evLocation);await s.click(1,uz.event.manualChoice);
    await s.text(1,"Новый зал");expect((await s.user(1))?.step).toBe("evAddress");
    await s.text(1,"Другой город, новый адрес");expect((await s.user(1))?.step).toBe("evLoc");await s.click(1,uz.event.skip);await s.click(1,uz.review.confirm);
    const e=(await s.repo.getOrder(o.id))!.data.events[0];expect(e).toMatchObject({venueName:"Новый зал",address:"Другой город, новый адрес"});expect(e.mapUrl).toBeUndefined();expect(e.location).toBeUndefined();
  });
  it("Back cancels an incomplete manual replacement without changing the previous event",async()=>{
    const s=new Sim(),o=await nikohOrder(s,1);await s.callback(1,`edit:${o.number}`,1);
    await s.click(1,uz.review.editEvent(1,"Никоҳ базми"));await s.click(1,uz.review.evLocation);await s.click(1,uz.event.manualChoice);
    await s.text(1,"Не сохранено");await s.click(1,uz.back);
    expect((await s.user(1))?.state).toMatchObject({data:{events:o.data.events}});expect((await s.user(1))?.state.venueNameInput).toBeUndefined();
  });
  it("wrong map domains and coordinates do not complete or damage an event",async()=>{
    const s=await atLocation();await s.text(1,"https://2gis.kz.evil.invalid/place");expect((await s.user(1))?.step).toBe("evLoc");
    await s.location(1,NaN,190);expect((await s.user(1))?.step).toBe("evLoc");
    expect((await s.user(1))?.state).toMatchObject({data:{events:[event]}});
  });
  it("catalog choices survive multiple events, saving, demo and full invitation data",async()=>{
    const s=await atVenue();await choose(s,0);await s.click(1,uz.event.addNahorgi);await s.click(1,uz.event.sameDayYes);await choose(s,6);
    await s.click(1,uz.event.noMore);await s.click(1,uz.text.pick(1));await s.click(1,uz.music.none);await s.click(1,uz.rsvp.no);await s.click(1,uz.review.confirm);
    const [o]=await s.repo.listOrdersByUser(1);
    expect(o.data.events).toHaveLength(2);expect(o.data.events.map(e=>e.mapUrl)).toEqual([VENUES[0].mapUrl,VENUES[6].mapUrl]);
    expect(o.data.sides).toEqual({groom:"Куёвлар оиласи",bride:"Келинлар оиласи"});
    expect(invitationData(o).sides).toEqual(o.data.sides);expect(pageMode(o,s.clock)).toBe("demo");
    await s.callback(1,`pay:${o.number}`,1);await s.photo(1,"receipt");await s.callback(ADMIN,`ok:${o.number}`,1);
    const paid=(await s.repo.getOrder(o.id))!;expect(pageMode(paid,s.clock)).toBe("full");expect(invitationData(paid).sides).toEqual(o.data.sides);
  });
  it("optional map picker is restricted to the existing HTTPS origin",()=>{
    expect(venuePickerUrl(undefined,"https://site.invalid")).toBeUndefined();
    expect(venuePickerUrl("https://site.invalid/venues/map","https://site.invalid")).toBe("https://site.invalid/venues/map");
    for(const u of ["http://site.invalid/map","https://evil.invalid/map","https://site.invalid/map?token=secret","https://user:pass@site.invalid/map"])
      expect(venuePickerUrl(u,"https://site.invalid")).toBeUndefined();
  });
  it("Telegram venue normalization retains details, not just the pin",()=>{
    const u=normalizeUpdate({update_id:1,message:{message_id:1,date:1,chat:{id:1,type:"private",first_name:"Test"},from:{id:1,is_bot:false,first_name:"Test"},venue:{title:"Venue",address:"Address",location:{latitude:42.3,longitude:69.7}}}});
    expect(u).toMatchObject({kind:"venue",title:"Venue",address:"Address",lat:42.3,lng:69.7});
  });
});
describe("optional payment card and immutable existing amounts",()=>{
  it("a stale new draft cannot buy an Animated template at the Simple price",async()=>{
    const s=await atLocation(),u=(await s.user(1))!;
    await s.repo.saveStep(1,"review",{...u.state,q:200,format:"simple",templateId:"oltin-monogramma"});
    await s.callback(1,"a:200:ok",1);
    expect(await s.repo.listOrdersByUser(1)).toHaveLength(0);expect((await s.user(1))?.step).toBe("fmt");
    expect((await s.user(1))?.state).toMatchObject({data:{groom:"Азиз",bride:"Мадина",events:[event]}});
  });
  it("a forged template ID cannot upgrade a cheap saved format",async()=>{
    const s=new Sim(),o=await nikohOrder(s,1,undefined,"simple");
    await s.repo.saveStep(1,"review",{q:200,orderId:o.id,occasion:o.occasion,format:o.format,templateId:"oltin-monogramma",data:o.data,music:o.music});
    await s.callback(1,"a:200:ok",1);
    expect(await s.repo.getOrder(o.id)).toMatchObject({templateId:o.templateId,format:o.format,amount:o.amount});
  });
  it("PAYMENT_CARD_NUMBER is optional, trimmed, and contains no built-in real number",()=>{
    vi.stubEnv("PAYMENT_CARD_NUMBER","");expect(env.paymentCardNumber()).toBeUndefined();
    vi.stubEnv("PAYMENT_CARD_NUMBER","   ");expect(env.paymentCardNumber()).toBeUndefined();
    vi.stubEnv("PAYMENT_CARD_NUMBER"," 0000 0000 0000 0000 ");expect(env.paymentCardNumber()).toBe("0000 0000 0000 0000");
  });
  it.each(["uz","ru"] as const)("%s: phone works with and without a card; amount and confirmation remain idempotent",async lang=>{
    const s=new Sim(),o=await nikohOrder(s,1),tx=lang==="uz"?uz:ru;await s.repo.setLang(1,lang);
    await s.callback(1,`pay:${o.number}`,1);expect(s.lastText(1)).toContain(s.deps.env.kaspiPhone);expect(s.lastText(1)).not.toContain("undefined");
    s.deps.env.paymentCardNumber="0000 0000 0000 0000";await s.callback(1,`pay:${o.number}`,1);
    expect(s.lastText(1)).toContain(tx.pay.card("0000 0000 0000 0000"));expect(inlineButtons(s.last(1))).toContainEqual({text:tx.pay.copyCard,copy:"0000 0000 0000 0000"});
    expect(inlineButtons(s.last(1))).toContainEqual({text:tx.pay.copy,copy:s.deps.env.kaspiPhone.replace(/[^\d+]/g,"")});
    await s.photo(1,"receipt");await s.callback(ADMIN,`ok:${o.number}`,1);await s.callback(ADMIN,`ok:${o.number}`,1);
    expect((await s.repo.analytics(ADMIN,"all",s.clock)).revenue).toBe(o.amount);
  });
  it("changing tariff or design cannot reprice a saved order, then paid edits remain closed",async()=>{
    const s=new Sim(),o=await nikohOrder(s,1);await s.repo.updateOrder(o.id,{amount:10000});
    await s.callback(1,`edit:${o.number}`,1);await s.click(1,uz.review.editDesign);await s.click(1,"▶");await s.click(1,uz.catalog.buy);
    expect(s.lastText(1)).toContain("10 000 ₸");await s.click(1,uz.review.confirm);
    expect(await s.repo.getOrder(o.id)).toMatchObject({format:"animated",amount:10000,slug:o.slug});
    await s.callback(1,`pay:${o.number}`,1);expect(s.lastText(1)).toContain("10 000 ₸");await s.photo(1,"receipt");await s.callback(ADMIN,`ok:${o.number}`,1);await s.callback(1,`edit:${o.number}`,1);
    expect(s.lastText(1)).toBe(uz.order.closed);expect(await s.repo.getOrder(o.id)).toMatchObject({amount:10000,format:"animated"});
  });
});
