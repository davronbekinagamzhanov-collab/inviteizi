import { glueData } from "@/lib/typography";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { checkPagesAllowed } from "@/lib/check-pages";
import { existingArt, getDesign, longSample } from "@/templates/registry";

import { loadOrderDesign } from "@/templates/order-design";

type Props = { params: Promise<{ template: string }>; searchParams: Promise<{ mode?: string; revision?: string; long?: string }> };

async function Invitation({ params, searchParams }: Props) {
  if (!checkPagesAllowed()) notFound();
  const { template } = await params;
  const { mode, revision, long } = await searchParams;
  const design = getDesign(template);
  if (!design) notFound();
  const { default: Design } = revision === "legacy" ? await loadOrderDesign(design) : await design.load();
  return <Design data={glueData({ ...(long ? longSample(design) : design.sample), noMusic: revision === "legacy", rsvp: revision === "legacy" ? false : true, rsvpSlug: revision === "legacy" ? undefined : "dev-preview" })} mode={mode === "demo" ? "demo" : "full"} art={existingArt(design)} />;
}

/**
 * Только для проверок: дизайн с формой ответа гостя, ?mode=demo — как личная НАМУНА.
 * Проверка до первого await: на Vercel сборка сохраняет страницу как постоянный 404.
 */
export default function DevInvitationPage(props: Props) {
  if (!checkPagesAllowed()) notFound();
  return (
    <Suspense fallback={null}>
      <Invitation {...props} />
    </Suspense>
  );
}
