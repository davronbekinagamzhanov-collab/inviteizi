/** Verify the four unlisted ordinary celebrations on an exact READY HTTPS deployment. */
import {chromium} from 'playwright-core';
import {readFileSync} from 'node:fs';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash,X509Certificate} from 'node:crypto';
import assert from 'node:assert/strict';
const origin=new URL(process.env.CELEBRATION_ORIGIN??'http://localhost:3040').origin;
assert.ok(origin.startsWith('https://')||process.env.CELEBRATION_ALLOW_LOCAL==='1');
const stress=process.argv.includes('--stress'),out=process.env.CELEBRATION_REPORT_DIR??'/tmp/celebration-qa';await mkdir(out,{recursive:true});
const ids=['sahar-sabosi','subhi-safo','mehr-fasli','qutlug-nihol'];
const ca=process.env.NODE_EXTRA_CA_CERTS,pin=ca?createHash('sha256').update(new X509Certificate(readFileSync(ca)).publicKey.export({type:'spki',format:'der'})).digest('base64'):null;
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox',...(pin?[`--ignore-certificate-errors-spki-list=${pin}`]:[])]});
const report={origin,commit:process.env.CELEBRATION_COMMIT_SHA??null,deployment:process.env.CELEBRATION_DEPLOYMENT_ID??null,stress,checkedAt:new Date().toISOString(),browser:browser.version(),pages:[],limits:['Chromium mobile emulation; no physical iPhone/Safari','Native 2GIS app and production RSVP/Telegram uploads are not exercised']};
let storageState,access;
function observeErrors(p){const errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});return errors;}
async function ready(p){await p.locator('[data-celebration-opening][data-ready=true]').waitFor();await p.evaluate(()=>document.fonts.ready);}
async function language(p,lang){await p.locator('[data-lang-switch]').getByRole('button',{name:lang==='ru'?'Русский':'Ўзбекча',exact:true}).click();await p.waitForFunction(lang=>document.documentElement.lang===lang,lang);}
try{
 if(process.env.CELEBRATION_ACCESS_FILE){access=JSON.parse(readFileSync(process.env.CELEBRATION_ACCESS_FILE,'utf8'));assert.equal(new URL(access.url).origin,origin);const c=await browser.newContext(),p=await c.newPage();await p.goto(access.url,{waitUntil:'networkidle'});assert.equal(new URL(p.url()).origin,origin);storageState=await c.storageState();await c.close();}
 for(const id of ids){
  const row={id,url:`${origin}/${stress?'celebration-stress':'demo'}/${id}`,sizes:[]};
  for(const width of [320,360,375,390,430]){
   const height=width===390?844:width===430?932:width===375?812:740;
   const c=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,locale:'ru-RU',storageState});await c.addInitScript(()=>localStorage.setItem('inviteizi:lang','ru'));const p=await c.newPage(),errors=observeErrors(p);
   const response=await p.goto(row.url,{waitUntil:'networkidle'});assert.equal(response.status(),200);await ready(p);assert.equal(await p.evaluate(()=>document.documentElement.lang),'uz');assert.equal(await p.locator('[data-lang-switch]').count(),1);
   if(!stress)assert.equal(await p.locator('audio').evaluate(a=>a.paused),true);
   const uzTitle=await p.locator('[data-cover-ink]').innerText();await language(p,'ru');assert.notEqual(await p.locator('[data-cover-ink]').innerText(),uzTitle);if(width===390)await p.screenshot({path:`${out}/${id}-closed-ru.png`});await language(p,'uz');
   const closedFits=await p.evaluate(()=>{const root=document.querySelector('[data-opening-name]'),r=root.getBoundingClientRect(),date=root.nextElementSibling.getBoundingClientRect(),hosts=root.nextElementSibling.nextElementSibling.getBoundingClientRect(),prompt=document.querySelector('[role=status]').getBoundingClientRect();return [...root.querySelectorAll('[data-word]')].every(w=>{const b=w.getBoundingClientRect();return b.left>=r.left-1&&b.right<=r.right+1;})&&r.bottom<=date.top+1&&date.bottom<=hosts.top+1&&hosts.bottom<prompt.top;});assert.ok(closedFits,`${id} ${width}: closed name hierarchy overlaps`);
   if(width===390)await p.screenshot({path:`${out}/${id}-closed.png`});
   await p.evaluate(()=>{const el=document.querySelector('[data-open]');window.__opening={};el.addEventListener('pointerdown',()=>{window.__opening.start=performance.now();},{once:true});const observer=new MutationObserver(()=>{if(!el.isConnected){window.__opening.end=performance.now();observer.disconnect();}});observer.observe(document.body,{childList:true,subtree:true});});
   if(width===390)await p.locator('[data-open]').dblclick({delay:65});else await p.locator('[data-open]').click();await p.locator('[data-open]').waitFor({state:'detached'});const openingMs=await p.evaluate(()=>Math.round(window.__opening.end-window.__opening.start));assert.ok(openingMs<3200,`Opening took ${openingMs}ms`);assert.equal(await p.locator('[data-celebration-layout]').count(),1);assert.equal(await p.locator('[data-opened=true]').count(),1);
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   assert.ok(await p.locator('[data-person-name]').evaluate(el=>{const r=el.getBoundingClientRect();return [...el.querySelectorAll('[data-word]')].every(w=>{const b=w.getBoundingClientRect();return b.left>=r.left-1&&b.right<=r.right+1;});}),'Person name clipped');
   assert.equal(await p.locator('[data-celebration-art]').evaluateAll(xs=>xs.every(x=>x.complete&&x.naturalWidth>0)),true);
   const calendar=p.locator('[data-section=date]');await calendar.scrollIntoViewIfNeeded();await p.waitForTimeout(200);const marked=calendar.locator('[aria-current=date]');assert.equal(await marked.count(),1);assert.equal(await marked.innerText(),await calendar.locator('[data-calendar-heading] strong').innerText());
   const target=await calendar.locator('[data-target-at]').getAttribute('data-target-at'),datetime=await calendar.locator('[data-calendar-heading] time').getAttribute('datetime');assert.equal(target,new Date(datetime+'+05:00').toISOString());
   const timer=calendar.locator('[data-celebration-countdown]');if(new Date(target).getTime()>Date.now()){assert.equal(await timer.locator('[data-count-value]').count(),4);const seconds=await timer.locator('[data-unit=seconds]').innerText();await p.waitForFunction(value=>document.querySelector('[data-unit=seconds]')?.textContent!==value,seconds,{timeout:3500});}
   if(!stress){const music=p.locator('[data-music-button]');assert.equal(await music.count(),1);if(await music.getAttribute('aria-pressed')!=='true')await music.click();await p.waitForFunction(()=>{const a=document.querySelector('audio');return a&&!a.paused&&a.readyState>=2;});await music.click();await p.waitForFunction(()=>document.querySelector('audio')?.paused===true);await music.click();await p.waitForFunction(()=>{const a=document.querySelector('audio');return a&&!a.paused&&a.readyState>=2;});}
   const venue=p.locator('[data-section=venue]');await venue.scrollIntoViewIfNeeded();await p.waitForTimeout(250);const maps=await venue.locator('a').evaluateAll(xs=>xs.map(x=>x.href));assert.equal(maps.length,stress?3:id==='qutlug-nihol'?2:1);assert.ok(maps.every(x=>x.startsWith('https://2gis.kz/geo/')));assert.equal(await venue.locator('img').count(),0);
   let popupUrl=null;if(!stress&&width===390){const popupPromise=c.waitForEvent('page');await venue.locator('a').first().click();const popup=await popupPromise;await popup.waitForURL(u=>u.hostname.includes('2gis'),{waitUntil:'commit',timeout:15000});popupUrl=popup.url();await popup.close();}
   const uzMap=await venue.locator('a').first().innerText();await language(p,'ru');assert.notEqual(await venue.locator('a').first().innerText(),uzMap);if(width===390)for(const section of ['hero','letter','date','venue','closing']){const el=p.locator(`[data-section=${section}]`);await el.scrollIntoViewIfNeeded();await p.waitForTimeout(250);await el.screenshot({path:`${out}/${id}-${section}-ru.png`});}await language(p,'uz');
   if(width===390)for(const section of ['hero','letter','date','venue','closing']){const el=p.locator(`[data-section=${section}]`);await el.scrollIntoViewIfNeeded();await p.waitForTimeout(250);await el.screenshot({path:`${out}/${id}-${section}.png`});}
   await p.locator('[data-section=closing]').scrollIntoViewIfNeeded();assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);row.sizes.push({width,height,openingMs,uzStartAndRuToggle:true,calendar:true,countdown:true,maps,popupUrl,music:!stress,closedNamesFit:true,noHorizontalOverflow:true,consoleErrors:errors});await c.close();
  }
  const reduced=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',storageState}),p=await reduced.newPage(),errors=observeErrors(p);await p.goto(row.url,{waitUntil:'networkidle'});await ready(p);await p.locator('[data-open]').focus();const started=Date.now();await p.keyboard.press('Enter');await p.locator('[data-open]').waitFor({state:'detached'});assert.ok(Date.now()-started<1200);assert.deepEqual(errors,[]);row.reducedMotionAndKeyboard=true;await reduced.close();
  if(access&&!stress){const fresh=await browser.newContext({viewport:{width:390,height:844},locale:'ru-RU'}),p=await fresh.newPage(),errors=observeErrors(p),url=new URL(access.url);url.pathname='/demo/'+id;const r=await p.goto(url.href,{waitUntil:'networkidle'});assert.equal(r.status(),200);assert.equal(new URL(p.url()).origin,origin);await ready(p);assert.equal(await p.evaluate(()=>document.documentElement.lang),'uz');await p.locator('[data-open]').click();await p.locator('[data-open]').waitFor({state:'detached'});assert.deepEqual(errors,[]);row.freshShareLink=true;await fresh.close();}
  report.pages.push(row);console.log(JSON.stringify({id,sizes:row.sizes.length,reduced:true,share:row.freshShareLink??null}));
 }
 report.status='PASS';
}catch(e){report.status='FAIL';report.failure=e.message;throw e;}finally{await writeFile(out+'/verification.json',JSON.stringify(report,null,2)+'\n');await browser.close();}
