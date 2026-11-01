import { it, expect, vi } from "vitest";
import { writeFile, mkdir } from "node:fs/promises";
import Image from "./[slug]/opengraph-image";
import { renderChart } from "@/lib/chart";
const fixture=vi.hoisted(()=>({templateId:"tandir-nuri",version:undefined as "premium-v1"|undefined}));
vi.mock("@/lib/orders", () => ({ getInvitationBySlug: async () => ({ mode: "full", order: { templateId: fixture.templateId }, data: { designVersion:fixture.version, occasion: "nahorgi", person: "Нуриддин", hosts: "Оила", events: [{date:"2026-11-14",time:"06:00",address:"PRIVATE ADDRESS",venueName:"PRIVATE VENUE"}] } }) }));
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

it("uses different artwork only for an explicitly versioned redesigned order",async()=>{
  fixture.templateId="kabutar-salom";
  fixture.version=undefined;
  const old=Buffer.from(await (await Image({params:Promise.resolve({slug:"version-fixture"})})).arrayBuffer());
  fixture.version="premium-v1";
  const premium=Buffer.from(await (await Image({params:Promise.resolve({slug:"version-fixture"})})).arrayBuffer());
  expect(old.subarray(0,8)).toEqual(Buffer.from([137,80,78,71,13,10,26,10]));
  expect(premium.subarray(0,8)).toEqual(old.subarray(0,8));
  expect(premium.equals(old)).toBe(false);
  fixture.templateId="tandir-nuri";fixture.version=undefined;
});
