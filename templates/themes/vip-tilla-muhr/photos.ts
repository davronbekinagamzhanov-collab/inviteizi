import type { InvitationData } from "@/lib/types";

export type VipPhoto = { src: string; fallback: string; client: boolean; slot: 1 | 2 | 3 };

/** The same three ordered client-photo slots used by the existing bot and InvitationData. */
export function vipPhotos(data: Pick<InvitationData, "photos">, id: string): [VipPhoto, VipPhoto, VipPhoto | undefined] {
  const hero = id === "vip-suzana" ? "/vip/vip-tilla-muhr/hero.webp" : `/vip/${id}/hero.webp`;
  const fallbacks = [hero, `/vip/${id}/flowers.webp`, hero];
  const own = (data.photos ?? []).slice(0, 3);
  const photo = (index: number): VipPhoto => ({ src: own[index] || fallbacks[index], fallback: fallbacks[index], client: Boolean(own[index]), slot: (index + 1) as 1 | 2 | 3 });
  return [photo(0), photo(1), own[2] ? photo(2) : undefined];
}
