// Local, read-only configuration preflight. Never prints values, hashes, URLs or identifiers.
import "./ts-hooks.mjs";
const {env}=await import("../lib/env.ts");
const rows=[];
const positiveId=s=>/^\d+$/.test(s)&&Number.isSafeInteger(Number(s))&&Number(s)>0;
const https=s=>{try{const u=new URL(s);return u.protocol==="https:"&&!u.username&&!u.password&&!u.search&&!u.hash;}catch{return false;}};
const value=key=>process.env[key]?.trim()??"";
function check(key,valid,required=true){const s=value(key);rows.push({key,status:!s?(required?"missing":"not-set"):valid(s)?"valid":"invalid",required});}
check("TELEGRAM_BOT_TOKEN",s=>/^\d+:[A-Za-z0-9_-]{20,}$/.test(s));
check("TELEGRAM_WEBHOOK_SECRET",s=>/^[A-Za-z0-9_-]{1,256}$/.test(s));
check("OWNER_USERNAME",s=>/^@?[A-Za-z0-9_]{5,32}$/.test(s));
check("OWNER_TELEGRAM_ID",positiveId);
// DB admins are an existing alternative. Their grants require a separate read-only DB check.
check("ADMIN_IDS",s=>s.split(",").every(x=>positiveId(x.trim())),false);
check("ANALYTICS_ADMIN_IDS",s=>s.split(",").every(x=>positiveId(x.trim())),false);
check("ANALYTICS_SIGNING_SECRET",s=>s.length>=32);
check("KASPI_PHONE",s=>/^\+?[\d\s()-]+$/.test(s)&&s.replace(/\D/g,"").length>=10);
check("KASPI_NAME",s=>s.length>0);
check("PAYMENT_CARD_NUMBER",s=>/^[\d\s-]+$/.test(s)&&/^\d{13,19}$/.test(s.replace(/[\s-]/g,"")),false);
check("STORAGE_GATE_SECRET",s=>s.length>=32);
if(value("DATABASE_URL"))check("DATABASE_URL",s=>{try{const u=new URL(s);return ["postgres:","postgresql:"].includes(u.protocol)&&Boolean(u.hostname&&u.password)&&/^inviteizi_server(?:\.|$)/.test(decodeURIComponent(u.username));}catch{return false;}});
else check("DB_SERVER_PASSWORD",s=>s.length>0);
for(const [key,get] of [["PUBLIC_BASE_URL",env.publicBaseUrl],["SUPABASE_URL",env.supabaseUrl]]){
  rows.push({key,status:value(key)?(https(get())?"valid":"invalid"):(https(get())?"default-valid":"invalid"),required:false});
}
check("VENUE_MAP_PICKER_URL",s=>{try{const u=new URL(s);return https(s)&&u.origin===new URL(env.publicBaseUrl()).origin;}catch{return false;}},false);
const warnings=[
  "Format checks only: no authentication, DB grants, deployed env or Storage-gate secret match was verified.",
  "Preview must not reuse production write credentials; this script never connects to a service.",
];
if(!value("ADMIN_IDS"))warnings.push("ADMIN_IDS not set: confirm existing public.admins authorizes receipt confirmation.");
for(const key of ["SUPABASE_SERVICE_ROLE_KEY","SUPABASE_SECRET_KEYS"]){
  if(value(key))warnings.push(`${key} present: not used by Next runtime; service credentials belong only in the existing Supabase edge function.`);
}
const passed=rows.every(r=>r.status!=="invalid"&&r.status!=="missing");
console.log(JSON.stringify({scope:"local process env; no secret values; not Vercel configuration evidence",passed,rows,warnings},null,2));
if(!passed)process.exitCode=1;
