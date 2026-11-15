import {describe,it,expect,vi} from "vitest";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {createHash} from "node:crypto";
import {readFileSync,existsSync} from "node:fs";
import {getDesign,activeDesigns,ACCEPTED,CATALOG_ORDER,PRICES} from "./registry";
import {celebrationIds,artOf} from "./themes/celebration-preview/model";
import {celebrationCopy} from "@/texts/uz-cyrl";
import type {InvitationData} from "@/lib/types";
import {longSamples} from "@/lib/samples";
import {parseWeddingDate} from "@/lib/wedding-date";
vi.mock("next/font/local",()=>({default:()=>({variable:"font-test"})}));
const expected={"sahar-sabosi":["hero","letter","venue","date","closing"],"subhi-safo":["hero","letter","date","venue","closing"]};
describe("two ordinary morning previews with different entry modes",()=>{
 it("does not activate, price or replace a working catalogue entry",()=>{
  expect(activeDesigns()).toHaveLength(36);expect(PRICES).toEqual({animated:8000,scroll:6000,simple:5000});
  for(const id of celebrationIds){const d=getDesign(id)!;expect(d).toBeDefined();expect(ACCEPTED.has(id)).toBe(false);expect(Object.values(CATALOG_ORDER).flat()).not.toContain(id);expect(d.clientPhotos).not.toBe(true);expect(d.withPhoto).toBe(true);expect(d.art).toBe(artOf(id));expect(d.cover).toBe(`/covers/${id}.webp`);for(const path of [`public${d.cover}`,`public/covers/${id}.jpg`,`public/covers/thumb/${id}.webp`,`public/og/${id}.jpg`])expect(readFileSync(path).length).toBeGreaterThan(100);}
  expect(new Set(celebrationIds.map(id=>getDesign(id)!.number)).size).toBe(2);
 });
 it("has translated copy and two independently generated photographic assets",()=>{
  expect(Object.keys(celebrationCopy("ru"))).toEqual(Object.keys(celebrationCopy("uz")));expect(celebrationCopy("ru").open).not.toBe(celebrationCopy("uz").open);
  const manifest=JSON.parse(readFileSync("public/art/celebrations/photography.json","utf8")) as Array<{id:string;path:string;sha256:string;kind:string}>;
  expect(new Set(manifest.map(x=>x.sha256)).size).toBe(2);
  for(const id of celebrationIds){const entry=manifest.find(x=>x.id===id)!;expect(entry.path).toBe(artOf(id));expect(entry.kind).toContain("AI-generated");const bytes=readFileSync(`public${entry.path}`);expect(bytes.toString("ascii",0,4)).toBe("RIFF");expect(bytes.toString("ascii",8,12)).toBe("WEBP");expect(createHash("sha256").update(bytes).digest("hex")).toBe(entry.sha256);}
 });
 it("removes only the two rejected new celebrations and keeps older anniversary/sunnat designs",()=>{for(const id of ["mehr-fasli","qutlug-nihol"]){expect(getDesign(id)).toBeUndefined();expect(existsSync(`templates/themes/${id}`)).toBe(false);expect(existsSync(`public/art/celebrations/${id}-hero.webp`)).toBe(false);}for(const id of ["vip-umr-ziyosi","vip-oq-tulpor"])expect(getDesign(id)).toBeDefined();});
 for(const id of celebrationIds){
  it(`${id}: retains its own composition, occasion data and accurate map links`,async()=>{
   const d=getDesign(id)!,{default:Design}=await d.load(),html=renderToStaticMarkup(createElement(Design,{data:{...d.sample,noMusic:true},mode:"full"}));
   expect([...html.matchAll(/data-section="([^"]+)"/g)].map(x=>x[1])).toEqual(expected[id]);if(id==="sahar-sabosi"){expect(html).toContain(`data-celebration-opening="${id}"`);expect(html).toContain('data-opening-version="cotton-paper-v4"');expect(html).toContain('data-paper-flap="true"');expect(html).toContain('data-paper-pocket="true"');const cover=html.match(/<button[^>]*data-celebration-opening=[\s\S]*?<\/button>/)![0];expect(cover).not.toMatch(/<svg|↗|↓/);expect(cover).toContain(celebrationCopy("uz").touch);}else{expect(html).not.toContain("data-celebration-opening");expect(html).not.toContain("data-open=");expect(html).toContain('data-entry-mode="direct"');expect(html).toContain('data-opened="true"');expect(html).not.toContain('inert=""');}expect(html).toContain(`src="${artOf(id)}"`);expect(html).not.toMatch(/src="[^"]*\.svg"|data-gate-left|data-gate-right/);expect(html).toContain(d.sample.person);expect(html).not.toMatch(/undefined|dress.code|data-vip-photo-slot/);
   expect((html.match(/href="https:\/\/2gis.kz/g)??[])).toHaveLength(d.sample.events.length);expect(html).toContain('aria-current="date"');
   const event=d.sample.events.find(e=>e.kind==="nahorgi")??d.sample.events[0];expect(html).toContain(`data-target-at="${parseWeddingDate(event.date,event.time).startsAt.toISOString()}"`);
  });
  it(`${id}: supports long Uzbek text and every supplied event without inventing a programme`,async()=>{
   const d=getDesign(id)!,{default:Design}=await d.load(),data:InvitationData={...longSamples[d.occasion],customText:"Ўғлимиз, қадрдонларимиз ва меҳмонларимизга эҳтиром билан. ".repeat(20).slice(0,600),noMusic:true,langs:["ru" as const]},html=renderToStaticMarkup(createElement(Design,{data,mode:"full"}));
   expect((html.match(/data-event="true"/g)??[])).toHaveLength(3);expect((html.match(/href="https:\/\/2gis.kz/g)??[])).toHaveLength(3);expect(html.replaceAll(" "," ")).toContain(data.customText!.trim());expect(html.replace(/<[^>]*>/g, "").replaceAll(" "," ")).toContain(data.person);
  });
 }
});
