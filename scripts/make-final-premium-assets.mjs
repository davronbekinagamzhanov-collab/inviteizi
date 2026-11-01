// Local artifact generation only. No uploads, database operations or deployment.
import {chromium} from 'playwright-core';import sharp from 'sharp';import {mkdirSync,existsSync} from 'node:fs';
const ids=(process.env.IDS??'ipak-romol,rishton-koshin,marvarid-satr,dutor-navosi,kumush-taroq,sunnat-muqova,sunnat-nasab,sahar-ipagi,sahar-maktubi,umr-sahifalari,ehtirom-kartasi').split(',');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox']});
mkdirSync('screens/final-assets',{recursive:true});mkdirSync('docs/reviews/final/comparisons',{recursive:true});
for(const id of ids){const context=await browser.newContext({viewport:{width:360,height:640},deviceScaleFactor:3});const page=await context.newPage();await page.route('https://*.supabase.co/**',r=>r.abort());await page.goto(`${process.env.BASE_URL??'http://localhost:3000'}/demo/${id}`);await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(400);await page.addStyleTag({content:"[aria-label^='Мусиқани']{display:none!important}"});const first=await page.screenshot();await sharp(first).webp({quality:86}).toFile(`public/covers/${id}.webp`);await sharp(first).jpeg({quality:87,mozjpeg:true}).toFile(`public/covers/${id}.jpg`);
 if(await page.locator('[data-open]').count()){await page.locator('[data-open]').click();await page.waitForSelector('[data-opened=true]')}
 await page.setViewportSize({width:375,height:812});await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(200);await page.screenshot({path:`screens/final-assets/${id}-after.png`});
 if(existsSync(`screens/final-before/${id}.png`)){const before=await sharp(`screens/final-before/${id}.png`).resize(375,812).toBuffer();const after=await sharp(`screens/final-assets/${id}-after.png`).resize(375,812).toBuffer();await sharp({create:{width:750,height:812,channels:3,background:'#f8f4e9'}}).composite([{input:before,left:0,top:0},{input:after,left:375,top:0}]).webp({quality:86}).toFile(`docs/reviews/final/comparisons/${id}.webp`)}
 else{
  // The OG plate reuses this template's own ornament/photo, with every text node invisible.
  // Geometry and text layout stay intact; no sample name/date/venue is rasterized into OG.
  await page.evaluate(()=>{const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);const nodes=[];for(let n=walker.nextNode();n;n=walker.nextNode())if(n.textContent.trim()&&!n.parentElement.closest('script,style,noscript'))nodes.push(n);for(const n of nodes){const span=document.createElement('span');span.style.opacity='0';span.textContent=n.textContent;n.replaceWith(span)}});const artwork=await page.screenshot();await sharp(artwork).resize(420,620,{fit:'cover'}).jpeg({quality:88}).toFile(`public/og/${id}.jpg`);
 }
 await context.close();console.log(id);
}await browser.close();
