/** Synthetic browser fixture, Preview/development only. No orders, Supabase or Telegram calls. */
import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { getDesign } from "@/templates/registry";
import { futureDemoData } from "@/lib/marketing/demo-dates";
import { MarketingBrandProvider } from "@/components/marketing/BrandContext";
import { demoMusicUrl } from "@/lib/music";
import { DesignView } from "@/templates/design-loaders";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <Fixture />
    </Suspense>
  );
}
async function Fixture() {
  await connection();
  if (
    process.env.VERCEL_ENV === "production" ||
    (process.env.NODE_ENV === "production" && process.env.VERCEL_ENV !== "preview")
  )
    notFound();
  const d = getDesign("umr-daraxti")!;
  return (
    <MarketingBrandProvider enabled source={"inv_" + "0".repeat(32)}>
      <DesignView
        id={d.id}
        data={{
          ...futureDemoData(d.sample, new Date()),
          langs: ["ru"],
          rsvp: true,
          rsvpSlug: "synthetic-no-writes",
          musicUrl: demoMusicUrl(d.occasion),
        }}
        mode="demo"
      />
    </MarketingBrandProvider>
  );
}
