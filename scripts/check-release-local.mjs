// Read-only release smoke against a local production server on port 3100.
import './ts-hooks.mjs';
import {chromium} from 'playwright-core';
import {writeFile} from 'node:fs/promises';
const {activeDesigns}=await import('../templates/registry.ts');
// Next registers local Arial/Times fallback aliases; these may be absent on Linux.
// Report them separately; require the actual self-hosted font faces to load.
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const base='http://localhost:3100',results=[];
try {
const page=await browser.newPage({viewport:{width:375,height:812},isMobile:true,hasTouch:true});
await page.route('**/*',r=>new URL(r.request().url()).hostname==='localhost'?r.continue():r.abort());
let errors=[];page.on('pageerror',e=>errors.push(e.message));
const catalog=await page.goto(base+'/catalog',{waitUntil:'networkidle'});
results.push({id:'catalog',status:catalog.status(),cards:await page.locator('li').count()});
await page.close();
const designs=activeDesigns(); let cursor=0;
async function worker(){
 const page=await browser.newPage({viewport:{width:375,height:812},isMobile:true,hasTouch:true});
 await page.route('**/*',r=>new URL(r.request().url()).hostname==='localhost'?r.continue():r.abort());
 let errors=[];page.on('pageerror',e=>errors.push(e.message));
 while(cursor<designs.length){
 const d=designs[cursor++];errors=[];
 const response=await page.goto(base+'/demo/'+d.id,{waitUntil:'networkidle'});
 await page.evaluate(()=>document.fonts.ready);
 if(await page.locator('[data-open]').count())await page.locator('[data-open]').click();
 await page.waitForSelector('[data-opened="true"]');
 const result={id:d.id,status:response.status(),opened:true,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),fonts:await page.evaluate(()=>({loaded:[...document.fonts].filter(f=>f.status==='loaded').length,failed:[...document.fonts].filter(f=>f.status==='error'&&!f.family.endsWith(' Fallback')).length,systemFallbackUnavailable:[...document.fonts].filter(f=>f.status==='error'&&f.family.endsWith(' Fallback')).length})),errors:[...errors]};results.push(result);
}
await page.close();
}
await Promise.all(Array.from({length:4},()=>worker()));
}finally{await browser.close();}
const passed=results.length===51&&results[0].status===200&&results[0].cards===50&&results.slice(1).every(r=>r.status===200&&r.opened&&!r.overflow&&r.fonts.loaded>0&&r.fonts.failed===0&&!r.errors.length);
await writeFile('docs/reviews/2026-10-29-release-local-smoke.json',JSON.stringify({scope:'Local production build; localhost only; external requests blocked; no database credentials, no bot calls, no production access',passed,results},null,2)+'\n');console.log({passed,pages:results.length});if(!passed)process.exitCode=1;
