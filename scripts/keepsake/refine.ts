/** Пересчитать бумагу и тихую зону всех дизайнов по готовым подложкам (без браузера): npx tsx scripts/keepsake/refine.ts */
import { readFileSync, writeFileSync } from "node:fs";
import { paperColor, quietZone } from "./zone";

async function main() {
  const file = "lib/keepsake/looks.json";
  const looks = JSON.parse(readFileSync(file, "utf8"));
  for (const id of Object.keys(looks)) {
    const plate = `assets/keepsake/plates/${id}.webp`;
    looks[id].paper = await paperColor(plate);
    looks[id].zone = await quietZone(plate);
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(looks[id].paper.slice(i, i + 2), 16) / 255);
    looks[id].dark = 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.4;
  }
  writeFileSync(file, JSON.stringify(looks, null, 2) + "\n");
  console.log(Object.keys(looks).length, "дизайнов");
}
void main();
