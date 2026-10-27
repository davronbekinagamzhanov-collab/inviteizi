import "./ts-hooks.mjs";
import {chromium} from "playwright-core";
import {mkdir,writeFile} from "node:fs/promises";
const {activeDesigns,longSample}=await import("../templates/registry.ts");
const {t}=await import("../texts/uz-cyrl.ts");
const {mapLink}=await import("../lib/map-link.ts");
const base=process.env.CHECK_BASE_URL??"http://127.0.0.1:3106",out="screens/stage1-families";
const requested=process.argv.slice(2),targets=activeDesigns().filter(d=>d.occasion==="nikoh"&&(!requested.length||requested.includes(d.id)));
await mkdir(out,{recursive:true});const browser=await chromium.launch({channel:"chrome",headless:true}),results=[];
try{
  for(const d of targets)for(const mode of ["full","demo"])for(const width of ["sapfir","oltin-monogramma"].includes(d.id)?[320,360,375,430]:[320]){
    const context=await browser.newContext({viewport:{width,height:812},isMobile:true,hasTouch:true,reducedMotion:width===375?"no-preference":"reduce"});
    const page=await context.newPage(),errors=[];page.setDefaultTimeout(5000);page.on("pageerror",e=>errors.push(e.message));page.on("console",m=>{if(m.type()==="error")errors.push(m.text());});
    try{
      const response=await page.goto(`${base}/demo/${d.id}/long?mode=${mode}`,{waitUntil:"load"});await page.evaluate(()=>document.fonts.ready);
      const opener=page.locator("[data-open]").first();if(await opener.count())await opener.tap();
      await page.waitForSelector('[data-opened="true"]',{timeout:15000});await page.waitForTimeout(400);
      const data=longSample(d),families=[];
      for(const text of [t.sides.groom,t.sides.bride,data.sides.groom,data.sides.bride]){
        const handle=await page.evaluateHandle(text=>{
          const norm=s=>(s??"").replace(/\s+/g," ").trim(),all=[...document.querySelectorAll("p,div,span")];
          return all.find(el=>norm(el.textContent)===text)??all.find(el=>[...el.childNodes].some(n=>n.nodeType===Node.TEXT_NODE&&norm(n.textContent)===text))??null;
        },text);
        const label=handle.asElement();if(!label)throw new Error("Missing family field: "+text);
        await label.scrollIntoViewIfNeeded();await page.waitForTimeout(400);
        families.push(await label.evaluate(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.top>=-.5&&r.bottom<=innerHeight+.5&&getComputedStyle(el).opacity!=="0";}));
      }
      const hrefs=await page.locator('a[href]').evaluateAll(els=>els.map(el=>el.href));
      const metrics=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,clippedWords:[...document.querySelectorAll('[data-word]')].filter(el=>{const r=el.getBoundingClientRect();return r.left<-.5||r.right>innerWidth+.5;}).length}));
      const watermark=await page.getByText("НАМУНА",{exact:true}).count()>0;
      await page.evaluate(()=>scrollTo(0,0));
      if(["sapfir","oltin-monogramma"].includes(d.id))await page.screenshot({path:`${out}/${d.id}-${mode}-${width}.png`,fullPage:true});
      results.push({id:d.id,mode,width,status:response.status(),familiesVisible:families.every(Boolean),mapsPresent:data.events.every(e=>hrefs.includes(mapLink(e))),watermarkCorrect:watermark===(mode==="demo"),...metrics,errors});
    }catch(e){results.push({id:d.id,mode,width,errors:[...errors,e.message]});}
    console.log(JSON.stringify(results.at(-1)));await context.close();
  }
  const expected=targets.reduce((n,d)=>n+(["sapfir","oltin-monogramma"].includes(d.id)?8:2),0);
  const passed=results.length===expected&&results.every(r=>r.status===200&&r.familiesVisible&&r.mapsPresent&&r.watermarkCorrect&&!r.overflow&&!r.clippedWords&&!r.errors.length);
  await writeFile(process.env.CHECK_REPORT??"docs/reviews/2026-10-27-stage1-families.json",JSON.stringify({scope:"local Chrome; accepted Nikoh designs; full/demo fixture; no production data",passed,results},null,2)+"\n");
  console.log(JSON.stringify({passed,cases:results.length}));if(!passed)process.exitCode=1;
}finally{await browser.close();}
