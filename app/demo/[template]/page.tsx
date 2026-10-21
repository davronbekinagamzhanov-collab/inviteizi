import { notFound } from "next/navigation";
import { sampleOrder } from "@/lib/sample-order";
import { getTemplate, templates } from "@/templates/registry";

// Гости открывают страницу по прямой ссылке, поэтому переход внутри сайта может подождать
export const instant = false;

// Все демо собираются заранее при сборке: открываются мгновенно
export function generateStaticParams() {
  return templates.map((tpl) => ({ template: tpl.id }));
}

export default async function DemoPage({ params }: PageProps<"/demo/[template]">) {
  const { template } = await params;
  const tpl = getTemplate(template);
  if (!tpl) notFound();

  const { default: Design } = await tpl.design.load();
  return <Design data={sampleOrder} mode="full" color={tpl.color} />;
}
