import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import sharp from "sharp";
import {activeDesigns,designs,getDesign,longSample} from "./registry";
import {t} from "@/texts/uz-cyrl";

const batch=[
  ["marvarid-satr","nikoh","simple",82,true],
  ["gulbog-sahifa","nikoh","scroll",83,true],
  ["suzani-yol","nikoh","scroll",84,false],
  ["bugdoy-boshoq","nahorgi","simple",85,false],
  ["lola-ehtirom","yubiley","scroll",86,true],
] as const;

describe("batch five catalog acceptance",()=>{
  it("adds exactly five identities while retaining all 25 earlier accepted designs",()=>{
    const now=activeDesigns().filter(d=>d.number<=86);
    expect(now).toHaveLength(30);expect(now.filter(d=>d.number<=81)).toHaveLength(25);
    expect(designs.filter(d=>d.number<=86)).toHaveLength(31);
    expect(now.filter(d=>d.number>81).map(d=>d.id).sort()).toEqual(batch.map(([id])=>id).sort());
    expect(now.some(d=>d.id==="anor-bogi")).toBe(false);
    for(const [occasion,counts] of [["nikoh",[5,3,6]],["nahorgi",[2,2,4]],["sunnat",[1,1,2]],["yubiley",[1,2,1]]] as const)
      expect(["simple","scroll","animated"].map(format=>now.filter(d=>d.occasion===occasion&&d.format===format).length)).toEqual(counts);
  });
  for(const [id,occasion,format,number,withPhoto] of batch)it(`${id}: metadata, real data and complete preview assets`,async()=>{
    const d=getDesign(id)!;expect(d).toMatchObject({occasion,format,number,withPhoto});
    expect(t.designs[id]).toMatch(/[ўқғҳа-я]/i);
    const stress=longSample(d);expect(stress.events).toHaveLength(3);
    expect(stress.events.every(e=>e.location&&e.address&&e.venueName)).toBe(true);
    expect(t.invite(stress).body).not.toMatch(/undefined|null|NaN|[а-яёўқғҳ][a-z]|[a-z][а-яёўқғҳ]/i);
    for(const [path,width,height,kind] of [[`public${d.cover}`,1080,1920,"webp"],[`public/covers/${id}.jpg`,1080,1920,"jpeg"],[`public/og/${id}.jpg`,420,620,"jpeg"]] as const)
      expect(await sharp(path).metadata()).toMatchObject({width,height,format:kind});
  });
  it("photo provenance and hashes identify the individually reviewed CC0 originals",()=>{
    const sources=JSON.parse(readFileSync("public/art/batch-five-sources.json","utf8"));
    expect(sources.map((s:{id:string})=>s.id).sort()).toEqual(["gulbog-sahifa","lola-ehtirom"]);
    for(const s of sources){
      expect(s).toMatchObject({license:"CC0",realPhotograph:true,reviewed:"2026-10-27"});
      expect(s.source).toMatch(/^https:\/\/commons.wikimedia.org\/wiki\/File:/);
      expect(readFileSync("public/art/CREDITS.md","utf8")).toContain(s.source);
      const bytes=readFileSync(`public/art/${s.id}.webp`);
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(s.sha256);expect(bytes.length).toBeLessThanOrEqual(300*1024);
    }
  });
});
