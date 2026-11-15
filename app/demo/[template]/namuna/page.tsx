import { connection } from "next/server";
import { futureDemoData } from "@/lib/marketing/demo-dates";
import { MarketingBrandProvider } from "@/components/marketing/BrandContext";
import { marketingFlags, validPublicSource } from "@/lib/marketing/config";
import { Suspense } from "react";
import { glueData } from "@/lib/typography";
import { notFound } from "next/navigation";
import { demoMusicUrl } from "@/lib/music";
import { designs, getDesign } from "@/templates/registry";
import { existingArt } from "@/templates/art";
import { DesignView } from "@/templates/design-loaders";

/** Каталожный образец личного демо: НАМУНА и музыка выбранного тадбира. */
export const instant = false;

export function generateStaticParams() {
  return designs.map((d) => ({ template: d.id }));
}

export default function DemoWatermarkPage(props: PageProps<"/demo/[template]/namuna">) {
  return (
    <Suspense fallback={null}>
      <LiveDemo {...props} />
    </Suspense>
  );
}
async function LiveDemo({ params, searchParams }: PageProps<"/demo/[template]/namuna">) {
  await connection();
  const query = await searchParams,
    source = validPublicSource(query.ref);
  const { template } = await params;
  const design = getDesign(template);
  if (!design) notFound();

  return (
    <MarketingBrandProvider enabled={marketingFlags().ui} source={source}>
      <DesignView
        id={design.id}
        data={glueData({ ...futureDemoData(design.sample, new Date()), musicUrl: demoMusicUrl(design.occasion) })}
        mode="demo"
        art={existingArt(design)}
      />
    </MarketingBrandProvider>
  );
}
