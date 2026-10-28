// Explicit, individually reviewed real-photo sources when Pixabay credentials are unavailable.
// CC0 by default; explicit CC BY-SA 4.0 requires attribution in the invitation.
// Never a bulk downloader. No runtime third-party images in invitations.
import sharp from "sharp";
import { mkdir, writeFile, readFile, access } from "node:fs/promises";
const [id,title,license="CC0"]=process.argv.slice(2);
if(!["CC0","CC BY-SA 4.0"].includes(license))throw new Error("Only individually reviewed CC0 / CC BY-SA 4.0 photographs are supported");
if(!id||!title||!/^[a-z0-9-]+$/.test(id)) throw new Error('Usage: node scripts/commons.mjs <design-id> "File name.jpg"');
const out=`public/art/${id}.webp`;
try { await access(out); throw new Error("Refusing to replace existing artwork"); } catch(e) { if(e.code!=="ENOENT") throw e; }
const headers={"User-Agent":"InviteIZI-art-review/1.0 (https://github.com/davronbekinagamzhanov-collab/inviteizi)"};
const params=new URLSearchParams({action:"query",format:"json",titles:`File:${title}`,prop:"imageinfo",iiprop:"url|size|extmetadata"});
const response=await fetch(`https://commons.wikimedia.org/w/api.php?${params}`,{headers,signal:AbortSignal.timeout(20000)});
if(!response.ok) throw new Error(`Commons metadata HTTP ${response.status}`);
const data=await response.json();
const info=Object.values(data.query.pages)[0]?.imageinfo?.[0];
const meta=info?.extmetadata;
const actualLicense=meta?.LicenseShortName?.value??"";
const licensed=license==="CC0"?/^CC0(?:\b|\s)/.test(actualLicense):actualLicense===license;
if(!info||!licensed||info.size>20*1024*1024||new URL(info.url).hostname!=="upload.wikimedia.org") throw new Error("Source is missing, too large or does not match the explicitly selected license");
const plain=value=>(value??"").replace(/<[^>]*>/g,"").replace(/&amp;/g,"&").replace(/\s+/g," ").trim();
if(/AI.generated|artificial intelligence|stable.diffusion|midjourney/i.test(plain(meta.ImageDescription?.value))) throw new Error("AI-generated sources are not allowed");
const image=await fetch(info.url,{headers,signal:AbortSignal.timeout(30000)});
if(!image.ok) throw new Error(`Photo download HTTP ${image.status}`);
const original=Buffer.from(await image.arrayBuffer());
await mkdir(`art-raw/${id}`,{recursive:true});
await writeFile(`art-raw/${id}/source.json`,JSON.stringify({title,source:info.descriptionurl,url:info.url,metadata:meta},null,2));
await mkdir("public/art",{recursive:true});
let result;
for(const quality of [82,74,66,58]) {
  result=await sharp(original).rotate().resize({width:1080,withoutEnlargement:true}).blur(0.8).webp({quality,effort:6}).toBuffer();
  if(result.length<=300*1024) break;
}
if(result.length>300*1024) throw new Error("Photo exceeds the 300 KiB budget");
await writeFile(out,result);
const credits="public/art/CREDITS.md";
let text=await readFile(credits,"utf8");
text=text.replace("Все фото — Pixabay (Pixabay Content License), скачаны и сжаты для InviteIZI.","Настоящие фотографии, скачанные и подготовленные для InviteIZI. Источник и лицензия указаны у каждого материала; прежние фото Pixabay используют Pixabay Content License.");
const reviewed=new Intl.DateTimeFormat("ru-RU",{timeZone:"Asia/Almaty"}).format(new Date());
text+=`\n- \`${id}.webp\` — ${plain(meta.Artist?.value)}; [${title}](${info.descriptionurl}); ${license==="CC0"?"CC0 1.0":license}, ${plain(meta.LicenseUrl?.value)}. Проверено ${reviewed}. Изменения: уменьшение до 1080 px, мягкое размытие, WebP.${license==="CC0"?"":" Производные фото, включая кадры в covers/ и og/, распространяются под CC BY-SA 4.0; код и данные заказа отдельно. На пригласительной сохраняется атрибуция и ссылка лицензии."}\n`;
await writeFile(credits,text);
console.log(JSON.stringify({file:out,bytes:result.length,author:plain(meta.Artist?.value),license:meta.LicenseShortName.value,source:info.descriptionurl}));
