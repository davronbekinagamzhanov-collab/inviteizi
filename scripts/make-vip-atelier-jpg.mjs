// Bot catalog JPG covers and link-preview OG for the four VIP atelier designs (PR #13).
// Derived only from their accepted artwork: covers/<id>.webp → covers/<id>.jpg (same size),
// text-free public/vip/<id>/hero.webp → og/<id>.jpg 1200×630 like the other VIP designs. No new artwork.
import sharp from "sharp";
const ids = ["vip-marvarid", "vip-bogi-visol", "vip-oq-tulpor", "vip-umr-ziyosi"];
for (const id of ids) {
  await sharp(`public/covers/${id}.webp`).jpeg({ quality: 86, mozjpeg: true }).toFile(`public/covers/${id}.jpg`);
  await sharp(`public/vip/${id}/hero.webp`)
    .resize(1200, 630, { fit: "cover", position: "attention" })
    .jpeg({ quality: 84, mozjpeg: true })
    .toFile(`public/og/${id}.jpg`);
  console.log(id, "ok");
}
