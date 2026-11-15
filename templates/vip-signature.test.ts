import {describe,it,expect,vi} from "vitest";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {existsSync} from "node:fs";
import {ACCEPTED,activeDesigns,getDesign,PRICES} from "./registry";
import {signatureIds,signaturePhotos,weddingEvent} from "./themes/vip-signature/model";
import {longSamples} from "@/lib/samples";
import {parseWeddingDate} from "@/lib/wedding-date";

vi.mock("next/font/local",()=>({default:()=>({variable:"test-font"})}));
const photos=["https://example.com/one.webp","https://example.com/two.webp","https://example.com/three.webp"];
const order={"vip-visol-nuri":["hero","greeting","date","memory","venue","closing"],"vip-zarrin-ahd":["hero","venue","greeting","date","program","memory","closing"]};
describe("two independent signature weddings",()=>{
 it("has three coherent local defaults per design and independent customer replacement",()=>{
  for(const id of signatureIds){
   const defaults=signaturePhotos({},id);expect(defaults).toHaveLength(3);
   defaults.forEach(p=>{expect(p.src).toBe(`/vip/${id}/${p.slot}.webp`);expect(existsSync('public'+p.src)).toBe(true);});
   expect(signaturePhotos({photos:[...photos,"https://example.com/four.webp"]},id).map(x=>x.src)).toEqual(photos);
   const partial=signaturePhotos({photos:[photos[0]]},id);expect(partial[0].client).toBe(true);expect(partial.slice(1).map(x=>x.src)).toEqual(defaults.slice(1).map(x=>x.src));
  }
 });
 it("uses the real wedding reception for first orientation while retaining morning events",()=>{
  const program=longSamples.nikoh.events.map(event=>({...event,title:event.kind,when:parseWeddingDate(event.date,event.time),mapHref:"https://2gis.kz/"}));
  expect(weddingEvent({program,main:program[0]}).kind).toBe("nikohBazm");
  expect(weddingEvent({program:[program[0]],main:program[0]})).toBe(program[0]);
 });
 it("does not change the accepted catalogue, format prices, or older VIP entries",()=>{
  expect(activeDesigns()).toHaveLength(36);expect(PRICES).toEqual({animated:8000,scroll:6000,simple:5000});
  for(const id of signatureIds){expect(ACCEPTED.has(id)).toBe(false);expect(getDesign(id)?.clientPhotos).toBe(true);}
  for(const id of ["vip-tilla-muhr","vip-osmon","vip-suzana","vip-marvarid","vip-bogi-visol","vip-oq-tulpor","vip-umr-ziyosi"])expect(getDesign(id)).toBeDefined();
 });
});
for(const id of signatureIds)describe(id,()=>{
 it("renders its distinct section order, Latin monograms, three photos and every actual map once",async()=>{
  const d=getDesign(id)!;const {default:Design}=await d.load();
  const html=renderToStaticMarkup(createElement(Design,{data:{...d.sample,photos,noMusic:true},mode:"full"}));
  expect([...html.matchAll(/data-vip-section="([^"]+)"/g)].map(x=>x[1])).toEqual(order[id]);
  expect(html).toContain('aria-label="A M"');expect(html).toContain('data-signature-opening=');
  expect((html.match(/data-vip-photo-slot=/g)??[])).toHaveLength(3);
  photos.forEach(src=>expect((html.split(`src="${src}"`).length-1)).toBe(1));
  expect((html.match(/href="https:\/\/2gis.kz\/geo\//g)??[])).toHaveLength(d.sample.events.length);
  for(const ev of d.sample.events){expect(html).toContain(ev.venueName);expect(html).toContain(ev.address);expect(html).toContain(ev.time);}
  expect(html).not.toMatch(/hall-[12]|data-vip-sheet|dress.code/i);
 });
 it("retains long names, all three event times and maps, plus the supplied custom text",async()=>{
  const d=getDesign(id)!;const {default:Design}=await d.load();
  const data={...longSamples.nikoh,noMusic:true,customText:"Дилдан ёзилган махсус таклиф."};
  const html=renderToStaticMarkup(createElement(Design,{data,mode:"full"}));
  expect((html.match(/<time /g)??[])).toHaveLength(3);
  expect((html.match(/href="https:\/\/2gis.kz\/geo\//g)??[])).toHaveLength(3);
  expect(html).toContain(data.groom);expect(html).toContain(data.bride);
  expect(html.replaceAll(' ',' ')).toContain(data.customText);
 });
});

// Photo captions are translated DOM content, not baked into the three assets.
it("translates every wedding caption including the third photo",async()=>{
 const {weddingCopy}=await import("./themes/vip-signature/copy");
 expect(Object.keys(weddingCopy("uz"))).toEqual(Object.keys(weddingCopy("ru")));
 expect(weddingCopy("ru").forever).toBe("Вместе на всю жизнь");
 expect(weddingCopy("uz").forever).toBe("Бир умр бирга");
});
