import {describe,it,expect,vi} from "vitest";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {getDesign,activeDesigns,ACCEPTED,CATALOG_ORDER,PRICES} from "./registry";
import {celebrationIds,artOf} from "./themes/celebration-preview/model";
import {celebrationCopy} from "@/texts/uz-cyrl";
import type {InvitationData} from "@/lib/types";
import {longSamples} from "@/lib/samples";
import {parseWeddingDate} from "@/lib/wedding-date";
vi.mock("next/font/local",()=>({default:()=>({variable:"font-test"})}));
const expected={"sahar-sabosi":["hero","venue","letter","date","closing"],"subhi-safo":["hero","date","letter","venue","closing"],"mehr-fasli":["hero","letter","venue","date","closing"],"qutlug-nihol":["hero","letter","date","venue","closing"]};
describe("four ordinary unlisted celebration previews",()=>{
 it("does not activate, price or replace a working catalogue entry",()=>{
  expect(activeDesigns()).toHaveLength(36);expect(PRICES).toEqual({animated:8000,scroll:6000,simple:5000});
  for(const id of celebrationIds){const d=getDesign(id)!;expect(d).toBeDefined();expect(ACCEPTED.has(id)).toBe(false);expect(Object.values(CATALOG_ORDER).flat()).not.toContain(id);expect(d.clientPhotos).not.toBe(true);expect(d.withPhoto).toBe(true);expect(d.art).toBe(artOf(id));expect(d.cover).toBe(`/covers/${id}.webp`);for(const path of [`public${d.cover}`,`public/covers/${id}.jpg`,`public/covers/thumb/${id}.webp`,`public/og/${id}.jpg`])expect(readFileSync(path).length).toBeGreaterThan(100);}
  expect(new Set(celebrationIds.map(id=>getDesign(id)!.number)).size).toBe(4);
 });
 it("has translated copy and four independently generated photographic assets",()=>{
  expect(Object.keys(celebrationCopy("ru"))).toEqual(Object.keys(celebrationCopy("uz")));expect(celebrationCopy("ru").open).not.toBe(celebrationCopy("uz").open);
  const manifest=JSON.parse(readFileSync("public/art/celebrations/photography.json","utf8")) as Array<{id:string;path:string;sha256:string;kind:string}>;
  expect(new Set(manifest.map(x=>x.sha256)).size).toBe(4);
  for(const id of celebrationIds){const entry=manifest.find(x=>x.id===id)!;expect(entry.path).toBe(artOf(id));expect(entry.kind).toContain("AI-generated");const bytes=readFileSync(`public${entry.path}`);expect(bytes.toString("ascii",0,4)).toBe("RIFF");expect(bytes.toString("ascii",8,12)).toBe("WEBP");expect(createHash("sha256").update(bytes).digest("hex")).toBe(entry.sha256);}
 });
 for(const id of celebrationIds){
  it(`${id}: retains its own composition, occasion data and accurate map links`,async()=>{
   const d=getDesign(id)!,{default:Design}=await d.load(),html=renderToStaticMarkup(createElement(Design,{data:{...d.sample,noMusic:true},mode:"full"}));
   expect([...html.matchAll(/data-section="([^"]+)"/g)].map(x=>x[1])).toEqual(expected[id]);expect(html).toContain(`data-celebration-opening="${id}"`);expect(html).toContain(`src="${artOf(id)}"`);expect(html).toContain('data-opening-version="photographic-v2"');expect(html).not.toMatch(/src="[^"]*\.svg"|data-gate-left|data-gate-right/);expect(html).toContain(d.sample.person);expect(html).not.toMatch(/undefined|dress.code|data-vip-photo-slot/);
   expect((html.match(/href="https:\/\/2gis.kz/g)??[])).toHaveLength(d.sample.events.length);expect(html).toContain('aria-current="date"');
   const event=d.sample.events.find(e=>e.kind===(d.occasion==="sunnat"?"sunnatBazm":d.occasion==="yubiley"?"yubileyBazm":"nahorgi"))??d.sample.events[0];expect(html).toContain(`data-target-at="${parseWeddingDate(event.date,event.time).startsAt.toISOString()}"`);
  });
  it(`${id}: supports long Uzbek text and every supplied event without inventing a programme`,async()=>{
   const d=getDesign(id)!,{default:Design}=await d.load(),data:InvitationData={...longSamples[d.occasion],customText:"Ўғлимиз, қадрдонларимиз ва меҳмонларимизга эҳтиром билан. ".repeat(20).slice(0,600),noMusic:true,langs:["ru" as const]},html=renderToStaticMarkup(createElement(Design,{data,mode:"full"}));
   expect((html.match(/data-event="true"/g)??[])).toHaveLength(3);expect((html.match(/href="https:\/\/2gis.kz/g)??[])).toHaveLength(3);expect(html.replaceAll(" "," ")).toContain(data.customText!.trim());expect(html.replace(/<[^>]*>/g, "").replaceAll(" "," ")).toContain(data.person);
  });
 }
 it("does not invent an age for a celebration without one",async()=>{const d=getDesign("mehr-fasli")!,{default:Design}=await d.load(),html=renderToStaticMarkup(createElement(Design,{data:{...d.sample,age:undefined,noMusic:true},mode:"full"}));expect(html).not.toContain("data-age");expect(html).not.toContain("undefined");});
});
