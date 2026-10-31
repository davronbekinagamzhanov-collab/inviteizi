import { Suspense } from "react";
import { notFound } from "next/navigation";
import { checkPagesAllowed } from "@/lib/check-pages";
import { existingArt, getDesign } from "@/templates/registry";

type Props = { params: Promise<{ template: string }>; searchParams: Promise<{ mode?: string }> };

async function Invitation({ params, searchParams }: Props) {
  if (!checkPagesAllowed()) notFound();
  const { template } = await params;
  const { mode } = await searchParams;
  const design = getDesign(template);
  if (!design) notFound();
  const { default: Design } = await design.load();
  return <Design data={{ ...design.sample, noMusic: false, rsvp: true, rsvpSlug: "dev-preview" }} mode={mode === "demo" ? "demo" : "full"} art={existingArt(design)} />;
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
