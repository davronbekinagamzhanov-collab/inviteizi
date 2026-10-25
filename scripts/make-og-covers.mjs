// Public preview artwork contains no sample names, dates, venue or customer data.
// Derived only from existing project artwork / ornaments, not new invitation designs.
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
await mkdir("public/og", { recursive: true });
const crops = {
  "oq-ot": { left: 0, top: 960, width: 1080, height: 750 },
  "tonggi-qozon": { left: 0, top: 950, width: 1080, height: 850 },
  "pion-guldasta": { left: 0, top: 800, width: 1080, height: 1000 },
  "ganch-peshtoq": { left: 0, top: 0, width: 1080, height: 700 },
  "oltin-ot": { left: 130, top: 310, width: 820, height: 820 },
};
for (const [id, crop] of Object.entries(crops)) {
  await sharp(`public/covers/${id}.jpg`).extract(crop).resize(420,620,{fit:"cover"}).jpeg({quality:86}).toFile(`public/og/${id}.jpg`);
}
for (const id of ["tandir-nuri", "anor-bogi"]) await sharp(`public/art/${id}.webp`).resize(420,620,{fit:"cover"}).jpeg({quality:86}).toFile(`public/og/${id}.jpg`);

const leaf = (x,y,rotate=0,color="#b8892f") => `<ellipse cx="${x}" cy="${y}" rx="8" ry="22" fill="none" stroke="${color}" stroke-width="2" transform="rotate(${rotate} ${x} ${y})"/>`;
for (const id of ["oltin-monogramma","sapfir","ipak-romol"]) {
  const dark = id === "sapfir";
  const gold = dark ? "#ddc98d" : id === "ipak-romol" ? "#b8a3be" : "#b8892f";
  const bg = dark ? "#1c294d" : id === "ipak-romol" ? "#f2edf5" : "#faf6ec";
  const leaves = Array.from({length:12},(_,i) => leaf(130+Math.cos(i/11*Math.PI*2)*78,300+Math.sin(i/11*Math.PI*2)*175,i*33,gold)+leaf(290+Math.cos(i/11*Math.PI*2)*78,300+Math.sin(i/11*Math.PI*2)*175,-i*33,gold)).join("");
  const decoration = id === "sapfir"
    ? `<path d="M40 100 Q210 30 380 100 M40 520 Q210 590 380 520" fill="none" stroke="${gold}" stroke-width="2"/><path d="M90 90 L330 530 M330 90 L90 530" stroke="${gold}" opacity=".08"/>`
    : id === "ipak-romol"
      ? `<path d="M0 140 Q210 40 420 140 M0 160 Q210 60 420 160 M0 180 Q210 80 420 180" fill="none" stroke="${gold}" opacity=".5"/>${leaves}`
      : `<ellipse cx="210" cy="310" rx="128" ry="190" fill="none" stroke="${gold}" opacity=".5"/>${leaves}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="620"><rect width="420" height="620" fill="${bg}"/><rect x="20" y="20" width="380" height="580" rx="24" fill="none" stroke="${gold}"/><rect x="30" y="30" width="360" height="560" rx="18" fill="none" stroke="${gold}" opacity=".3"/>${decoration}</svg>`;
  await sharp(Buffer.from(svg)).jpeg({quality:88}).toFile(`public/og/${id}.jpg`);
}
