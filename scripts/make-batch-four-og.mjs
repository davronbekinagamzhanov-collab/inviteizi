// Only this batch. Render its own native decorative geometry, never sample/customer text.
import {chromium} from "playwright-core";
import sharp from "sharp";
const base=process.env.BASE??"http://127.0.0.1:3104";
const colors={"oq-chinni":"#fcf9ef",doppicha:"#fff9ed","sayram-hovli":"#fbf8ee",zarvaraq:"#fbf4e6","umr-daraxti":"#fcf7ec"};
const browser=await chromium.launch({channel:"chrome",headless:true});
try{
  for(const [id,bg] of Object.entries(colors)){
    const page=await browser.newPage();await page.goto(`${base}/demo/${id}`);
    const svg=await page.locator('svg[data-decor][aria-hidden="true"]').first().evaluate(el=>{
      const clone=el.cloneNode(true);clone.removeAttribute("class");clone.setAttribute("xmlns","http://www.w3.org/2000/svg");clone.setAttribute("x","20");clone.setAttribute("y","60");clone.setAttribute("width","380");clone.setAttribute("height","500");
      if(clone.querySelector("text,foreignObject,image"))throw new Error("OG artwork includes text or an image");return clone.outerHTML;
    });
    const art=`<svg xmlns="http://www.w3.org/2000/svg" width="420" height="620"><rect width="420" height="620" fill="${bg}"/><path d="M30 30h360M30 590h360" stroke="#b6a280" stroke-opacity=".4"/>${svg}</svg>`;
    await sharp(Buffer.from(art)).jpeg({quality:88}).toFile(`public/og/${id}.jpg`);await page.close();console.log(id);
  }
}finally{await browser.close();}
