/** «Тихая зона» подложки: самая длинная полоса строк без рисунка (там стоит текст в самом дизайне) */
import sharp from "sharp";

export async function quietZone(plate: Buffer | string): Promise<[number, number]> {
  const W = 108, H = 192;
  const { data } = await sharp(plate).resize(W, H, { fit: "fill" }).greyscale().raw().toBuffer({ resolveWithObject: true });
  const x0 = Math.round(W * 0.16), x1 = Math.round(W * 0.84);
  // фон: самый частый тон всей подложки (бумага дизайна)
  const hist = new Array(32).fill(0);
  for (let i = 0; i < data.length; i++) hist[data[i] >> 3]++;
  const bg = hist.indexOf(Math.max(...hist)) * 8 + 4;
  const quiet: boolean[] = [];
  for (let y = 0; y < H; y++) {
    let bad = 0;
    for (let x = x0; x < x1; x++) if (Math.abs(data[y * W + x] - bg) > 18) bad++;
    quiet.push(bad <= (x1 - x0) * 0.04);
  }
  let best: [number, number] = [0, 0];
  const lo = Math.round(H * 0.05), hi = Math.round(H * 0.8);
  for (let y = lo, start = -1; y <= hi; y++) {
    if (y < hi && quiet[y]) {
      if (start < 0) start = y;
    } else if (start >= 0) {
      if (y - start > best[1] - best[0]) best = [start, y];
      start = -1;
    }
  }
  return [Number((best[0] / H).toFixed(3)), Number((best[1] / H).toFixed(3))];
}

/** Цвет бумаги: самый частый цвет подложки (по корзинам 16 тонов), усреднённый внутри корзины */
export async function paperColor(plate: Buffer | string): Promise<string> {
  const { data, info } = await sharp(plate).resize(108, 192, { fit: "fill" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const bins = new Map<number, [number, number, number, number]>();
  for (let i = 0; i < data.length; i += info.channels) {
    const key = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4);
    const b = bins.get(key) ?? [0, 0, 0, 0];
    b[0] += data[i];
    b[1] += data[i + 1];
    b[2] += data[i + 2];
    b[3]++;
    bins.set(key, b);
  }
  const [r, g, b, n] = [...bins.values()].sort((x, y) => y[3] - x[3])[0];
  return "#" + [r, g, b].map((v) => Math.round(v / n).toString(16).padStart(2, "0")).join("");
}
