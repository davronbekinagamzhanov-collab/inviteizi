// Миниатюры обложек для каталога (Mini App, /catalog, «Мои»): готовый сжатый WebP 480×853 вместо
// оптимизации next/image на лету (лимит Image Optimization на Vercel Hobby). public/covers/<id>.webp → public/covers/thumb/<id>.webp
// Запуск: node scripts/make-cover-thumbs.mjs (после make-covers)
import sharp from "sharp";
import { mkdir, readdir } from "node:fs/promises";

await mkdir("public/covers/thumb", { recursive: true });
let n = 0;
for (const f of (await readdir("public/covers")).filter((x) => x.endsWith(".webp"))) {
  await sharp(`public/covers/${f}`).resize(480, 853, { fit: "cover" }).webp({ quality: 74, effort: 6 }).toFile(`public/covers/thumb/${f}`);
  n++;
}
console.log(`thumbs: ${n}`);
