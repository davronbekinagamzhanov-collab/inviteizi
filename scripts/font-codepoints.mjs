// Extract the bundled font's Unicode cmap so OG never requests remote fallback fonts.
import { readFile, writeFile } from "node:fs/promises";
const bytes=await readFile("assets/fonts/PTSerif-Regular.ttf");
let cmap;
for(let i=0;i<bytes.readUInt16BE(4);i++) {
  const table=12+i*16;
  if(bytes.toString("ascii",table,table+4)==="cmap") cmap=bytes.readUInt32BE(table+8);
}
if(cmap===undefined) throw new Error("Missing font cmap");
const codes=new Set();
for(let i=0;i<bytes.readUInt16BE(cmap+2);i++) {
  const record=cmap+4+i*8;
  const platform=bytes.readUInt16BE(record);
  if(platform!==0&&platform!==3) continue;
  const table=cmap+bytes.readUInt32BE(record+4);
  const format=bytes.readUInt16BE(table);
  if(format===4) {
    const n=bytes.readUInt16BE(table+6)/2;
    for(let s=0;s<n;s++) {
      const end=bytes.readUInt16BE(table+14+s*2);
      const start=bytes.readUInt16BE(table+16+n*2+s*2);
      const delta=bytes.readInt16BE(table+16+n*4+s*2);
      const rangeAt=table+16+n*6+s*2;
      const range=bytes.readUInt16BE(rangeAt);
      for(let code=start;code<=end&&code<65535;code++) {
        let glyph=range?bytes.readUInt16BE(rangeAt+range+2*(code-start)):code;
        if(!range||glyph) glyph=(glyph+delta)&65535;
        if(glyph) codes.add(code);
      }
    }
  } else if(format===12) {
    for(let g=0;g<bytes.readUInt32BE(table+12);g++) {
      const group=table+16+g*12;
      const start=bytes.readUInt32BE(group),end=bytes.readUInt32BE(group+4),glyph=bytes.readUInt32BE(group+8);
      for(let code=start;code<=end;code++) if(glyph+code-start) codes.add(code);
    }
  }
}
if(!Array.from("ўқғҳЎҚҒҲ").every(c=>codes.has(c.codePointAt(0)))) throw new Error("Missing Uzbek Cyrillic glyphs");
await writeFile("assets/fonts/PTSerif-codepoints.json",JSON.stringify([...codes].sort((a,b)=>a-b))+"\n");
console.log(`Bundled font: ${codes.size} Unicode codepoints; Uzbek Cyrillic verified`);
