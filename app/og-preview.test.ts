import { it, expect, vi } from "vitest";
import { writeFile, mkdir } from "node:fs/promises";
import Image from "./[slug]/opengraph-image";
import { renderChart } from "@/lib/chart";
vi.mock("@/lib/orders", () => ({ getInvitationBySlug: async () => ({ mode: "full", order: { templateId: "tandir-nuri" }, data: { occasion: "nahorgi", person: "Нуриддин", hosts: "Оила", events: [{date:"2026-11-14",time:"06:00",address:"PRIVATE ADDRESS",venueName:"PRIVATE VENUE"}] } }) }));
it("renders a real design cover with Cyrillic, without requesting private address or external fonts", async () => {
  const response = await Image({params:Promise.resolve({slug:"test"})});
  const bytes = new Uint8Array(await response.arrayBuffer());
  expect([...bytes.slice(0,8)]).toEqual([137,80,78,71,13,10,26,10]);
  if (process.env.ANALYTICS_QA_DIR) {
    await mkdir(process.env.ANALYTICS_QA_DIR,{recursive:true});
    await writeFile(`${process.env.ANALYTICS_QA_DIR}/og-preview.png`,bytes);
    await writeFile(`${process.env.ANALYTICS_QA_DIR}/chart.png`,await renderChart("Мусиқа: ў қ ғ ҳ",[{label:"Ўзбекистон — узун мусиқа номи ".repeat(3),value:12},{label:"Никоҳ",value:7}],"Пока недостаточно данных"));
    await writeFile(`${process.env.ANALYTICS_QA_DIR}/empty.png`,await renderChart("Выручка",[],"Пока недостаточно данных"));
  }
});
