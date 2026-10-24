import { notFound } from "next/navigation";
import { demoMusicUrl } from "@/lib/music";
import { designs, existingArt, getDesign, longSample } from "@/templates/registry";

/**
 * Только для проверки вёрстки (режим разработки): длинные имена и три тадбира.
 * На сайте этой страницы нет.
 */
export const instant = false;

export function generateStaticParams() {
  return designs.map((d) => ({ template: d.id }));
}

export default async function DemoLongPage({ params }: PageProps<"/demo/[template]/long">) {
  if (process.env.NODE_ENV === "production") notFound();
  const { template } = await params;
  const design = getDesign(template);
  if (!design) notFound();

  const { default: Design } = await design.load();
  return <Design data={{ ...longSample(design), musicUrl: demoMusicUrl(design.occasion) }} mode="full" art={existingArt(design)} />;
}
