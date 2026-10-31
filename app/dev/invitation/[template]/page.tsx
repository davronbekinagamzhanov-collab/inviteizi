import { notFound } from "next/navigation";
import { existingArt, getDesign } from "@/templates/registry";

/** Только для разработки: дизайн с формой ответа гостя, ?mode=demo — как личная НАМУНА */
export default async function DevInvitationPage({ params, searchParams }: { params: Promise<{ template: string }>; searchParams: Promise<{ mode?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { template } = await params;
  const { mode } = await searchParams;
  const design = getDesign(template);
  if (!design) notFound();
  const { default: Design } = await design.load();
  return <Design data={{ ...design.sample, noMusic: false, rsvp: true, rsvpSlug: "dev-preview" }} mode={mode === "demo" ? "demo" : "full"} art={existingArt(design)} />;
}
