import {describe,it,expect,vi} from "vitest";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {activeDesigns,longSample} from "./registry";
import {t} from "@/texts/uz-cyrl";
import {mapLink} from "@/lib/map-link";
vi.mock("next/font/local",()=>({default:()=>({variable:"test-font"})}));
vi.mock("next/font/google",()=>{
  const font=()=>({variable:"test-font"});
  return {Cormorant_Garamond:font,PT_Serif:font,Playfair:font,Cormorant_Unicase:font,Source_Serif_4:font,PT_Sans:font,EB_Garamond:font,Noto_Serif:font,Noto_Sans:font,Gentium_Book_Plus:font,Marck_Script:font,Viaoda_Libre:font,Podkova:font};
});
describe("every accepted Nikoh design renders both families",()=>{
  for(const d of activeDesigns().filter(d=>d.occasion==="nikoh"))for(const mode of ["demo","full"] as const)it(`${d.id} / ${mode}`,async()=>{
    const {default:Design}=await d.load();
    const data={...longSample(d),noMusic:true};
    const html=renderToStaticMarkup(createElement(Design,{data,mode}));
    expect(html).toContain(t.sides.groom);expect(html).toContain(t.sides.bride);
    const plain=html.replace(/<[^>]*>/g,"").replace(/&#x27;/g,"'").replace(/\s+/g," ");
    expect(plain).toContain(data.sides!.groom);expect(plain).toContain(data.sides!.bride);
    for(const e of data.events)expect(html).toContain(mapLink(e));
    if(mode==="demo")expect(html).toContain("НАМУНА");
  });
});
