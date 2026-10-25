// Deterministic, isolated analytics load checks. No Telegram / Supabase / production access.
import "./ts-hooks.mjs";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";
import assert from "node:assert/strict";
import { summarize } from "../lib/analytics.ts";
const root=process.cwd().replaceAll("\\","/");
const source=execFileSync("git",["-c",`safe.directory=${root}`,"show","89b4bcf:lib/analytics.ts"],{encoding:"utf8"});
const baseline=await import(`data:text/javascript;base64,${Buffer.from(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString("base64")}`);
const now=new Date("2026-10-25T12:00:00Z");
function fixture(n) {
  const users=[],orders=[],events=[];
  for(let userId=1;userId<=n;userId++) {
    users.push({id:userId,username:`fixture${userId}`,firstName:null,createdAt:now});
    for(let j=0;j<10;j++) {
      const createdAt=new Date(+now-(j+1)*3600000),paidAt=new Date(+createdAt+1800000);
      const templateId=`fixture-design-${(userId+j)%60}`;
      orders.push({id:`${userId}-${j}`,userId,status:j<5?(j%2?"archived":"active"):"preview",occasion:["nikoh","sunnat","nahorgi","yubiley"][j%4],format:j%2?"simple":"animated",templateId,music:{kind:"none"},amount:j%2?7000:10000,createdAt,updatedAt:paidAt,paidAt:j<5?paidAt:null});
      for(const kind of ["demo_opened","design_selected","design_favorited"]) events.push({kind,userId,target:templateId,createdAt:new Date(+createdAt-60000)});
    }
  }
  return {users,orders,events,since:new Date(+now-86400000)};
}
const results=[];
for(const clients of [100,1000]) {
  const data=fixture(clients);
  const t0=performance.now(),before=baseline.summarize(data,"all",now,true),baselineMs=performance.now()-t0;
  const t1=performance.now(),after=summarize(data,"all",now,true),currentMs=performance.now()-t1;
  assert.deepEqual(after,before);
  assert.equal(after.revenue,clients*44000); assert.equal(after.paid,clients*5);
  const r={clients,orders:data.orders.length,events:data.events.length,baselineMs:+baselineMs.toFixed(2),currentMs:+currentMs.toFixed(2),sameResults:true};
  results.push(r); console.log(JSON.stringify(r));
}
const out="docs/reviews/2026-10-25-load.json";
await mkdir(path.dirname(out),{recursive:true});
await writeFile(out,JSON.stringify({scope:"isolated in-memory algorithm; not a production throughput benchmark",node:process.version,results},null,2)+"\n");
