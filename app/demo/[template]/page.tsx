import { glueData } from "@/lib/typography";
import { notFound } from "next/navigation";
import { demoMusicUrl } from "@/lib/music";
import { designs, getDesign } from "@/templates/registry";
import { existingArt } from "@/templates/art";
import { DemoTracker } from "./DemoTracker";

// Гости открывают страницу по прямой ссылке, поэтому переход внутри сайта может подождать
export const instant = false;

// Все демо собираются заранее при сборке: открываются мгновенно.
// Музыка — мелодия своего тадбира из «нашего списка» (свадебное демо — свадебная и т.д.)
export function generateStaticParams() {
  return designs.map((d) => ({ template: d.id }));
}

export default async function DemoPage({ params }: PageProps<"/demo/[template]">) {
  const { template } = await params;
  const design = getDesign(template);
  if (!design) notFound();

  const { default: Design } = await design.load();
  return <><DemoTracker /><Design data={glueData({ ...design.sample, musicUrl: demoMusicUrl(design.occasion) })} mode="full" art={existingArt(design)} /></>;
}
