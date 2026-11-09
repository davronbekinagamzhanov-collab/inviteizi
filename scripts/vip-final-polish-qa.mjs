/** Final audit of the two VIP designs and regression of the five retained invitations. Set VIP_ORIGIN to the exact READY deployment, never a stale branch URL. */
import {chromium} from 'playwright-core';
import {readFileSync} from 'node:fs';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash,X509Certificate} from 'node:crypto';
import assert from 'node:assert/strict';

const origin=new URL(process.env.VIP_ORIGIN??'http://localhost:3000').origin;
assert.ok(origin.startsWith('https://')||process.env.VIP_ALLOW_LOCAL==='1','Use the actual HTTPS Preview; local checks require VIP_ALLOW_LOCAL=1');
const ids=process.argv.slice(2).filter(x=>!x.startsWith('--'));
if(!ids.length)ids.push('vip-ipak-ziyosi','vip-zarbof','vip-tilla-muhr','vip-osmon','vip-suzana','vip-visol-nuri','vip-zarrin-ahd');
const output=resolve(process.env.VIP_REPORT_DIR??'work/vip-live');await mkdir(output,{recursive:true});
const caPath=process.env.NODE_EXTRA_CA_CERTS;
const pin=caPath?createHash('sha256').update(new X509Certificate(readFileSync(caPath)).publicKey.export({type:'spki',format:'der'})).digest('base64'):null;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',headless:true,args:['--no-sandbox',...(pin?[`--ignore-certificate-errors-spki-list=${pin}`]:[])]});
let storageState;
const report={origin,commit:process.env.VIP_COMMIT_SHA??null,deployment:process.env.VIP_DEPLOYMENT_ID??null,browser:browser.version(),checkedAt:new Date().toISOString(),pages:[],limits:['Chromium mobile emulation; no physical iPhone/Safari','2GIS application launch on a real phone is not emulated','No production orders, database writes or live RSVP submissions']};
try{
 if(process.env.VIP_ACCESS_FILE){
  const access=JSON.parse(readFileSync(process.env.VIP_ACCESS_FILE,'utf8'));assert.equal(new URL(access.url).origin,origin);
  const auth=await browser.newContext();const p=await auth.newPage();await p.goto(access.url,{waitUntil:'networkidle'});assert.equal(new URL(p.url()).origin,origin);storageState=await auth.storageState();await auth.close();
 }
 for(const id of ids){
  const pageResult={id,url:`${origin}/demo/${id}`,sizes:[]};
  for(const width of [320,360,375,390,430]){
   const height=width===390?844:width===430?932:width===375?812:740;
   const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:true,hasTouch:true,locale:'ru-RU',storageState});
   await context.addInitScript(()=>localStorage.setItem('inviteizi:lang','ru'));
   const p=await context.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
   const response=await p.goto(pageResult.url,{waitUntil:'networkidle'});assert.equal(response.status(),200);await p.waitForFunction(()=>document.documentElement.lang==='uz');
   const vip=id==='vip-ipak-ziyosi'||id==='vip-zarbof';const cover=p.locator('[data-master-opening],[data-vip-envelope],[data-signature-opening]');
   await p.locator('[data-master-opening][data-ready=true],[data-vip-envelope][data-ready=true],[data-signature-opening][data-ready=true]').waitFor();await p.evaluate(()=>document.fonts.ready);
   assert.equal(await p.locator('[data-vip-sheet]').count(),0);
   if(width===390)await p.screenshot({path:`${output}/${id}-closed.png`});
   // Measure the animation from the actual browser gesture, excluding Playwright actionability/polling latency.
   await p.evaluate(()=>{
    window.__vipCls=0;window.__vipFrames=[];window.__vipMeasure=false;window.__vipTiming={};
    const shifts=new PerformanceObserver(list=>{for(const e of list.getEntries())if(window.__vipMeasure)window.__vipCls+=e.value;});shifts.observe({type:'layout-shift',buffered:false});
    const el=document.querySelector('[data-open]');
    el.addEventListener('pointerdown',()=>{window.__vipTiming.tap=performance.now();window.__vipMeasure=true;let last=performance.now();const frame=now=>{if(!window.__vipMeasure)return;window.__vipFrames.push(now-last);last=now;requestAnimationFrame(frame);};requestAnimationFrame(frame);},{once:true});
    const mutations=new MutationObserver(()=>{if(!el.isConnected&&window.__vipTiming.tap!==undefined){window.__vipTiming.end=performance.now();window.__vipMeasure=false;mutations.disconnect();shifts.disconnect();}});mutations.observe(document.body,{subtree:true,childList:true});
   });
   const started=Date.now();if(width===390)await p.locator('[data-open]').dblclick({delay:65});else await p.locator('[data-open]').click();await cover.waitFor({state:'detached'});const openingWallMs=Date.now()-started;
   const performanceResult=await p.evaluate(()=>{const f=window.__vipFrames.sort((a,b)=>a-b);return{openingMs:Math.round(window.__vipTiming.end-window.__vipTiming.tap),layoutShift:window.__vipCls,frames:f.length,frameP95Ms:Math.round(f[Math.floor(f.length*.95)]??0)};});const openingMs=performanceResult.openingMs;assert.ok(Number.isFinite(openingMs)&&openingMs<3200,`${id}: opening took ${openingMs}ms after the gesture`);assert.ok(performanceResult.layoutShift<.02,'Opening must not shift the layout');
   assert.equal(await p.locator('[data-master-layout],[data-vip-layout],[data-signature-layout]').count(),1);if(vip)assert.equal(await p.locator('[data-master-layout]').getAttribute('data-master-layout'),id==='vip-ipak-ziyosi'?'cinematic-silk-v2':'grand-architecture-v2');
   const overflow=await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(overflow,false);
   const photoSlots=await p.locator('[data-vip-photo-slot]').evaluateAll(images=>images.map(img=>+img.dataset.vipPhotoSlot));assert.deepEqual(photoSlots,[1,2,3]);
   assert.equal(await p.locator('[data-vip-section=program] img,[data-vip-section=venue] img').count(),0);
   assert.equal(await p.locator('img[src*="hall-"],img[src*="vip-suzana/hero.webp"]').count(),0);
   await p.locator('[data-vip-section=date]').scrollIntoViewIfNeeded();await p.waitForTimeout(850);const marked=p.locator('[data-vip-section=date] [aria-current=date]');assert.equal(await marked.count(),1);assert.match(await marked.innerText(),/^\d{1,2}$/);if(vip){const timer=p.locator('[data-vip-countdown]');assert.equal(await timer.count(),1);const target=new Date(await timer.getAttribute('data-target-at'));if(target.getTime()>Date.now()){const digits=await timer.locator('[data-count-value]').allTextContents();assert.equal(digits.length,4);assert.ok(digits.every(x=>/^\d{2,}$/.test(x)));const before=await timer.locator('[data-unit=seconds]').innerText();await p.waitForFunction(value=>document.querySelector('[data-unit=seconds]')?.textContent!==value,before,{timeout:3500});}if(id==='vip-zarbof'){assert.equal(await p.locator('[data-wedding-calendar="embroidered-cloth"]').count(),1);assert.equal(await p.locator('[data-vip-section=date] ellipse,[data-vip-section=date] textPath').count(),0);const fits=await p.evaluate(()=>{const root=document.querySelector('[data-wedding-calendar]'),path=root.querySelector('svg path'),m=path.getScreenCTM().inverse();return [...root.querySelectorAll('[data-calendar-grid] span')].filter(e=>/^\d+$/.test(e.textContent)).every(e=>{const r=document.createRange();r.selectNodeContents(e);const b=r.getBoundingClientRect();return[[b.left,b.top],[b.left,b.bottom],[b.right,b.top],[b.right,b.bottom]].every(([x,y])=>path.isPointInFill(new DOMPoint(x,y).matrixTransform(m)));});});assert.ok(fits,'All dates must remain on the ceremonial cloth');}}
   const music=p.locator('[data-music-button]');assert.equal(await music.count(),1);
   if(await music.getAttribute('aria-pressed')!=='true')await music.click();await p.waitForFunction(()=>{const a=document.querySelector('audio');return a&&!a.paused&&a.readyState>=2;},undefined,{timeout:15000});await music.click();await p.waitForFunction(()=>document.querySelector('audio')?.paused===true);await music.click();await p.waitForFunction(()=>{const a=document.querySelector('audio');return a&&!a.paused&&a.readyState>=2;},undefined,{timeout:15000});
   await p.locator('[data-vip-section=venue]').scrollIntoViewIfNeeded();await p.waitForTimeout(850);const maps=await p.locator('[data-vip-section=venue] a,[data-vip-section=program] a').evaluateAll(links=>links.map(a=>a.href));assert.ok(maps.length&&maps.every(h=>h.startsWith('https://2gis.kz/')));
   const uzMapLabel=await p.locator('[data-vip-section=venue] a').first().innerText();const lang=p.locator('[data-lang-switch]');assert.equal(await lang.count(),1);const langY=await lang.evaluate(el=>el.getBoundingClientRect().bottom);assert.ok(langY<=0);
   let popupUrl=null;
   if(width===390){
    await p.screenshot({path:`${output}/${id}-venue.png`});const popupPromise=context.waitForEvent('page');await p.locator('[data-vip-section=venue] a,[data-vip-section=program] a').first().click();const popup=await popupPromise;await popup.waitForURL(url=>url.hostname.includes('2gis'),{waitUntil:'commit',timeout:15000});popupUrl=popup.url();await popup.close();
   }
   await p.locator('[data-vip-section=closing]').scrollIntoViewIfNeeded();await p.waitForTimeout(850);await p.evaluate(()=>scrollTo(0,0));await p.waitForTimeout(500);
   await lang.getByRole('button',{name:'Русский',exact:true}).click();assert.equal(await lang.getByRole('button',{name:'Русский',exact:true}).getAttribute('aria-pressed'),'true');assert.equal(await p.evaluate(()=>document.documentElement.lang),'ru');assert.notEqual(await p.locator('[data-vip-section=venue] a').first().innerText(),uzMapLabel);if(vip)assert.equal(await p.locator('[data-photo-caption]').getByText('Два сердца. Одна судьба.',{exact:true}).count(),1);await lang.getByRole('button',{name:'Ўзбекча',exact:true}).click();assert.equal(await p.locator('[data-vip-section=venue] a').first().innerText(),uzMapLabel);
   for(const img of await p.locator('[data-vip-photo-slot]').all())assert.equal(await img.evaluate(el=>el.complete&&el.naturalWidth>0),true);
   if(width===390){await p.screenshot({path:`${output}/${id}-opened.png`});if(vip){for(const section of ['hero','greeting','date','program','venue','memory','closing']){const x=p.locator(`[data-vip-section=${section}]`);await x.scrollIntoViewIfNeeded();await p.waitForTimeout(900);await x.screenshot({path:`${output}/${id}-${section}-scene.png`});}await p.evaluate(()=>scrollTo(0,0));await lang.getByRole('button',{name:'Русский',exact:true}).click();for(const section of ['date','venue','closing']){const x=p.locator(`[data-vip-section=${section}]`);await x.scrollIntoViewIfNeeded();await p.waitForTimeout(800);await x.screenshot({path:`${output}/${id}-${section}-ru.png`});}}}
   assert.deepEqual(errors,[]);pageResult.sizes.push({width,height,openingMs,openingWallMs,noHorizontalOverflow:true,photoSlots,calendar:true,openingPerformance:performanceResult,musicPauseAndResume:true,maps,popupUrl,oneLanguageControl:true,consoleErrors:errors});await context.close();
  }
  const reduced=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',storageState});
  const rp=await reduced.newPage(),reducedErrors=[];rp.on('pageerror',e=>reducedErrors.push(e.message));rp.on('console',m=>{if(m.type()==='error')reducedErrors.push(m.text());});await rp.goto(pageResult.url,{waitUntil:'networkidle'});
  await rp.locator('[data-master-opening][data-ready=true],[data-vip-envelope][data-ready=true],[data-signature-opening][data-ready=true]').waitFor();
  await rp.locator('[data-open]').focus();const rt=Date.now();await rp.keyboard.press('Enter');
  await rp.locator('[data-open]').waitFor({state:'detached'});assert.ok(Date.now()-rt<1000);
  assert.equal(await rp.locator('[data-opened=true]').count(),1);assert.deepEqual(reducedErrors,[]);await reduced.close();
  pageResult.reducedMotionAndKeyboard=true;
  const framesContext=await browser.newContext({viewport:{width:390,height:844},storageState});
  const fp=await framesContext.newPage();await fp.goto(pageResult.url,{waitUntil:'networkidle'});
  await fp.locator('[data-master-opening][data-ready=true],[data-vip-envelope][data-ready=true],[data-signature-opening][data-ready=true]').waitFor();
  await fp.locator('[data-open]').click();const frameStart=Date.now();const frames=[];
  for(const at of [150,500,950,1400]){const delay=at-(Date.now()-frameStart);if(delay>0)await fp.waitForTimeout(delay);frames.push(Date.now()-frameStart);await fp.screenshot({path:`${output}/${id}-opening-${at}.png`});}
  await fp.locator('[data-open]').waitFor({state:'detached'});await framesContext.close();pageResult.openingFramesMs=frames;
  report.pages.push(pageResult);console.log(JSON.stringify(pageResult));
 }
 report.status='PASS';
} catch(e){report.status='FAIL';report.failure=e.message;throw e;}
finally{await writeFile(`${output}/verification.json`,JSON.stringify(report,null,2)+'\n');await browser.close();}
