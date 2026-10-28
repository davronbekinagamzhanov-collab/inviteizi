import {existsSync,readFileSync} from "node:fs";
import {describe,it,expect} from "vitest";
import {ACCEPTED,activeDesigns,designs,PRICES} from "./registry";
import {photoAttributions} from "@/texts/uz-cyrl";

describe("catalog acceptance integrity",()=>{
  it("finishes the owner's exact 50-design quotas without publishing anor-bogi",()=>{
    const expected={nikoh:{simple:5,scroll:10,animated:15},nahorgi:{simple:3,scroll:3,animated:4},sunnat:{simple:2,scroll:1,animated:2},yubiley:{simple:1,scroll:2,animated:2}} as const;
    expect(activeDesigns()).toHaveLength(50);expect(ACCEPTED.size).toBe(50);expect(ACCEPTED.has('anor-bogi')).toBe(false);
    for(const occasion of Object.keys(expected) as (keyof typeof expected)[]){const list=activeDesigns().filter(d=>d.occasion===occasion);expect({simple:list.filter(d=>d.format==='simple').length,scroll:list.filter(d=>d.format==='scroll').length,animated:list.filter(d=>d.format==='animated').length}).toEqual(expected[occasion]);}
  });
  it("classifies by functionality and preserves ambiguous tariffs pending owner review",()=>{
    expect(activeDesigns().filter(d=>d.format==="scroll"&&d.number<=81).map(d=>d.id).sort()).toEqual(["paxta-gul","sayram-hovli","shohona-baxmal","tonggi-choy","umr-daraxti"]);
    for(const id of ["sapfir","ipak-romol","rishton-koshin","atirgul"])expect(designs.find(d=>d.id===id)?.format).toBe("simple");
    for(const d of activeDesigns().filter(d=>d.format==="scroll")){
      const source=readFileSync(`templates/themes/${d.id}/Design.tsx`,"utf8");
      expect(source).toContain("opening:false");expect(source).toContain("inv.program.map");
    }
  });
  it("retains required public attribution in each downloadable preview",()=>{
    for(const d of activeDesigns()){
      const credit=photoAttributions[d.id];if(!credit)continue;
      expect(readFileSync("public/art/CREDITS.md","utf8")).toContain(credit.source);
      for(const file of [`public${d.cover}`,`public/covers/${d.id}.jpg`,`public/og/${d.id}.jpg`]){
        const bytes=readFileSync(file);
        expect(bytes.includes(Buffer.from(credit.author)),file).toBe(true);
        expect(bytes.includes(Buffer.from(credit.source)),file).toBe(true);
      }
    }
  });
  it("has unique registered identities and no unknown accepted design",()=>{
    expect(new Set(designs.map(d=>d.id)).size).toBe(designs.length);
    expect(new Set(designs.map(d=>d.number)).size).toBe(designs.length);
    for(const id of ACCEPTED)expect(designs.some(d=>d.id===id),id).toBe(true);
    expect(ACCEPTED.has("anor-bogi")).toBe(false);
    expect(PRICES).toEqual({animated:8000,scroll:6000,simple:5000});
  });
  it("only publishes completed code with both bot and web covers and private-data-free OG art",()=>{
    const pilots:Record<string,string>={"oltin-monogramma":"OltinMonogramma",sapfir:"Sapfir","oq-ot":"OqOt","tonggi-qozon":"TonggiQozon","pion-guldasta":"PionGuldasta"};
    for(const d of activeDesigns()){
      const source=readFileSync(`templates/themes/${d.id}/${pilots[d.id]??"Design"}.tsx`,"utf8");
      expect(source,d.id).not.toMatch(/ЗАГЛУШКА|дизайн в работе/);
      for(const file of [`public${d.cover}`,`public/covers/${d.id}.jpg`,`public/og/${d.id}.jpg`])expect(existsSync(file),file).toBe(true);
      if(d.withPhoto)expect(existsSync(`public${d.art??`/art/${d.id}.webp`}`),d.id).toBe(true);
    }
  });
});
