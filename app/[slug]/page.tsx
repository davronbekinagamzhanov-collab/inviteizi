import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { env } from "@/lib/env";
import { currentSlugFor, getInvitationBySlug } from "@/lib/orders";
import { parseWeddingDate } from "@/lib/wedding-date";
import { existingArt, getDesign } from "@/templates/registry";
import { t } from "@/texts/uz-cyrl";
import Expired from "./Expired";
import { loadOrderDesign } from "@/templates/order-design";

// Гости открывают ссылку напрямую (из WhatsApp/Telegram): переход внутри сайта может подождать
export const instant = false;

/** Пригласительные личные — в поисковики не попадают */
const PRIVATE: Metadata["robots"] = { index: false, follow: false };

export async function generateMetadata({ params }: PageProps<"/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const page = await getInvitationBySlug(slug);
  if (!page || page.mode === "expired") return { title: t.site.title, robots: PRIVATE };
  const d = page.data;
  const first = d.events[0];
  const dateText = first ? dateLong(first.date, first.time) : undefined;
  const title = t.invitationPage.metaTitle(d);
  const description = t.invitationPage.metaDescription(d, dateText);
  return {
    // картинка-превью и ссылки в мессенджерах — с адресом сайта (PUBLIC_BASE_URL)
    metadataBase: new URL(env.publicBaseUrl()),
    title,
    description,
    robots: PRIVATE,
    openGraph: { title, description, type: "website", locale: "uz_UZ", siteName: "InviteIZI" },
  };
}

function dateLong(date: string, time: string) {
  const w = parseWeddingDate(date, time);
  return t.date.long(w.day, w.monthIndex, w.year);
}

/**
 * Пригласительное заказа. Данные меняются после подтверждения оплаты (НАМУНА → полная),
 * поэтому страница читает базу при каждом запросе; пока читает — показывается молочный экран.
 */
export default function InvitationPage({ params }: PageProps<"/[slug]">) {
  return (
    <Suspense fallback={<Opening />}>
      <Invitation params={params} />
    </Suspense>
  );
}

async function Invitation({ params }: { params: PageProps<"/[slug]">["params"] }) {
  const { slug } = await params;
  const page = await getInvitationBySlug(slug);
  if (!page) {
    // клиент сменил ссылку: гости со старой попадают на новую
    const current = await currentSlugFor(slug);
    if (current) permanentRedirect(`/${current}`);
    notFound();
  }
  if (page.mode === "expired") return <Expired />;
  const design = getDesign(page.order.templateId);
  if (!design) notFound();

  const { default: Design } = await loadOrderDesign(design, page.data.designVersion);
  // Фото клиента — только у дизайнов с clientPhotos (наҳорги ош — никогда): старые фото после смены дизайна не всплывают
  const data = design.clientPhotos ? page.data : { ...page.data, photos: undefined };
  return <Design data={data} mode={page.mode} art={existingArt(design)} />;
}

/** Пока загружается заказ: тот же молочный фон, без мигания белым */
function Opening() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-[#f7efe3] px-4">
      <p className="animate-pulse text-[16px] tracking-[0.08em] text-[#a87a28]">{t.invitationPage.loading}</p>
    </main>
  );
}
