/** npm ci first. No extra packages. Uses existing playwright-core and system Chromium/ffmpeg. */
import { mkdir, writeFile, copyFile, rm, rename } from 'node:fs/promises';
import { resolve } from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash,X509Certificate} from 'node:crypto';

const {chromium}=await import('playwright-core');
const origin=process.env.VIP_ORIGIN??'http://localhost:3000';
const checkOrigin=process.env.VIP_CHECK_ORIGIN??origin;
const openingOnly=process.argv.includes('--opening-only');
const requestedIds=process.argv.slice(2).filter(x=>x!=='--opening-only');
const ids=requestedIds.length?requestedIds:['vip-tilla-muhr','vip-osmon','vip-suzana'];
// Trust only the managed environment's supplied proxy CA, pinned by its public key.
// Do not disable HTTPS certificate verification globally.
const caPath=process.env.NODE_EXTRA_CA_CERTS;
const caPin=caPath?createHash('sha256').update(new X509Certificate(readFileSync(caPath)).publicKey.export({type:'spki',format:'der'})).digest('base64'):null;
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox',...(caPin?[`--ignore-certificate-errors-spki-list=${caPin}`]:[])]});
const checkErrors=[];
async function open(page,id,path=`/demo/${id}`,base=origin) {
  const response=await page.goto(base+path,{waitUntil:'networkidle'});
  assert.equal(response.status(),200,path);
  await page.locator('[data-open][data-ready=true]').waitFor();
  await page.evaluate(()=>document.fonts.ready);
}
async function noOverflow(page) {
  const value=await page.evaluate(()=>({width:innerWidth,height:innerHeight,scroll:document.documentElement.scrollWidth}));
  assert.ok(value.scroll<=value.width,JSON.stringify(value));
  return value;
}
function watch(page) {
  page.on('pageerror',e=>checkErrors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')checkErrors.push(m.text());});
}
async function startFrames(page){await page.evaluate(()=>{window.__vipFrames=[];window.__vipCapture=true;const tick=t=>{if(!window.__vipCapture)return;window.__vipFrames.push(t);requestAnimationFrame(tick);};requestAnimationFrame(tick);});}
async function stopFrames(page){return page.evaluate(()=>{window.__vipCapture=false;const a=window.__vipFrames;const d=a.slice(1).map((t,i)=>t-a[i]);const sorted=[...d].sort((a,b)=>a-b);return{frames:a.length,durationMs:+(a.at(-1)-a[0]).toFixed(2),fps:+((a.length-1)*1000/(a.at(-1)-a[0])).toFixed(2),p95FrameMs:+sorted[Math.floor(sorted.length*.95)].toFixed(2),framesOver33ms:d.filter(x=>x>33.4).length};});}
async function openingReview(id){
 const out=resolve('docs/reviews/vip',id,'opening-v2');await mkdir(out,{recursive:true});
 const errors=[];
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,locale:'uz-UZ',recordVideo:{dir:out+'/raw-video',size:{width:390,height:844}}});
 const recordingStarted=Date.now();
 const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await open(p,id);const trimStart=Math.max(0,(Date.now()-recordingStarted-60)/1000);assert.equal(await p.locator('[data-lang-switch]').count(),1);
 const seal=await p.locator('[data-vip-wax]').evaluate(el=>({width:el.clientWidth,screen:innerWidth}));assert.ok(Math.abs(seal.width/seal.screen-.34)<.01);
 await p.screenshot({path:out+'/390-envelope.png'});await p.waitForTimeout(300);
 await p.evaluate(()=>{window.__vipOpeningPhases=['idle'];new MutationObserver(records=>{for(const r of records)if(r.attributeName==='data-phase')window.__vipOpeningPhases.push(r.target.dataset.phase);}).observe(document.querySelector('[data-vip-envelope]'),{attributes:true});});
 await p.locator('[data-open]').click();
 for(const [name,phase,delay] of [['01-seal-crack','crack',300],['02-flap-lining','flap',1000],['03-sheet-names','letter',1050],['04-envelope-depart','depart',430]]){
  await p.locator(`[data-vip-envelope][data-phase=${phase}]`).waitFor();await p.waitForTimeout(delay);assert.equal(await p.locator('[data-vip-hero-ink]').evaluate(el=>+getComputedStyle(el).opacity),0,'The background names must wait for the final reveal');await p.screenshot({path:`${out}/390-${name}.png`});
 }
 await p.locator('[data-vip-envelope]').waitFor({state:'detached'});await p.waitForTimeout(550);await p.screenshot({path:out+'/390-opened.png'});
 const phases=await p.evaluate(()=>window.__vipOpeningPhases);assert.deepEqual(phases,['idle','crack','flap','letter','depart','reveal']);await noOverflow(p);
 const video=p.video();await context.close();
 await promisify(execFile)(process.env.FFMPEG_PATH??'ffmpeg',['-hide_banner','-loglevel','error','-ss',String(trimStart),'-i',await video.path(),'-an','-c:v','libvpx-vp9','-crf','28','-b:v','0','-deadline','good','-cpu-used','4','-y',out+'/opening-trimmed.webm']);
 await rename(out+'/opening-trimmed.webm',out+'/opening.webm');await rm(out+'/raw-video',{recursive:true,force:true});
 const checks={phaseOrder:true,sealRatio:seal.width/seal.screen,viewports:[],venueLanguageControls:[]};
 for(const [width,height] of [[390,844],[360,740],[320,740],[375,812],[430,932]]){
  const c=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true});const q=await c.newPage();q.on('pageerror',e=>errors.push(e.message));await open(q,id);await q.locator('[data-open]').press('Enter');
  await q.locator('[data-phase=letter]').waitFor();await q.waitForTimeout(1070);
  const ink=await q.locator('[data-vip-sheet-ink]').evaluate(el=>({opacity:+getComputedStyle(el).opacity,top:el.getBoundingClientRect().top,bottom:el.getBoundingClientRect().bottom,hinge:innerHeight*.343}));
  assert.ok(ink.opacity>0,'The complete inscription must be visible before departure');
  await q.locator('[data-vip-envelope]').waitFor({state:'detached'});checks.viewports.push(await noOverflow(q));
  const switcher=q.locator('[data-lang-switch]');assert.equal(await switcher.count(),1);assert.ok((await switcher.boundingBox()).y<30);
  await q.locator('[data-vip-section=venue]').scrollIntoViewIfNeeded();await q.waitForTimeout(800);
  const controls=await switcher.evaluateAll(els=>({total:els.length,onScreen:els.filter(el=>{const r=el.getBoundingClientRect();return r.bottom>0&&r.top<innerHeight;}).length}));assert.deepEqual(controls,{total:1,onScreen:0});checks.venueLanguageControls.push({width,...controls});
  if(width===390)await q.screenshot({path:out+'/390-venue-single-header-control.png'});
  if(width===360){await q.evaluate(()=>scrollTo(0,0));await q.screenshot({path:out+'/360-opened.png'});}
  await c.close();
 }
 // Reduced motion remains immediate after asset decoding. No live database writes.
 const reduced=await browser.newContext({viewport:{width:360,height:740},reducedMotion:'reduce'});const rp=await reduced.newPage();await open(rp,id);const started=Date.now();await rp.locator('[data-open]').click();await rp.locator('[data-vip-envelope]').waitFor({state:'detached'});checks.reducedMotionOpeningMs=Date.now()-started;assert.ok(checks.reducedMotionOpeningMs<700);await reduced.close();
 // Measure actual complete opening, without screenshot/video work or parallel build/tests.
 const perf=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const pp=await perf.newPage();pp.on('pageerror',e=>errors.push(e.message));await open(pp,id);const cdp=await perf.newCDPSession(pp);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});await startFrames(pp);await pp.locator('[data-open]').click();await pp.locator('[data-vip-envelope]').waitFor({state:'detached'});const opening4x=await stopFrames(pp);await perf.close();
 const report={id,revision:'opening-v2',origin,capturedAt:new Date().toISOString(),browser:browser.version(),engine:'Chromium mobile viewport; not a physical iPhone',phases,checks,opening4x,consoleErrors:[...new Set(errors)]};await writeFile(out+'/verification.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));assert.equal(errors.length,0);assert.ok(opening4x.fps>=55);
}
try{
for(const id of ids){
 if(openingOnly){await openingReview(id);continue;}
 const out=resolve('docs/reviews/vip',id);await mkdir(out,{recursive:true});
 const report={id,origin,capturedAt:new Date().toISOString(),browser:browser.version(),engine:'Chromium (not a physical iPhone)',viewports:[],heartPositions:[],checks:{}};
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,locale:'uz-UZ',recordVideo:{dir:out+'/raw-video',size:{width:390,height:844}}});
 const page=await context.newPage();watch(page);await open(page,id);
 await page.screenshot({path:out+'/390-envelope.png'});
 await page.locator('[data-open]').click();
 for(const [name,phase,delay] of [['opening-1-crack','crack',300],['opening-2-flap','flap',1000],['opening-3-letter','letter',1050],['opening-4-depart','depart',430]]){
  await page.locator(`[data-vip-envelope][data-phase=${phase}]`).waitFor();await page.waitForTimeout(delay);await page.screenshot({path:`${out}/390-${name}.png`});
 }
 await page.locator('[data-vip-envelope]').waitFor({state:'detached'});await page.screenshot({path:out+'/390-hero.png'});
 report.viewports.push(await noOverflow(page));
 for(const section of ['greeting','date','moments','program','venue','closing']){
  const block=page.locator(`[data-vip-section=${section}]`);if(!await block.count())continue;
  await block.scrollIntoViewIfNeeded();await page.waitForTimeout(950);
  await block.screenshot({path:`${out}/390-${section}.png`});
 }
 const timeline=page.locator('[data-vip-section=program] > div').last();
 const geom=await timeline.evaluate(el=>({top:el.getBoundingClientRect().top+scrollY,height:el.clientHeight}));
 for(const p of [.16,.5,.84]){
  await page.evaluate(({top,height,p})=>scrollTo(0,top-innerHeight*.65+p*(height+innerHeight*.1)),{...geom,p});await page.waitForTimeout(250);
  const heart=page.locator('[data-vip-heart]');
  report.heartPositions.push(await heart.evaluate(el=>({progress:el.dataset.progress,transform:el.style.transform,top:el.getBoundingClientRect().top})));
  await page.screenshot({path:`${out}/390-heart-${Math.round(p*100)}.png`});
 }
 assert.equal(new Set(report.heartPositions.map(x=>x.transform)).size,3,'Heart must move along path');
 report.checks.heartMoves=true;
 const links=await page.locator('[data-vip-section=venue] a').evaluateAll(a=>a.map(el=>el.href));assert.ok(links.length>0&&links.every(x=>/^https?:/.test(x)));report.checks.mapLinks=links;
 await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(300);await page.screenshot({path:out+'/390-full.png',fullPage:true});
 const video=page.video();await context.close();await copyFile(await video.path(),out+'/opening-and-scroll.webm');await rm(out+'/raw-video',{recursive:true,force:true});
 for(const [width,height] of [[360,740],[375,812],[320,740],[430,932]]){
  const c=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true});const p=await c.newPage();watch(p);await open(p,id);await p.screenshot({path:`${out}/${width}-envelope.png`});await p.locator('[data-open]').click();await p.locator('[data-vip-envelope]').waitFor({state:'detached'});report.viewports.push(await noOverflow(p));
  if(width===360){await p.screenshot({path:`${out}/360-hero.png`});await p.screenshot({path:`${out}/360-full.png`,fullPage:true});}
  await c.close();
 }
 // Long real sample and the existing RSVP preview: never writes to a database.
 const c=await browser.newContext({viewport:{width:360,height:740},reducedMotion:'reduce'});const p=await c.newPage();watch(p);
 let rsvpRequests=0;await p.route('**/api/rsvp',route=>{rsvpRequests++;return route.fulfill({status:200,body:'{}'});});
 await open(p,id,`/dev/invitation/${id}?mode=demo&long=1`,checkOrigin);await p.locator('[data-open]').click();await p.locator('[data-vip-envelope]').waitFor({state:'detached'});await noOverflow(p);
 assert.equal(await p.locator('[data-program-item]').count(),3);report.checks.threeRealEvents=true;
 const form=p.locator('[data-rsvp]');await form.scrollIntoViewIfNeeded();await form.locator('input[autocomplete=name]').fill('Тест меҳмон');await form.getByRole('button',{name:'Келаман',exact:true}).click();assert.equal(rsvpRequests,0);report.checks.rsvpPreviewNoNetwork=true;
 await form.screenshot({path:out+'/360-rsvp-preview.png'});await p.screenshot({path:out+'/360-long-reduced-motion.png',fullPage:true});
 const hidden=await p.locator('[data-reveal]').evaluateAll(els=>els.some(el=>+getComputedStyle(el).opacity<1));assert.equal(hidden,false);report.checks.reducedMotionVisible=true;
 await c.close();
 // Performance measured without screenshots or video on a fresh context, CPU throttled 4x.
 const perf=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const pp=await perf.newPage();watch(pp);await open(pp,id);
 const cdp=await perf.newCDPSession(pp);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});await startFrames(pp);await pp.locator('[data-open]').click();await pp.locator('[data-vip-envelope]').waitFor({state:'detached'});report.opening4x=await stopFrames(pp);
 const line=pp.locator('[data-vip-section=program] > div').last();const pg=await line.evaluate(el=>({top:el.getBoundingClientRect().top+scrollY,height:el.clientHeight}));
 await pp.evaluate(g=>scrollTo(0,g.top-innerHeight*.65),pg);await pp.waitForTimeout(900);await startFrames(pp);
 await pp.evaluate(async g=>{const start=performance.now();await new Promise(done=>{function tick(t){const q=Math.min(1,(t-start)/3000);scrollTo(0,g.top-innerHeight*.65+q*(g.height+innerHeight*.1));if(q<1)requestAnimationFrame(tick);else done();}requestAnimationFrame(tick);});},pg);
 report.program4x=await stopFrames(pp);await cdp.send('Emulation.setCPUThrottlingRate',{rate:1});await perf.close();
 report.consoleErrors=[...new Set(checkErrors)];report.target55fps=report.opening4x.fps>=55&&report.program4x.fps>=55;
 await writeFile(out+'/verification.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
 assert.equal(report.consoleErrors.length,0,JSON.stringify(report.consoleErrors));
 assert.ok(report.target55fps,'4x CPU frame-rate target failed; inspect verification.json');
}
}finally{await browser.close();}
