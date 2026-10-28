// Focused local browser acceptance. No bot, database writes or production deployment.
import "./ts-hooks.mjs";
import {chromium} from "playwright-core";
import {mkdir,writeFile} from "node:fs/promises";
const {getDesign,longSample}=await import("../templates/registry.ts");
const {mapLink}=await import("../lib/map-link.ts");
const {t}=await import("../texts/uz-cyrl.ts");
const ids=process.argv.slice(2).length?process.argv.slice(2):["oq-chinni","doppicha","sayram-hovli","zarvaraq","umr-daraxti"];
const base=process.env.CHECK_BASE_URL??"http://127.0.0.1:3104";
const out=process.env.CHECK_OUT??"screens/batch-four";
await mkdir(out,{recursive:true});
// A short PCM fixture exercises actual HTMLAudio decoding/play/pause without relying on a remote song.
const samples=16000,pcm=Buffer.alloc(44+samples*2);
pcm.write("RIFF");pcm.writeUInt32LE(pcm.length-8,4);pcm.write("WAVEfmt ",8);pcm.writeUInt32LE(16,16);pcm.writeUInt16LE(1,20);pcm.writeUInt16LE(1,22);pcm.writeUInt32LE(16000,24);pcm.writeUInt32LE(32000,28);pcm.writeUInt16LE(2,32);pcm.writeUInt16LE(16,34);pcm.write("data",36);pcm.writeUInt32LE(samples*2,40);
for(let i=0;i<samples;i++)pcm.writeInt16LE(Math.round(Math.sin(i*2*Math.PI*440/16000)*1000),44+i*2);
const browser=await chromium.launch({channel:"chrome",headless:true});
const results=[],extras=[];
try{
  for(const id of ids){
    const d=getDesign(id);
    for(const long of [false,true])for(const width of [320,360,375,430]){
      const data=long?longSample(d):d.sample;
      const context=await browser.newContext({viewport:{width,height:812},isMobile:true,hasTouch:true,deviceScaleFactor:1});
      const page=await context.newPage(),errors=[];
      page.on("pageerror",e=>errors.push(e.message));page.on("console",m=>{if(m.type()==="error")errors.push(m.text());});
      const response=await page.goto(`${base}/demo/${id}${long?"/long":""}`,{waitUntil:"load"});
      await page.evaluate(()=>document.fonts.ready);
      await page.waitForSelector('[data-opened="true"]');
      await page.waitForTimeout(450);
      const name=await page.locator("h1").innerText();
      const maps=await page.locator('[data-event] a').evaluateAll(els=>els.map(el=>el.href));
      const expectedMaps=data.events.map(mapLink).sort();
      const events=await page.locator("[data-event]").count();
      let hidden=0,clipped=0;
      for(let y=0;y<await page.evaluate(()=>document.documentElement.scrollHeight);y+=500){
        await page.evaluate(y=>scrollTo(0,y),y);await page.waitForTimeout(60);
        const m=await page.evaluate(()=>({hidden:[...document.querySelectorAll('[data-reveal="hidden"]')].filter(el=>{const r=el.getBoundingClientRect();return r.top<innerHeight&&r.bottom>0;}).length,clipped:[...document.querySelectorAll('[data-word]')].filter(el=>{const r=el.getBoundingClientRect();return r.left<-.5||r.right>innerWidth+.5;}).length}));
        hidden+=m.hidden;clipped+=m.clipped;
      }
      await page.evaluate(()=>scrollTo(0,0));
      const metrics=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,audioPaused:document.querySelector("audio")?.paused,opener:!!document.querySelector("[data-open]")}));
      if(width===375||width===320)await page.screenshot({path:`${out}/${id}-${width}${long?"-long":""}.png`,fullPage:true});
      const expectedName=data.occasion==="nikoh"?`${data.groom} ${t.cover.andWord} ${data.bride}`:data.person;
      const result={id,width,long,status:response.status(),events,expectedEvents:data.events.length,nameCorrect:name.replace(/\s+/g," ").trim()===expectedName,mapsCorrect:JSON.stringify(maps.sort())===JSON.stringify(expectedMaps),overflow:metrics.scrollWidth>width,clippedWords:clipped,hidden,autoplay:metrics.audioPaused===false,hasOpening:metrics.opener,height:metrics.height,errors:[...new Set(errors)]};
      results.push(result);console.log(JSON.stringify(result));await context.close();
    }
    const context=await browser.newContext({viewport:{width:320,height:812},reducedMotion:"reduce",isMobile:true,hasTouch:true});
    await context.route("**/storage/v1/object/public/music/**",route=>route.fulfill({status:200,contentType:"audio/wav",body:pcm}));
    const page=await context.newPage(),errors=[];
    page.on("pageerror",e=>errors.push(e.message));
    await page.goto(`${base}/demo/${id}/namuna`,{waitUntil:"load"});
    await page.waitForSelector('[data-opened="true"]');
    const noAutoplay=await page.locator("audio").evaluate(el=>el.paused&&el.currentTime===0);
    await page.getByRole("button",{name:t.music.play,exact:true}).tap();
    const plays=await page.waitForFunction(()=>{const a=document.querySelector("audio");return a&&!a.paused&&a.currentTime>0;},undefined,{timeout:7000}).then(()=>true).catch(()=>false);
    if(plays)await page.getByRole("button",{name:t.music.pause,exact:true}).tap();
    const pauses=await page.locator("audio").evaluate(el=>el.paused);
    await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));await page.waitForTimeout(200);
    const reducedVisible=await page.locator("[data-reveal]").evaluateAll(els=>els.every(el=>getComputedStyle(el).opacity==="1"));
    const watermark=await page.getByText("НАМУНА",{exact:true}).count()>0;
    const extra={id,noAutoplay,plays,pauses,reducedVisible,watermark,errors};extras.push(extra);console.log(JSON.stringify(extra));
    await context.close();
  }
  const passed=results.every(r=>r.status===200&&r.events===r.expectedEvents&&(!r.long||r.events===3)&&r.nameCorrect&&r.mapsCorrect&&!r.overflow&&!r.clippedWords&&!r.hidden&&!r.autoplay&&!r.hasOpening&&!r.errors.length)&&extras.every(r=>r.noAutoplay&&r.plays&&r.pauses&&r.reducedVisible&&r.watermark&&!r.errors.length);
  await writeFile(`${out}/report.json`,JSON.stringify({scope:"local Next + headless Chrome; music uses native HTMLAudio with PCM fixture; not production or licensed-track audit",results,extras,passed},null,2)+"\n");
  console.log(JSON.stringify({passed,cases:results.length,extras:extras.length}));if(!passed)process.exitCode=1;
}finally{await browser.close();}
