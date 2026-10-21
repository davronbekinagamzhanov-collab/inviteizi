import { notFound } from "next/navigation";
import { sampleOrder } from "@/lib/sample-order";
import { getTemplate, templates } from "@/templates/registry";

/** Так клиент увидит своё демо до оплаты: водяной знак «НАМУНА», без музыки */
export const instant = false;

export function generateStaticParams() {
  return templates.map((tpl) => ({ template: tpl.id }));
}

export default async function DemoWatermarkPage({ params }: PageProps<"/demo/[template]/namuna">) {
  const { template } = await params;
  const tpl = getTemplate(template);
  if (!tpl) notFound();

  const { default: Design } = await tpl.design.load();
  return <Design data={sampleOrder} mode="demo" color={tpl.color} />;
}
