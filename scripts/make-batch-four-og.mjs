// Only this batch. Render its own native decorative geometry, never sample/customer text.
import {chromium} from "playwright-core";
import sharp from "sharp";
const base=process.env.BASE??"http://127.0.0.1:3104";
const colors={"oq-chinni":"#fcf9ef",doppicha:"#fff9ed","sayram-hovli":"#fbf8ee",zarvaraq:"#fbf4e6","umr-daraxti":"#fcf7ec","marvarid-satr":"#fcf7f0","suzani-yol":"#faf5e9","bugdoy-boshoq":"#fcf8eb","gulbog-sahifa":"#fff8ed","lola-ehtirom":"#fcf7ef"};
Object.assign(colors,{"zarhal-lavha":"#fcf6eb","adras-nishon":"#fcf4e9","mis-kafgir":"#fbf7ee","rayhon-sahari":"#f7f7ec","visol-rishta":"#fcf7f1"});
Object.assign(colors,{"uzum-hovli":"#faf6e9","sopol-navo":"#fcf5e9","girih-nur":"#faf6e9","siyoh-duo":"#fcf7ee","kabutar-salom":"#fcf7f0"});
Object.assign(colors,{"shirin-tilak":"#fcf6e8","minor-satr":"#f9f5e9","kumush-taroq":"#f8f7f0","shabnam-visol":"#f7f8f0","visol-soati":"#faf6e9"});
const ids=process.argv.slice(2).length?process.argv.slice(2):["oq-chinni","doppicha","sayram-hovli","zarvaraq","umr-daraxti"];
if(ids.some(id=>!(id in colors)))throw new Error("Unknown OG design");
const browser=await chromium.launch({channel:"chrome",headless:true});
try{
  for(const id of ids){
    const bg=colors[id];
    if(["gulbog-sahifa","lola-ehtirom"].includes(id)){
      await sharp(`public/art/${id}.webp`).resize(420,620,{fit:"cover"}).jpeg({quality:88}).toFile(`public/og/${id}.jpg`);console.log(id);continue;
    }
    const page=await browser.newPage();await page.goto(`${base}/demo/${id}`);
    const svg=await page.locator('svg[data-decor][aria-hidden="true"]').first().evaluate(el=>{
      const clone=el.cloneNode(true);clone.removeAttribute("class");clone.setAttribute("xmlns","http://www.w3.org/2000/svg");clone.setAttribute("x","20");clone.setAttribute("y","60");clone.setAttribute("width","380");clone.setAttribute("height","500");
      if(clone.querySelector("text,foreignObject,image"))throw new Error("OG artwork includes text or an image");return clone.outerHTML;
    });
    const art=`<svg xmlns="http://www.w3.org/2000/svg" width="420" height="620"><rect width="420" height="620" fill="${bg}"/><path d="M30 30h360M30 590h360" stroke="#b6a280" stroke-opacity=".4"/>${svg}</svg>`;
    await sharp(Buffer.from(art)).jpeg({quality:88}).toFile(`public/og/${id}.jpg`);await page.close();console.log(id);
  }
}finally{await browser.close();}
