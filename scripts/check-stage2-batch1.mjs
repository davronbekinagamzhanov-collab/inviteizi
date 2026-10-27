// Reuses the established browser acceptance and HTMLAudio PCM technique. No production writes.
import "./ts-hooks.mjs";
import {chromium} from "playwright-core";
import {mkdir,writeFile} from "node:fs/promises";
const {getDesign,longSample}=await import("../templates/registry.ts"),{mapLink}=await import("../lib/map-link.ts"),{t}=await import("../texts/uz-cyrl.ts");
const ids=process.argv.slice(2).length?process.argv.slice(2):["zarhal-lavha","adras-nishon","mis-kafgir","rayhon-sahari","visol-rishta"];
const base=process.env.CHECK_BASE_URL??"http://localhost:3107",out=process.env.CHECK_OUT??"screens/stage2-batch1";
await mkdir(out,{recursive:true});
const count=16000,pcm=Buffer.alloc(44+count*2);pcm.write("RIFF");pcm.writeUInt32LE(pcm.length-8,4);pcm.write("WAVEfmt ",8);pcm.writeUInt32LE(16,16);pcm.writeUInt16LE(1,20);pcm.writeUInt16LE(1,22);pcm.writeUInt32LE(16000,24);pcm.writeUInt32LE(32000,28);pcm.writeUInt16LE(2,32);pcm.writeUInt16LE(16,34);pcm.write("data",36);pcm.writeUInt32LE(count*2,40);for(let i=0;i<count;i++)pcm.writeInt16LE(Math.round(Math.sin(i*2*Math.PI*440/16000)*900),44+i*2);
const browser=await chromium.launch({channel:"chrome",headless:true}),results=[],extras=[];
try{
  for(const id of ids){const d=getDesign(id);
    for(const long of [false,true])for(const mode of ["full","demo"])for(const width of [320,360,375,430]){
      const data=long?longSample(d):d.sample,context=await browser.newContext({viewport:{width,height:812},deviceScaleFactor:1,isMobile:true,hasTouch:true});
      await context.route("**/storage/v1/object/public/music/**",route=>route.fulfill({status:200,contentType:"audio/wav",body:pcm}));
      const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
      try{
        const url=`${base}/demo/${id}${long?`/long?mode=${mode}`:mode==='demo'?'/namuna':''}`,response=await page.goto(url,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
        const noAutoplay=await page.locator('audio').evaluate(a=>a.paused&&a.currentTime===0),hasOpening=await page.locator('[data-open]').count()>0;
        if(hasOpening)await page.locator('[data-open]').tap();await page.waitForSelector('[data-opened="true"]');
        if(await page.getByRole('button',{name:t.music.pause,exact:true}).count())await page.getByRole('button',{name:t.music.pause,exact:true}).tap();
        const plain=await page.locator('[data-opened]').innerText(),names=[data.person,data.groom,data.bride,data.hosts,data.sides?.groom,data.sides?.bride].filter(Boolean),fieldsCorrect=names.every(s=>plain.replace(/\s+/g,' ').includes(s))&&(data.age==null||plain.includes(String(data.age)))&&data.events.every(e=>plain.includes(e.venueName)&&plain.includes(e.address)&&plain.includes(t.date.clock(e.time)));
        const maps=await page.locator('[data-event] a').evaluateAll(els=>els.map(el=>el.href));
        let clipped=0,hidden=0;const height=await page.evaluate(()=>document.documentElement.scrollHeight);
        for(let y=0;y<height;y+=500){await page.evaluate(y=>scrollTo(0,y),y);await page.waitForTimeout(80);const m=await page.evaluate(()=>({clipped:[...document.querySelectorAll('[data-word]')].filter(el=>{const r=el.getBoundingClientRect();return r.left<-.5||r.right>innerWidth+.5;}).length,hidden:[...document.querySelectorAll('[data-reveal="hidden"]')].filter(el=>{const r=el.getBoundingClientRect();return r.top<innerHeight&&r.bottom>0;}).length}));clipped+=m.clipped;hidden+=m.hidden;}
        const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),reopened=await page.locator('[data-open]').count()>0;
        const countdownClipped=await page.locator('span.lining-nums').evaluateAll(els=>els.some(el=>{const range=document.createRange();range.selectNodeContents(el);return range.getClientRects().length>1||el.scrollWidth>el.clientWidth+1;}));
        await page.evaluate(()=>scrollTo(0,0));if(mode==='full'&&(width===320||width===375))await page.screenshot({path:`${out}/${id}-${width}${long?'-long':''}.png`,fullPage:true});
        results.push({id,width,long,mode,status:response.status(),fieldsCorrect,mapsCorrect:JSON.stringify(maps.sort())===JSON.stringify(data.events.map(mapLink).sort()),events:await page.locator('[data-event]').count(),expectedEvents:data.events.length,hasOpening,openingCorrect:hasOpening===(d.format==='animated'),noAutoplay,reopened,watermarkCorrect:plain.includes('НАМУНА')===(mode==='demo'),clipped,hidden,overflow,countdownClipped,errors});
      }catch(e){results.push({id,width,long,mode,errors:[...errors,e.message]});}
      console.log(JSON.stringify(results.at(-1)));await context.close();
    }
    for(const mode of ['demo','full']){
      const context=await browser.newContext({viewport:{width:320,height:812},reducedMotion:'reduce',isMobile:true,hasTouch:true});await context.route('**/storage/v1/object/public/music/**',r=>r.fulfill({status:200,contentType:'audio/wav',body:pcm}));
      const page=await context.newPage();await page.goto(`${base}/demo/${id}${mode==='demo'?'/namuna':''}`,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
      const noAutoplay=await page.locator('audio').evaluate(a=>a.paused&&a.currentTime===0),start=Date.now();if(await page.locator('[data-open]').count())await page.locator('[data-open]').tap();await page.waitForSelector('[data-opened="true"]');const openMs=Date.now()-start;
      if(await page.getByRole('button',{name:t.music.pause,exact:true}).count())await page.getByRole('button',{name:t.music.pause,exact:true}).tap();
      await page.getByRole('button',{name:t.music.play,exact:true}).tap();const plays=await page.waitForFunction(()=>{const a=document.querySelector('audio');return a&&!a.paused&&a.currentTime>0;},undefined,{timeout:7000}).then(()=>true).catch(()=>false);
      if(plays)await page.getByRole('button',{name:t.music.pause,exact:true}).tap();const pauses=await page.locator('audio').evaluate(a=>a.paused);
      await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));await page.waitForTimeout(100);const reducedVisible=await page.locator('[data-reveal]').evaluateAll(els=>els.every(el=>getComputedStyle(el).opacity==='1'));
      extras.push({id,mode,noAutoplay,plays,pauses,reducedVisible,openMs,watermarkCorrect:(await page.getByText('НАМУНА',{exact:true}).count()>0)===(mode==='demo')});console.log(JSON.stringify(extras.at(-1)));await context.close();
    }
  }
  const passed=results.length===ids.length*16&&results.every(r=>r.status===200&&r.fieldsCorrect&&r.mapsCorrect&&r.events===r.expectedEvents&&r.openingCorrect&&r.noAutoplay&&!r.reopened&&r.watermarkCorrect&&!r.clipped&&!r.hidden&&!r.overflow&&!r.countdownClipped&&!r.errors.length)&&extras.length===ids.length*2&&extras.every(r=>r.noAutoplay&&r.plays&&r.pauses&&r.reducedVisible&&r.watermarkCorrect&&r.openMs<1500);
  await writeFile(`${out}/report.json`,JSON.stringify({scope:'Local Next/headless Chrome; native HTMLAudio PCM fixture, not remote-track availability or production',results,extras,passed},null,2)+'\n');console.log(JSON.stringify({passed,cases:results.length,extras:extras.length}));if(!passed)process.exitCode=1;
}finally{await browser.close();}
