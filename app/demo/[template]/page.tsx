import { notFound } from "next/navigation";
import { designs, existingArt, getDesign } from "@/templates/registry";

// Гости открывают страницу по прямой ссылке, поэтому переход внутри сайта может подождать
export const instant = false;

// Все демо собираются заранее при сборке: открываются мгновенно
export function generateStaticParams() {
  return designs.map((d) => ({ template: d.id }));
}

export default async function DemoPage({ params }: PageProps<"/demo/[template]">) {
  const { template } = await params;
  const design = getDesign(template);
  if (!design) notFound();

  const { default: Design } = await design.load();
  return <Design data={design.sample} mode="full" art={existingArt(design)} />;
}
