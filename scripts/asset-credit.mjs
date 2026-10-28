import "./ts-hooks.mjs";
import sharp from "sharp";
const {photoAttributions}=await import("../texts/uz-cyrl.ts");

/** Keep required attribution visible even when an image is saved or forwarded alone. */
export async function withAssetCredit(buffer,id){
  const credit=photoAttributions[id];
  if(!credit)return buffer;
  const {width,height}=await sharp(buffer).metadata();
  const strip=Math.round(width/6),font=Math.round(width/30);
  const xml=s=>s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${strip}"><rect width="100%" height="100%" fill="#faf8ed" fill-opacity="1"/><g font-family="Arial,sans-serif" fill="#414d5b" text-anchor="middle"><text x="50%" y="${strip*.38}" font-size="${font}">${xml(credit.author)} · ${xml(credit.license)}</text><text x="50%" y="${strip*.73}" font-size="${Math.round(font*.78)}">inviteizi.vercel.app/art/CREDITS.md</text></g></svg>`;
  return sharp(buffer).composite([{input:Buffer.from(svg),top:height-strip,left:0}]).withExifMerge({IFD0:{Artist:credit.author,Copyright:`${credit.license}; ${credit.licenseUrl}; Source: ${credit.source}; resized/cropped`}}).png().toBuffer();
}
