import { connection } from "next/server";
import { Suspense } from "react";
import { futureDemoData } from "@/lib/marketing/demo-dates";
import { notFound } from "next/navigation";
import { getDesign } from "@/templates/registry";
import { existingArt } from "@/templates/art";
import { REVISED_DESIGNS, usesLegacyDesign } from "@/templates/design-version";
import { demoMusicUrl } from "@/lib/music";
import { DemoTracker } from "../DemoTracker";
import { DesignView } from "@/templates/design-loaders";
export const instant = false;
export function generateStaticParams() {
  return REVISED_DESIGNS.map((template) => ({ template }));
}
/** Historical catalog presentation for an unpaid order's pinned renderer; no order data is read. */
export default function LegacyDemo(props: { params: Promise<{ template: string }> }) {
  return (
    <Suspense fallback={null}>
      <LiveLegacy {...props} />
    </Suspense>
  );
}
async function LiveLegacy({ params }: { params: Promise<{ template: string }> }) {
  await connection();
  const { template } = await params,
    design = getDesign(template);
  if (!design || !usesLegacyDesign(template)) notFound();
  return (
    <>
      <DemoTracker />
      <DesignView
        id={design.id}
        legacy
        data={{ ...futureDemoData(design.sample, new Date()), musicUrl: demoMusicUrl(design.occasion) }}
        mode="full"
        art={existingArt(design)}
      />
    </>
  );
}
