// Headless acceptance against a running production server. Only public sample data.
import "./ts-hooks.mjs";
import { chromium } from "playwright-core";
import { mkdir, writeFile } from "node:fs/promises";
const { activeDesigns } = await import("../templates/registry.ts");
const base = process.env.CHECK_BASE_URL ?? "http://127.0.0.1:3100";
const longOnly = process.env.CHECK_LONG_ONLY === "1";
const out = `screens/mobile-regression${longOnly ? "-long" : ""}`;
await mkdir(out,{recursive:true});
const browser = await chromium.launch({channel:"chrome",headless:true});
const results = [];
try {
  for(const design of activeDesigns()) {
    for (const test of longOnly ? [{width:375,long:true}] : [{width:360,long:false},{width:375,long:false},{width:430,long:false}]) {
      const context = await browser.newContext({viewport:{width:test.width,height:812},isMobile:true,hasTouch:true,deviceScaleFactor:1});
      const page = await context.newPage();
      const errors=[];
      page.on("pageerror", e=>errors.push(e.message));
      page.on("console", msg=>{if(msg.type()==="error") errors.push(msg.text());});
      const response=await page.goto(`${base}/demo/${design.id}${test.long?"/long":""}`,{waitUntil:"load"});
      await page.evaluate(()=>document.fonts.ready);
      const opener=page.locator("[data-open]").first();
      if(await opener.count()) await opener.click();
      await page.waitForSelector('[data-opened="true"]',{timeout:20000});
      await page.waitForTimeout(400);
      const metrics=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight}));
      await page.screenshot({path:`${out}/${design.id}-${test.width}${test.long?"-long":""}.png`});
      let hidden=0;
      for(const fraction of [0.5,1]) {
        await page.evaluate(f=>window.scrollTo(0,document.documentElement.scrollHeight*f),fraction);
        await page.waitForTimeout(120);
        hidden+=await page.evaluate(()=>[...document.querySelectorAll('[data-reveal="hidden"]')].filter(el=>{const r=el.getBoundingClientRect();return r.top<innerHeight&&r.bottom>0;}).length);
      }
      const result={design:design.id,...test,status:response.status(),overflow:metrics.scrollWidth>metrics.width,visibleHidden:hidden,errors:[...new Set(errors)]};
      results.push(result);
      console.log(JSON.stringify(result));
      await context.close();
    }
  }
  const context=await browser.newContext({viewport:{width:375,height:812},reducedMotion:"reduce"});
  const page=await context.newPage();
  await page.goto(`${base}/demo/ipak-romol`);
  await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
  await page.waitForTimeout(200);
  const reducedMotionVisible=await page.evaluate(()=>[...document.querySelectorAll('[data-reveal]')].every(el=>getComputedStyle(el).opacity==="1"));
  const summary={results,reducedMotionVisible,passed:results.every(r=>r.status===200&&!r.overflow&&!r.visibleHidden&&!r.errors.length)&&reducedMotionVisible};
  await writeFile(`${out}/report.json`,JSON.stringify(summary,null,2));
  console.log(JSON.stringify({passed:summary.passed,cases:results.length,reducedMotionVisible}));
  if(!summary.passed) process.exitCode=1;
} finally { await browser.close(); }
