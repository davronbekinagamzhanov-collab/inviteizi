import {chromium} from 'playwright-core';
import {mkdirSync,writeFileSync} from 'node:fs';
const ids=['kabutar-salom','yelpigich-ziynat','samarqand-kitob','qosh-uzuk','saodat-kaliti'];
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const report=[];
for(const sample of ['default','long'])for(const id of ids)for(const width of (process.env.WIDTHS??'320,360,375,430').split(',').map(Number))for(const reduced of (sample==='long'?[false]:[false,true])){
 const context=await browser.newContext({viewport:{width,height:812},isMobile:true,hasTouch:true,reducedMotion:reduced?'reduce':'no-preference'});const page=await context.newPage();
 // Local WAV fixture: no requests to Production Storage during design acceptance.
 const wav=Buffer.alloc(44+16000);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(8000,24);wav.writeUInt32LE(16000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(16000,40);
 await page.route('https://*.supabase.co/**',r=>r.fulfill({status:200,contentType:'audio/wav',body:wav}));
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('audio'))errors.push(m.text())});
 const dir=`screens/premium-after/${id}/${width}${sample==='long'?'-long':''}${reduced?'-reduced':''}`;mkdirSync(dir,{recursive:true});
 await page.goto(`${process.env.BASE_URL??'http://localhost:3000'}/demo/${id}${sample==='long'?'/long':''}`,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:dir+'/cover.png'});
 await page.locator('[data-open]').click();await page.waitForSelector('[data-opened=true]');await page.waitForTimeout(150);await page.screenshot({path:dir+'/open.png'});await page.screenshot({path:dir+'/full.png',fullPage:true});
 const brokenWords=await page.evaluate(()=>{const bad=[];const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);const range=document.createRange();for(let n=walker.nextNode();n;n=walker.nextNode()){if(n.parentElement?.closest('[aria-hidden=true]'))continue;for(const m of (n.textContent??'').matchAll(/[\p{L}]{4,}/gu)){range.setStart(n,m.index);range.setEnd(n,m.index+m[0].length);const rects=[...range.getClientRects()].filter(r=>r.width);if(rects.length>1&&Math.abs(rects[0].top-rects.at(-1).top)>4)bad.push(m[0]);}}return [...new Set(bad)];});
 const state=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,names:document.querySelector('h1')?.innerText,events:document.querySelectorAll('[data-event]').length,maps:[...document.querySelectorAll('a')].filter(x=>/2gis|maps/.test(x.href)).length,images:[...document.images].filter(x=>x.loading!=='lazy').every(x=>x.complete&&x.naturalWidth>0),musicPlaying:!!document.querySelector('audio')&&!document.querySelector('audio').paused}));
 report.push({id,width,reduced,sample,...state,brokenWords,errors});console.log(id,width,reduced,state.overflow,errors.length);await context.close();
}
await browser.close();writeFileSync(process.env.REPORT??'screens/premium-after/report.json',JSON.stringify(report,null,2));if(report.some(x=>x.overflow||x.errors.length||!x.events||!x.maps||!x.images||!x.musicPlaying||x.brokenWords.length))process.exitCode=1;
