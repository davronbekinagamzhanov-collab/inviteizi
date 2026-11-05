import { glueData } from "@/lib/typography";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { demoMusicUrl } from "@/lib/music";
import { designs, getDesign, longSample } from "@/templates/registry";
import { existingArt } from "@/templates/art";

/**
 * Только для проверки вёрстки (режим разработки): длинные имена и три тадбира.
 * На сайте этой страницы нет.
 */
export const instant = false;

export function generateStaticParams() {
  return designs.map((d) => ({ template: d.id }));
}

export default async function DemoLongPage(props: PageProps<"/demo/[template]/long">) {
  if (process.env.NODE_ENV === "production") notFound();
  return <Suspense fallback={null}><LongPreview {...props}/></Suspense>;
}

/** Local fixture only: verify the same submitted data with and without the demo watermark. */
async function LongPreview({params,searchParams}:PageProps<"/demo/[template]/long">){
  const { template } = await params;
  const query=await searchParams;
  const design = getDesign(template);
  if (!design) notFound();

  const { default: Design } = await design.load();
  return <Design data={glueData({ ...longSample(design), musicUrl: demoMusicUrl(design.occasion) })} mode={query.mode==="demo"?"demo":"full"} art={existingArt(design)} />;
}
