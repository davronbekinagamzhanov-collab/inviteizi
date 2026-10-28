// Final registry/catalog/asset/demo contract. Local read-only HTTP, no bot or database writes.
import "./ts-hooks.mjs";
import {chromium} from "playwright-core";
import {mkdir,writeFile} from "node:fs/promises";
import path from "node:path";
const {activeDesigns,PRICES}=await import("../templates/registry.ts"),{t}=await import("../texts/uz-cyrl.ts");
const base=process.env.CHECK_BASE_URL??"http://127.0.0.1:3114",out=process.env.CHECK_CATALOG_REPORT??"screens/catalog/report.json";
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Local checks only');
const designs=activeDesigns(),results=[];if(designs.length!==50)throw Error('Expected exactly 50 accepted designs');
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:375,height:812}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const response=await page.goto(base+'/catalog',{waitUntil:'networkidle'});
 const cards=await page.locator('li').count(),hidden=await page.locator('a[href="/demo/anor-bogi"]').count(),overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
 for(const d of designs){const card=page.locator('li').filter({has:page.locator(`a[href="/demo/${d.id}"]`)}),count=await card.count();
  const text=count===1?(await card.innerText()).replace(/\s+/g,' '):'',src=count===1?await card.locator('img').getAttribute('src'):null;
  const image=src?new URL(src,base):undefined,cover=image?(image.searchParams.get('url')??image.pathname):undefined;
  results.push({id:d.id,format:d.format,price:PRICES[d.format],card:count===1,name:text.includes(t.designs[d.id]),formatCorrect:text.toLowerCase().includes(t.formats[d.format].toLowerCase()),priceCorrect:text.includes(t.price(PRICES[d.format]).replace(/\s+/g,' ')),coverCorrect:cover===d.cover});
 }
 results.unshift({catalogStatus:response.status(),cards,hidden,overflow,errors});
}finally{await browser.close();}
for(const d of designs){const result=results.find(r=>r.id===d.id);try{
 const response=await fetch(`${base}/demo/${d.id}`,{redirect:'error'}),html=await response.text();result.demoStatus=response.status;result.templateMounted=html.includes('data-opened=');
 result.assets=await Promise.all([['covers','jpg','image/jpeg'],['covers','webp','image/webp'],['og','jpg','image/jpeg']].map(async([folder,ext,mime])=>{const url=`/${folder}/${d.id}.${ext}`,r=await fetch(base+url,{redirect:'error'}),bytes=(await r.arrayBuffer()).byteLength;return {url,status:r.status,mime:r.headers.get('content-type')?.split(';')[0],expectedMime:mime,bytes};}));
}catch(e){result.error=e.message;}console.log(JSON.stringify(result));}
const catalog=results[0],passed=catalog.catalogStatus===200&&catalog.cards===50&&catalog.hidden===0&&!catalog.overflow&&!catalog.errors.length&&results.slice(1).every(r=>r.card&&r.name&&r.formatCorrect&&r.priceCorrect&&r.coverCorrect&&r.demoStatus===200&&r.templateMounted&&!r.error&&r.assets?.every(a=>a.status===200&&a.mime===a.expectedMime&&a.bytes>0));
await mkdir(path.dirname(out),{recursive:true});await writeFile(out,JSON.stringify({scope:'Local production catalog DOM at 375px, 50 read-only demo responses, 150 image responses; not an audit of production orders',passed,results},null,2)+'\n');console.log(JSON.stringify({passed,cards:50,demos:50,assets:150}));if(!passed)process.exitCode=1;
