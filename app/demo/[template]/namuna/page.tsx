import { glueData } from "@/lib/typography";
import { notFound } from "next/navigation";
import { demoMusicUrl } from "@/lib/music";
import { designs, getDesign } from "@/templates/registry";
import { existingArt } from "@/templates/art";

/** Каталожный образец личного демо: НАМУНА и музыка выбранного тадбира. */
export const instant = false;

export function generateStaticParams() {
  return designs.map((d) => ({ template: d.id }));
}

export default async function DemoWatermarkPage({ params }: PageProps<"/demo/[template]/namuna">) {
  const { template } = await params;
  const design = getDesign(template);
  if (!design) notFound();

  const { default: Design } = await design.load();
  return <Design data={glueData({ ...design.sample, musicUrl: demoMusicUrl(design.occasion) })} mode="demo" art={existingArt(design)} />;
}
