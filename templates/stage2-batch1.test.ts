import {describe,it,expect,vi} from "vitest";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {getDesign,longSample} from "./registry";
import {mapLink} from "@/lib/map-link";
import {t} from "@/texts/uz-cyrl";
import {VENUES} from "@/bot/venues";
vi.mock("next/font/local",()=>({default:()=>({variable:"test-font"})}));
const cases=[['zarhal-lavha','yubiley','animated'],['adras-nishon','sunnat','simple'],['mis-kafgir','nahorgi','simple'],['rayhon-sahari','nahorgi','scroll'],['visol-rishta','nikoh','animated'],['uzum-hovli','nikoh','scroll'],['sopol-navo','nikoh','scroll'],['girih-nur','nikoh','animated'],['siyoh-duo','nikoh','animated'],['kabutar-salom','nikoh','animated']] as const;
describe("stage 2 real invitation components",()=>{
  for(const [id,occasion,format] of cases)for(const long of [false,true])for(const mode of ["demo","full"] as const)it(`${id} ${long?'long':'normal'} ${mode}: all supplied fields and venue URLs`,async()=>{
    const d=getDesign(id)!;expect(d).toMatchObject({occasion,format,withPhoto:false});
    const {default:Design}=await d.load(),source=structuredClone(long?longSample(d):d.sample);
    // The owner's actual catalog shape, with no inferred coordinates; maps must preserve it exactly.
    for(const [i,e] of source.events.entries()){const p=VENUES[i];Object.assign(e,{venueName:p.name,address:p.address,mapUrl:p.mapUrl});delete e.location;}
    const data={...source,noMusic:true};
    const html=renderToStaticMarkup(createElement(Design,{data,mode})),plain=html.replace(/<[^>]*>/g,"").replace(/&#x27;/g,"'").replace(/\s+/g," ");
    for(const value of [data.person,data.groom,data.bride,data.hosts,data.sides?.groom,data.sides?.bride].filter(Boolean))expect(plain).toContain(value);
    if(data.age!=null)expect(plain).toContain(String(data.age));
    for(const e of data.events){expect(plain).toContain(e.venueName);expect(plain).toContain(e.address);expect(plain).toContain(t.date.clock(e.time));expect(html).toContain(mapLink(e));}
    if(d.number>=92)for(const e of data.events){const [y,m,day]=e.date.split('-').map(Number);expect(plain).toContain(t.date.long(day,m-1,y));}
    if(data.sides){expect(plain).toContain(t.sides.groom);expect(plain).toContain(t.sides.bride);}
    expect(html.includes('data-open=')).toBe(format==='animated');
    expect(plain.includes('НАМУНА')).toBe(mode==='demo');expect(html.match(/data-event=/g)).toHaveLength(data.events.length);
  });
});
