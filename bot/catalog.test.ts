import {describe,it,expect} from "vitest";
import {Sim} from "./testing/sim";
import {startUz,startRu} from "./testing/paths";
import {uz} from "@/texts/bot-uz";
import {ru} from "@/texts/bot-ru";
import {photoAttributions} from "@/texts/uz-cyrl";

describe("catalog photo attribution",()=>{
  for(const lang of ["uz","ru"] as const)it(`${lang}: keeps photo author/source when paging, without stale credits on another design`,async()=>{
    const sim=new Sim();await (lang==="uz"?startUz:startRu)(sim,1);
    const tx=lang==="uz"?uz:ru;
    await sim.click(1,tx.category.nahorgi);await sim.click(1,new RegExp(tx.format.names.scroll));
    const credit=photoAttributions["tonggi-choy"]!;
    // первый — натуральный пилот (подпись авторов фото — на самой странице), дальше tonggi-choy
    expect(sim.last(1).media).toContain("/covers/tong-dasturxon.jpg");
    await sim.click(1,"▶");
    expect(sim.last(1).media).toContain("/covers/tonggi-choy.jpg");
    expect(sim.lastText(1)).toContain(tx.catalog.photoCredit(credit.author,credit.license,credit.source));
    await sim.click(1,"▶");
    expect(sim.last(1).media).toContain("/covers/paxta-gul.jpg");
    expect(sim.lastText(1)).not.toContain(credit.author);
    await sim.click(1,"◀");
    expect(sim.lastText(1)).toContain(credit.source);
  });
});
