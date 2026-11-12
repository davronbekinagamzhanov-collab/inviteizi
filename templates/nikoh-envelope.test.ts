import {it,expect,vi} from "vitest";
import {createElement,type ReactElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {getDesign,longSample} from "./registry";
import {mapLink} from "@/lib/map-link";
import {weddingShots} from "./themes/nikoh-envelope/photos";
import InvitationPage from "@/app/[slug]/page";
const paid=vi.hoisted(()=>({id:"muhr"}));
vi.mock("next/font/local",()=>({default:()=>({variable:"fixture-font"})}));
vi.mock("@/lib/orders",()=>({currentSlugFor:async()=>null,getInvitationBySlug:async()=>{const {getDesign,longSample}=await import("./registry");return {mode:"full",order:{status:"active",templateId:paid.id},data:{...longSample(getDesign(paid.id)!),noMusic:true}};}}));
const ids=["muhr","ipak","muhrli-maktub"];
for(const id of ids)for(const mode of ["demo","full"] as const)for(const count of [1,2,3])it(`${id}/${mode}: ${count} events, long client fields and maps survive`,async()=>{
 const d=getDesign(id)!,{default:Design}=await d.load(),data={...longSample(d),hosts:"Мезбонлар Абдураҳмоновлар оиласи",noMusic:true};data.events=data.events.slice(0,count);
 const html=renderToStaticMarkup(createElement(Design,{data,mode})),text=html.replace(/<[^>]+>/g,"").replace(/&#x27;/g,"'").replace(/\s+/g," ");
 for(const value of [data.groom,data.bride,data.hosts,data.sides?.groom,data.sides?.bride])if(value)expect(text).toContain(value);
 for(const e of data.events){expect(text).toContain(e.venueName);expect(text).toContain(e.address);expect(html).toContain(mapLink(e));}
 expect(html.includes("data-watermark")).toBe(mode==="demo");expect(html).toContain("data-open");expect(html).not.toContain("<video");
});
for(const kind of ["muhr","ipak"] as const){
 it(`${kind}: three own photos take priority, partial upload retains coordinated defaults`,()=>{
  const data=getDesign(kind)!.sample,own=["https://example.test/one.jpg","https://example.test/two.jpg","https://example.test/three.jpg"];
  expect(weddingShots({...data,photos:own},kind).map(s=>s.src)).toEqual(own);
  const partial=weddingShots({...data,photos:[own[0]]},kind);expect(partial.map(s=>s.client)).toEqual([true,false,false]);expect(partial[1].src).toBe(`/art/nikoh-envelope/${kind}-2.webp`);
 });
 it(`${kind}: supplied client images actually render`,async()=>{const d=getDesign(kind)!,{default:Design}=await d.load(),own=["https://example.test/one.jpg","https://example.test/two.jpg","https://example.test/three.jpg"],html=renderToStaticMarkup(createElement(Design,{data:{...d.sample,photos:own,noMusic:true},mode:"full"}));for(const src of own)expect(html).toContain(src);});
}
it("maktub retains its no-customer-photo capability",async()=>{const d=getDesign("muhrli-maktub")!,{default:Design}=await d.load();expect(d.clientPhotos).toBeFalsy();const html=renderToStaticMarkup(createElement(Design,{data:{...d.sample,photos:["https://example.test/private.jpg"],noMusic:true},mode:"full"}));expect(html).not.toContain("private.jpg");});
for(const id of ids)it(`${id}: actual existing paid-slug route still renders full invitation`,async()=>{paid.id=id;const shell=InvitationPage({params:Promise.resolve({slug:"fixture-envelope-paid"}),searchParams:Promise.resolve({})}) as unknown as {props:{children:{type:(p:unknown)=>Promise<ReactElement>;props:unknown}}};const body=await shell.props.children.type(shell.props.children.props),html=renderToStaticMarkup(body);expect(html).not.toContain("data-watermark");expect(html).toContain("data-open");expect(html.length).toBeGreaterThan(1000);});
