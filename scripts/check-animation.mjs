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
const noSvgFilters=process.env.CHECK_NO_SVG_FILTERS==="1";
const cpuProfile=process.env.CHECK_CPU_PROFILE==="1";
await mkdir("screens/animation",{recursive:true});
const browser=await chromium.launch({channel:"chrome",headless:true});
const results=[];
try {
  for(const design of targets){
    const context=await browser.newContext({viewport:{width:375,height:812},deviceScaleFactor:2,isMobile:true,hasTouch:true});
    const page=await context.newPage();
    await page.goto(`${base}/demo/${design.id}`,{waitUntil:"networkidle"});
    await page.evaluate(async()=>{
      await document.fonts.ready;
      // Offscreen lazy pictures may never resolve decode before scrolling.
      const visible=[...document.images].filter(i=>{const r=i.getBoundingClientRect();return i.complete||i.loading!=="lazy"||(r.top<innerHeight&&r.bottom>0);});
      await Promise.all(visible.map(i=>Promise.race([i.decode().catch(()=>{}),new Promise(resolve=>setTimeout(resolve,2000))])));
    });
    if(noSvgFilters)await page.addStyleTag({content:"svg [filter]{filter:none!important}"});
    const cdp=await context.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate",{rate:4});
    for(const phase of ["opening","scroll"]){
      const hasOpening=await page.locator("[data-open]").count()>0;
      if(phase==="scroll")await page.waitForSelector('[data-opened="true"]');
      if(cpuProfile){await cdp.send("Profiler.enable");await cdp.send("Profiler.start");}
      await page.evaluate(({phase,hasOpening})=>{
        window.__frames=[];
        const epoch=(window.__frameEpoch??0)+1;window.__frameEpoch=epoch;
        const begin=()=>{
          let last=performance.now(),start=last;
          const tick=now=>{
            if(window.__frameEpoch!==epoch)return;
            window.__frames.push(Math.max(0,now-last));last=now;
            if(phase==="scroll")scrollTo(0,(document.documentElement.scrollHeight-innerHeight)*Math.min(1,(now-start)/2500));
            requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        };
        // Exclude Playwright actionability/hit-testing before the real touch event.
        // Start before React handles pointerdown so the input's own work remains measured.
        if(phase==="opening"&&hasOpening)window.addEventListener("pointerdown",begin,{once:true,capture:true});else begin();
      },{phase,hasOpening});
      if(phase==="opening"&&hasOpening)await page.locator("[data-open]").first().tap();
      await page.waitForTimeout(3000);
      const samples=await page.evaluate(()=>{window.__frameEpoch++;return window.__frames;});
      if(cpuProfile){const {profile}=await cdp.send("Profiler.stop");await writeFile(`screens/animation/${design.id}-${phase}.cpuprofile`,JSON.stringify(profile));}
      if(samples.length<30)throw new Error(`Insufficient frame samples: ${design.id}/${phase}`);
      const sorted=[...samples].sort((a,b)=>a-b),round=n=>Math.round(n*100)/100;
      let elapsed=0;const stalls=samples.map(ms=>{elapsed+=ms;return {atMs:round(elapsed),durationMs:round(ms)};}).filter(s=>s.durationMs>50);
      const result={design:design.id,phase,cpuThrottle:4,noSvgFilters,frames:samples.length,p50Ms:round(sorted[Math.floor(sorted.length*.5)]??0),p95Ms:round(sorted[Math.floor(sorted.length*.95)]??0),maxMs:round(sorted.at(-1)??0),over50Ms:samples.filter(n=>n>50).length,over100Ms:samples.filter(n=>n>100).length,stalls};
      results.push(result);console.log(JSON.stringify(result));
    }
    await context.close();
  }
  await mkdir("screens/animation",{recursive:true});
  await writeFile(`screens/animation/report${noSvgFilters?"-no-svg-filters":""}.json`,JSON.stringify({environment:"Local Chrome headless; warmed pages; CPU x4; 375x812 DPR2. Touch input; opening recording starts in pointerdown capture before React, excluding pre-input Playwright actionability checks. requestAnimationFrame times; not a physical-device guarantee.",noSvgFilters,results},null,2));
}finally{await browser.close();}
