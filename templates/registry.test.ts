import {existsSync,readFileSync} from "node:fs";
import {describe,it,expect,vi} from "vitest";
import {ACCEPTED,activeDesigns,designs,everAccepted,getDesign,HIDDEN_03_11,PRICES} from "./registry";
import {photoAttributions} from "@/texts/uz-cyrl";

vi.mock("next/font/local",()=>({default:()=>({variable:"test-font"})}));

describe("catalog acceptance integrity",()=>{
  it("after the 03.11 clean-up the catalog keeps 12 designs; 48 hidden ones stay in code",()=>{
    const expected={nikoh:{simple:1,scroll:1,animated:4},nahorgi:{simple:0,scroll:1,animated:0},sunnat:{simple:1,scroll:1,animated:0},yubiley:{simple:0,scroll:1,animated:2}} as const;
    expect(activeDesigns()).toHaveLength(12);expect(ACCEPTED.size).toBe(12);expect(ACCEPTED.has('anor-bogi')).toBe(false);
    expect(activeDesigns().map(d=>d.number).sort((a,b)=>a-b)).toEqual([1,23,51,61,70,78,81,87,113,114,115,116]);
    expect(HIDDEN_03_11).toHaveLength(48);expect(everAccepted()).toHaveLength(60);
    for(const id of HIDDEN_03_11){const d=getDesign(id);expect(d,id).toBeDefined();expect(ACCEPTED.has(id)).toBe(false);}
    expect(getDesign("saodat-kaliti")?.number).toBe(106);expect(getDesign("kabutar-salom")?.number).toBe(96);
    for(const occasion of Object.keys(expected) as (keyof typeof expected)[]){const list=activeDesigns().filter(d=>d.occasion===occasion);expect({simple:list.filter(d=>d.format==='simple').length,scroll:list.filter(d=>d.format==='scroll').length,animated:list.filter(d=>d.format==='animated').length}).toEqual(expected[occasion]);}
  });
  it("classifies by functionality and preserves ambiguous tariffs pending owner review",async()=>{
    expect(everAccepted().filter(d=>d.format==="scroll"&&d.number<=81).map(d=>d.id).sort()).toEqual(["paxta-gul","sayram-hovli","shohona-baxmal","tonggi-choy","umr-daraxti"]);
    for(const id of ["sapfir","ipak-romol","rishton-koshin","atirgul"])expect(designs.find(d=>d.id===id)?.format).toBe("simple");
    for(const d of everAccepted().filter(d=>d.format==="scroll")){
      const {createElement}=await import("react");
      const {renderToStaticMarkup}=await import("react-dom/server");
      const {default:Component}=await d.load();
      const html=renderToStaticMarkup(createElement(Component,{data:{...d.sample,noMusic:true},mode:"full"}));
      expect(html).not.toContain('data-open="');
      for(const event of d.sample.events)expect(html).toContain(event.venueName);
    }
  });
  it("retains required public attribution in each downloadable preview",()=>{
    for(const d of everAccepted()){
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
    for(const d of everAccepted()){
      const source=readFileSync(`templates/themes/${d.id}/${pilots[d.id]??"Design"}.tsx`,"utf8");
      expect(source,d.id).not.toMatch(/ЗАГЛУШКА|дизайн в работе/);
      for(const file of [`public${d.cover}`,`public/covers/${d.id}.jpg`,`public/og/${d.id}.jpg`])expect(existsSync(file),file).toBe(true);
      if(d.withPhoto)expect(existsSync(`public${d.art??`/art/${d.id}.webp`}`),d.id).toBe(true);
    }
  });
});
