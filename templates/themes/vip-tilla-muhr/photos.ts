import type { InvitationData } from "@/lib/types";

export type VipPhoto = { src: string; fallback: string; client: boolean; slot: 1 | 2 | 3 };

/** The same three ordered client-photo slots used by the existing bot and InvitationData. */
export function vipPhotos(data: Pick<InvitationData, "photos">, id: string): [VipPhoto, VipPhoto, VipPhoto] {
  const fallbacks = id === "vip-suzana"
    ? ["/vip/vip-ipak-ziyosi/2.webp", "/vip/vip-ipak-ziyosi/1.webp", "/vip/vip-ipak-ziyosi/3.webp"]
    : id === "vip-osmon" ? [`/vip/${id}/hero.webp`, `/vip/${id}/hands.webp`, `/vip/${id}/rings.webp`]
    : [`/vip/${id}/hero.webp`, `/vip/${id}/flowers.webp`, `/vip/${id}/rings.webp`];
  const own = (data.photos ?? []).slice(0, 3);
  const photo = (index: number): VipPhoto => ({ src: own[index] || fallbacks[index], fallback: fallbacks[index], client: Boolean(own[index]), slot: (index + 1) as 1 | 2 | 3 });
  return [photo(0), photo(1), photo(2)];
}
