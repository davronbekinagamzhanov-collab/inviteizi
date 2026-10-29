// Rebuild review sheets and compressed full-page evidence from the local audit inventory.
import sharp from 'sharp';
import {readFile,mkdir} from 'node:fs/promises';
const {results:rows}=JSON.parse(await readFile('docs/reviews/design-audit-2026-10-29/inventory.json','utf8'));
const out='docs/reviews/design-audit-2026-10-29',raw='screens/design-audit';
await mkdir(out+'/full',{recursive:true});
async function sheet(batch,filename){const composite=[];
for(let col=0;col<batch.length;col++){
 const d=batch[col];if(d.error)continue;
 const full=`${raw}/${d.id}-full.png`,meta=await sharp(full).metadata();
 const target=d.layout.find(l=>l.event)?.y??d.layout.find(l=>/дастур|тартиб|манзил|маросим|тадбир/i.test(l.text))?.y??0;
 const y=Math.max(0,Math.min(target-25,meta.height-812));
 const event=await sharp(full).extract({left:0,top:y,width:375,height:Math.min(812,meta.height)}).resize(300,650,{fit:'contain',background:'#eee'}).png().toBuffer();
 await sharp(full).webp({quality:73}).toFile(`${out}/full/${d.id}.webp`);
 const label=Buffer.from(`<svg width="300" height="58"><rect width="300" height="58" fill="white"/><text x="8" y="22" font-family="sans-serif" font-size="16">№${d.number} ${d.id}</text><text x="8" y="44" font-family="sans-serif" font-size="14">${d.format} · ${d.occasion}</text></svg>`);
 composite.push({input:label,left:col*300,top:0});
 for(const [r,stage] of ['closed','top'].entries())composite.push({input:await sharp(`${raw}/${d.id}-${stage}.png`).resize(300,650).png().toBuffer(),left:col*300,top:58+r*650});
 composite.push({input:event,left:col*300,top:1358});
}
await sharp({create:{width:batch.length*300,height:2008,channels:3,background:'#eee'}}).composite(composite).webp({quality:82}).toFile(`${out}/${filename}.webp`);
}

for(let i=0;i<rows.length;i+=5) await sheet(rows.slice(i,i+5),`sheet-${String(i/5+1).padStart(2,'0')}`);
const groups={
 'compare-animated':['girih-nur','kabutar-salom','qosh-uzuk','yelpigich-ziynat'],
 'compare-photo':['bodom-guli','samarqand-kitob','atirgul','gulbog-sahifa'],
 'compare-diagonal':['sopol-navo','shirin-tilak','visol-soati','dutor-navosi'],
 'compare-architecture':['ganch-peshtoq','zarhal-eshik','rishton-koshin','shohona-baxmal'],
 'compare-morning':['oq-chinni','bugdoy-boshoq','mis-kafgir'],
};
for(const [name,ids] of Object.entries(groups))await sheet(ids.map(id=>rows.find(r=>r.id===id)),name);
