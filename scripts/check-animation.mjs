// Browser frame-time measurement, not an estimate of real phone performance.
// Warm local pages, Chrome CPU throttle x4, no production data or requests.
import "./ts-hooks.mjs";
import {chromium} from "playwright-core";
import {mkdir,writeFile} from "node:fs/promises";
const {activeDesigns,designs}=await import("../templates/registry.ts");
const ids=process.argv.slice(2);
const targets=ids.length?designs.filter(d=>ids.includes(d.id)):activeDesigns().filter(d=>d.format==="animated");
if(ids.some(id=>!targets.some(d=>d.id===id)))throw new Error("Unknown design ID");
const base=process.env.CHECK_BASE_URL??"http://127.0.0.1:3102";
const browser=await chromium.launch({channel:"chrome",headless:true});
const results=[];
try {
  for(const design of targets){
    const context=await browser.newContext({viewport:{width:375,height:812},deviceScaleFactor:2,isMobile:true,hasTouch:true});
    const page=await context.newPage();
    await page.goto(`${base}/demo/${design.id}`,{waitUntil:"networkidle"});
    await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));});
    const cdp=await context.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate",{rate:4});
    for(const phase of ["opening","scroll"]){
      if(phase==="scroll")await page.waitForSelector('[data-opened="true"]');
      await page.evaluate((phase)=>{
        window.__frames=[];
        const epoch=(window.__frameEpoch??0)+1;window.__frameEpoch=epoch;
        let last,start;
        const tick=now=>{
          if(window.__frameEpoch!==epoch)return;
          start??=now;
          if(last!==undefined)window.__frames.push(now-last);
          last=now;
          if(phase==="scroll")scrollTo(0,(document.documentElement.scrollHeight-innerHeight)*Math.min(1,(now-start)/2500));
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },phase);
      if(phase==="opening"&&await page.locator("[data-open]").count())await page.locator("[data-open]").first().click();
      await page.waitForTimeout(3000);
      const samples=await page.evaluate(()=>{window.__frameEpoch++;return window.__frames;});
      if(samples.length<30)throw new Error(`Insufficient frame samples: ${design.id}/${phase}`);
      const sorted=[...samples].sort((a,b)=>a-b),round=n=>Math.round(n*100)/100;
      const result={design:design.id,phase,cpuThrottle:4,frames:samples.length,p50Ms:round(sorted[Math.floor(sorted.length*.5)]??0),p95Ms:round(sorted[Math.floor(sorted.length*.95)]??0),maxMs:round(sorted.at(-1)??0),over50Ms:samples.filter(n=>n>50).length,over100Ms:samples.filter(n=>n>100).length};
      results.push(result);console.log(JSON.stringify(result));
    }
    await context.close();
  }
  await mkdir("screens/animation",{recursive:true});
  await writeFile("screens/animation/report.json",JSON.stringify({environment:"Local Chrome headless; warmed pages; CPU x4; 375x812 DPR2. Frame times are measured with requestAnimationFrame; this is not a physical-device guarantee.",results},null,2));
}finally{await browser.close();}
