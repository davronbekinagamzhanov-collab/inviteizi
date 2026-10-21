import { notFound } from "next/navigation";
import { designs, existingArt, getDesign } from "@/templates/registry";

/** Так клиент увидит своё демо до оплаты: водяной знак «НАМУНА», без музыки */
export const instant = false;

export function generateStaticParams() {
  return designs.map((d) => ({ template: d.id }));
}

export default async function DemoWatermarkPage({ params }: PageProps<"/demo/[template]/namuna">) {
  const { template } = await params;
  const design = getDesign(template);
  if (!design) notFound();

  const { default: Design } = await design.load();
  return <Design data={design.sample} mode="demo" art={existingArt(design)} />;
}
