import {connection} from "next/server";
import {futureDemoData} from "@/lib/marketing/demo-dates";
import {MarketingBrandProvider} from "@/components/marketing/BrandContext";
import {marketingFlags,validPublicSource} from "@/lib/marketing/config";
import {Suspense} from "react";
import { glueData } from "@/lib/typography";
import { notFound } from "next/navigation";
import { demoMusicUrl } from "@/lib/music";
import { designs, getDesign } from "@/templates/registry";
import { existingArt } from "@/templates/art";
import { DemoTracker } from "./DemoTracker";
import { env } from "@/lib/env";

// Гости открывают страницу по прямой ссылке, поэтому переход внутри сайта может подождать
export const instant = false;

// Статический shell; даты образцов обновляются на запросе (сегодня +45 дней в зоне события).
// Музыка — мелодия своего тадбира из «нашего списка» (свадебное демо — свадебная и т.д.)
// Языки: гость видит переключатель «ЎЗ · РУ (· ҚЗ)»; ?lang=ru открывает сразу на русском
export function generateStaticParams() {
  return designs.map((d) => ({ template: d.id }));
}

export default function DemoPage(props:PageProps<"/demo/[template]">){return <Suspense fallback={null}><LiveDemo {...props}/></Suspense>;}
async function LiveDemo({ params,searchParams }: PageProps<"/demo/[template]">) {
  await connection();
  const query=await searchParams,source=validPublicSource(query.ref);
  const { template } = await params;
  const design = getDesign(template);
  if (!design) notFound();

  const { default: Design } = await design.load();
  return <MarketingBrandProvider enabled={marketingFlags().ui} source={source}><DemoTracker /><Design data={glueData({ ...futureDemoData(design.sample,new Date()), langs: env.extraLangs(), musicUrl: demoMusicUrl(design.occasion) })} mode="full" art={existingArt(design)} /></MarketingBrandProvider>;
}
