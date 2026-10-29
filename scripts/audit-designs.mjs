// Read-only local visual inventory. No bot links, tracking tokens, or production requests.
import './ts-hooks.mjs';
import {chromium} from 'playwright-core';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
const {activeDesigns}=await import('../templates/registry.ts');
const {t}=await import('../texts/uz-cyrl.ts');
const base=process.env.CHECK_BASE_URL??'http://localhost:3000';
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Local audit only');
const out='docs/reviews/design-audit-2026-10-29',raw='screens/design-audit';
await mkdir(out,{recursive:true});await mkdir(raw,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const selected=process.argv.slice(2);
const previous=selected.length ? JSON.parse(await readFile(`${out}/inventory.json`,'utf8')).results : [];
const results=[];
try{
 for(const d of activeDesigns().filter(d=>!selected.length||selected.includes(d.id))){
  const context=await browser.newContext({viewport:{width:375,height:812},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  await context.route('**/*',r=>['localhost','127.0.0.1'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   const res=await page.goto(`${base}/demo/${d.id}`,{waitUntil:'networkidle',timeout:120000});await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(500);
   const opening=await page.locator('[data-open]').count()>0;
   await page.screenshot({path:`${raw}/${d.id}-closed.png`});
   if(opening)await page.locator('[data-open]').tap();
   await page.waitForSelector('[data-opened="true"]',{timeout:15000});
   await page.waitForTimeout(1700);
   const height=await page.evaluate(()=>document.documentElement.scrollHeight);
   for(let y=0;y<height;y+=600){await page.evaluate(y=>scrollTo(0,y),y);await page.waitForTimeout(100);}
   await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(200);
   await page.screenshot({path:`${raw}/${d.id}-full.png`,fullPage:true});
   await page.screenshot({path:`${raw}/${d.id}-top.png`});
   const event=page.locator('[data-event]').first();
   if(await event.count())await event.scrollIntoViewIfNeeded();else await page.evaluate(()=>scrollTo(0,1200));
   await page.waitForTimeout(150);await page.screenshot({path:`${raw}/${d.id}-events.png`});
   const layout=await page.locator('h1,h2,[data-event]').evaluateAll(els=>els.map(el=>({tag:el.tagName,event:el.hasAttribute('data-event'),text:el.textContent?.slice(0,120),y:Math.round(el.getBoundingClientRect().top+scrollY),align:getComputedStyle(el).textAlign})));
   results.push({id:d.id,number:d.number,name:t.designs[d.id],format:d.format,occasion:d.occasion,status:res.status(),opening,height,events:await page.locator('[data-event]').count(),overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),errors,layout});
  }catch(e){results.push({id:d.id,error:e.message,errors});}
  await context.close();console.log(JSON.stringify({id:d.id,...results.at(-1)}));
 }
}finally{await browser.close();}
if(selected.length){
 const fresh=new Map(results.map(r=>[r.id,r]));
 const merged=previous.map(old=>fresh.has(old.id)?{...fresh.get(old.id),priorAttempts:[...(old.priorAttempts??[]),{errors:old.errors,error:old.error}]}:old);
 results.splice(0,results.length,...merged);
}
await writeFile(`${out}/inventory.json`,JSON.stringify({fontLimitation:'Google font domains denied in this instance; next/font/google uses dev fallbacks. Local fonts and local art are real. Repeat for final typography after network access is applied.',scope:'Local demo fixtures at 375x812; closed, opened, scrolled event view; remote requests blocked; no production orders; event count is data-event markers only (older templates use other markup)',results},null,2)+'\n');
await import('./audit-design-sheets.mjs');
if(results.length!==50||results.some(r=>r.error||r.status!==200||r.errors.length||r.overflow))process.exitCode=1;
