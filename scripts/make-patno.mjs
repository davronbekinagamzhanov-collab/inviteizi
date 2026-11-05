// Акварельные пятна для дизайнов «Пятно» (suvbuyoq-*): рисуются здесь один раз (SVG-фильтры → WebP с прозрачностью),
// а в приглашении — обычные картинки, которые только плавно появляются (transform/opacity, без фильтров на телефоне).
// Не ИИ: форма — сглаженная «клякса» по сиду, край — турбулентность, зерно бумаги — шум.
// Запуск: node scripts/make-patno.mjs → public/art/patno/<вариант>-<секция>.webp
import sharp from "sharp";
import { mkdirSync } from "node:fs";

export const PALETTES = {
  // голубой туман
  tuman: { tones: ["#9fbcd3", "#c3d7e6", "#7f9fbb", "#dbe7f0"], edge: "#6f8fab" },
  // изумруд
  zumrad: { tones: ["#7fb19b", "#a9cdbb", "#5b917a", "#d3e7dc"], edge: "#4c7f69" },
  // пудровый
  upa: { tones: ["#e3b7b1", "#efd0ca", "#cf9c97", "#f6e3de"], edge: "#be8a85" },
};

// Секция → размер холста и форма пятна
export const SHAPES = {
  hero: { w: 900, h: 760, rx: 0.4, ry: 0.36, points: 11, wobble: 0.2, seed: 11 },
  text: { w: 800, h: 560, rx: 0.42, ry: 0.32, points: 10, wobble: 0.24, seed: 23 },
  calendar: { w: 700, h: 420, rx: 0.44, ry: 0.3, points: 9, wobble: 0.22, seed: 37 },
  program: { w: 520, h: 900, rx: 0.3, ry: 0.44, points: 10, wobble: 0.22, seed: 41 },
  place: { w: 820, h: 620, rx: 0.45, ry: 0.4, points: 12, wobble: 0.14, seed: 53 },
  finale: { w: 900, h: 900, rx: 0.42, ry: 0.42, points: 12, wobble: 0.2, seed: 67 },
};

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/** Сглаженная замкнутая клякса: точки по эллипсу с дрожанием радиуса → кривые Безье (Catmull-Rom) */
function blobPath(cx, cy, rx, ry, n, wobble, rand) {
  const pts = [];
  const phase = rand() * Math.PI * 2;
  for (let i = 0; i < n; i++) {
    const a = phase + (i / n) * Math.PI * 2;
    const k = 1 - wobble / 2 + rand() * wobble;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  const p = (i) => pts[(i + n) % n];
  let d = `M${p(0)[0].toFixed(1)},${p(0)[1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [p(i - 1), p(i), p(i + 1), p(i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d + "Z";
}

function svg(pal, sh, salt) {
  const rand = rng(sh.seed * 97 + salt);
  const { w, h } = sh;
  const cx = w / 2, cy = h / 2;
  const layers = [];
  // 4 слоя краски: широкий светлый, основной, тёмный «затёк» и пара капель-ореолов
  // слои смещены в разные стороны — краска ложится неровно, а не «кольцами»
  const plan = [
    { t: 3, s: 1.0, o: 0.6, f: 0 },
    { t: 1, s: 0.84, o: 0.42, f: 0 },
    { t: 0, s: 0.62, o: 0.3, f: 2 },
    { t: 2, s: 0.36, o: 0.18, f: 2 },
  ];
  for (const L of plan) {
    const ox = (rand() - 0.5) * w * 0.16, oy = (rand() - 0.5) * h * 0.16;
    const d = blobPath(cx + ox, cy + oy, w * sh.rx * L.s, h * sh.ry * L.s, sh.points, sh.wobble * 1.5, rand);
    layers.push(`<path d="${d}" fill="${pal.tones[L.t]}" fill-opacity="${L.o}" filter="url(#wc${L.f})"/>`);
    // у края краска скапливается — чуть темнее (только у двух внешних слоёв)
    if (L.f === 0) layers.push(`<path d="${d}" fill="none" stroke="${pal.edge}" stroke-opacity=".16" stroke-width="12" filter="url(#wc0)"/>`);
  }
  // светлые «затёки» (вода вытолкнула краску) — пятно живое, как на бумаге
  for (let k = 0; k < 3; k++) {
    const x = cx + (rand() - 0.5) * w * sh.rx, y = cy + (rand() - 0.5) * h * sh.ry;
    layers.push(`<path d="${blobPath(x, y, w * 0.06 + rand() * w * 0.05, h * 0.05 + rand() * h * 0.05, 8, 0.4, rand)}" fill="#fffdf9" fill-opacity=".26" filter="url(#wc2)"/>`);
  }
  for (let k = 0; k < 3; k++) {
    const a = rand() * Math.PI * 2, r = 0.42 + rand() * 0.12;
    const x = cx + Math.cos(a) * w * sh.rx * r * 2.1, y = cy + Math.sin(a) * h * sh.ry * r * 2.1;
    layers.push(`<path d="${blobPath(x, y, 8 + rand() * 16, 8 + rand() * 14, 7, 0.3, rand)}" fill="${pal.tones[2]}" fill-opacity=".3" filter="url(#wc1)"/>`);
  }
  const seed = Math.floor(rand() * 900) + 1;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <filter id="wc0" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="0.011" numOctaves="3" seed="${seed}" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="46" xChannelSelector="R" yChannelSelector="G" result="d"/>
      <feGaussianBlur in="d" stdDeviation="5" result="b"/>
      <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" seed="${seed + 7}" result="g"/>
      <feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.1 1.35" result="ga"/>
      <feComposite in="b" in2="ga" operator="in"/>
    </filter>
    <filter id="wc1" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" seed="${seed + 3}" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="30" xChannelSelector="G" yChannelSelector="R" result="d"/>
      <feGaussianBlur in="d" stdDeviation="3.5"/>
    </filter>
    <filter id="wc2" x="-30%" y="-30%" width="160%" height="160%">
      <feTurbulence type="fractalNoise" baseFrequency="0.008" numOctaves="2" seed="${seed + 5}" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="60" xChannelSelector="B" yChannelSelector="R" result="d"/>
      <feGaussianBlur in="d" stdDeviation="14"/>
    </filter>
  </defs>
  ${layers.join("\n  ")}
</svg>`;
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}` || process.argv[1]?.endsWith("make-patno.mjs")) {
  mkdirSync("public/art/patno", { recursive: true });
  for (const [name, pal] of Object.entries(PALETTES)) {
    for (const [i, [part, sh]] of Object.entries(SHAPES).entries()) {
      const out = `public/art/patno/${name}-${part}.webp`;
      const info = await sharp(Buffer.from(svg(pal, sh, i * 13 + name.length * 101))).webp({ quality: 70, alphaQuality: 60, effort: 6 }).toFile(out);
      console.log(out, Math.round(info.size / 1024) + " KB");
    }
  }
  // OG-картинки ссылок (без имён, дат и мест): бумага, пятно, тонкие золотые линии, «&»-капля не нужна
  const OG = { tuman: ["suvbuyoq-tuman", "#fcfbf8"], zumrad: ["suvbuyoq-zumrad", "#fbfaf4"], upa: ["suvbuyoq-upa", "#fdf9f6"] };
  for (const [tone, [id, paper]] of Object.entries(OG)) {
    const wash = await sharp(`public/art/patno/${tone}-hero.webp`).resize(400, 470, { fit: "inside" }).toBuffer();
    const meta = await sharp(wash).metadata();
    const lines = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="420" height="620"><path d="M40 40h340M40 580h340" stroke="#b0915a" stroke-opacity=".55"/><path d="M180 318h60" stroke="#b0915a" stroke-opacity=".8"/></svg>`);
    await sharp({ create: { width: 420, height: 620, channels: 3, background: paper } })
      .composite([{ input: wash, left: Math.round((420 - meta.width) / 2), top: Math.round((620 - meta.height) / 2) }, { input: lines, left: 0, top: 0 }])
      .jpeg({ quality: 86 })
      .toFile(`public/og/${id}.jpg`);
    console.log(`public/og/${id}.jpg`);
  }
}
