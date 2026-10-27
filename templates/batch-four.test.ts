import {describe,it,expect} from "vitest";
import sharp from "sharp";
import {activeDesigns,ACCEPTED,designs,getDesign,longSample,PRICES} from "./registry";
import {t} from "@/texts/uz-cyrl";
import {Sim} from "@/bot/testing/sim";
import {startUz} from "@/bot/testing/paths";
import {uz} from "@/texts/bot-uz";

const batch=[
  ["oq-chinni","nahorgi","simple",77],
  ["doppicha","sunnat","simple",78],
  ["sayram-hovli","sunnat","scroll",79],
  ["zarvaraq","yubiley","simple",80],
  ["umr-daraxti","yubiley","scroll",81],
] as const;

describe("batch four: exactly five new complete designs",()=>{
  it("preserves previous accepted designs and fills five empty category/format cells",()=>{
    const previous=activeDesigns().filter(d=>d.number<=81);
    expect(previous).toHaveLength(25);expect(designs.filter(d=>d.number<=81)).toHaveLength(26);expect(ACCEPTED.has("anor-bogi")).toBe(false);
    expect(previous.filter(d=>d.number>76).map(d=>d.id).sort()).toEqual(batch.map(([id])=>id).sort());
    for(const [o,counts] of [["nikoh",[4,1,6]],["nahorgi",[1,2,4]],["sunnat",[1,1,2]],["yubiley",[1,1,1]]] as const)
      expect(["simple","scroll","animated"].map(f=>previous.filter(d=>d.occasion===o&&d.format===f).length)).toEqual(counts);
  });
  for(const [id,occasion,format,number] of batch){
    it(`${id}: accepted identity, covers/OG and genuinely difficult sample data`,async()=>{
      const d=getDesign(id)!;
      expect(d).toMatchObject({occasion,format,number,withPhoto:false});expect(ACCEPTED.has(id)).toBe(true);
      expect(t.designs[id]).toMatch(/[ўқғҳа-я]/i);
      expect(longSample(d).events).toHaveLength(3);
      expect(longSample(d).person!.length).toBeGreaterThan(10);
      expect(longSample(d).events.every(e=>e.location&&e.venueName&&e.address)).toBe(true);
      expect((await sharp(`public${d.cover}`).metadata())).toMatchObject({width:1080,height:1920,format:"webp"});
      expect((await sharp(`public/covers/${id}.jpg`).metadata())).toMatchObject({width:1080,height:1920,format:"jpeg"});
      expect((await sharp(`public/og/${id}.jpg`).metadata())).toMatchObject({width:420,height:620,format:"jpeg"});
    });
    it(`${id}: existing bot catalog selects the right component and price`,async()=>{
      const s=new Sim();await startUz(s,17);await s.click(17,uz.category[occasion]);await s.click(17,new RegExp(uz.format.names[format]));
      expect(s.last(17).media).toContain(`/covers/${id}.jpg`);
      expect(s.lastText(17)).toContain(uz.format.names[format]);expect(s.lastText(17)).toContain(t.price(PRICES[format]));
      await s.click(17,uz.catalog.buy);
      expect(await s.user(17)).toMatchObject({step:"person",state:{templateId:id,format,occasion}});
    });
  }
});
