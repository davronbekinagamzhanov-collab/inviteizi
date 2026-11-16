import { coverVersioned } from "@/lib/cover-version";
import {useHistoricalCatalog} from './testing/historical';
import {describe,it,expect} from "vitest";
import {Sim} from "./testing/sim";
import {startUz,startRu} from "./testing/paths";
import {uz} from "@/texts/bot-uz";
import {ru} from "@/texts/bot-ru";
import {photoAttributions} from "@/texts/uz-cyrl";
import {catalogList,PAGE} from "./flow/steps-order";

describe("catalog photo attribution",()=>{
  useHistoricalCatalog(); // подписи фото проверяем на старых дизайнах (скрыты 03.11, заказы на них живы)
  for(const lang of ["uz","ru"] as const)it(`${lang}: keeps photo author/source when paging, without stale credits on another page`,async()=>{
    const sim=new Sim();await (lang==="uz"?startUz:startRu)(sim,1);
    const tx=lang==="uz"?uz:ru;
    await sim.click(1,tx.category.nahorgi);
    const list=catalogList({s:{occasion:"nahorgi"}});
    const pageOf=(i:number)=>Math.floor(i/PAGE);
    const credited=list.findIndex(d=>photoAttributions[d.id]);
    expect(credited).toBeGreaterThanOrEqual(0);
    const bare=list.findIndex((_,i)=>!list.slice(pageOf(i)*PAGE,pageOf(i)*PAGE+PAGE).some(d=>photoAttributions[d.id]));
    expect(bare).toBeGreaterThanOrEqual(0);
    const credit=photoAttributions[list[credited].id]!;
    const go=async(page:number)=>{for(let k=0;k<Math.ceil(list.length/PAGE)&&(((await sim.user(1))!.state as {catIdx?:number}).catIdx??0)!==page*PAGE;k++)await sim.click(1,"▶");};
    await go(pageOf(credited));
    expect(sim.tg.to(1).some(m=>m.media===`https://inviteizi.vercel.app${coverVersioned(`/covers/${list[credited].id}.jpg`)}`)).toBe(true);
    expect(sim.lastText(1)).toContain(tx.catalog.photoCredit(credit.author,credit.license,credit.source));
    await go(pageOf(bare));
    expect(sim.lastText(1)).not.toContain(credit.author);
    await go(pageOf(credited));
    expect(sim.lastText(1)).toContain(credit.source);
  });
});
