import type { InvitationData } from "@/lib/types";
import { slugify } from "@/lib/slug";
import type { VipPhoto } from "../vip-tilla-muhr/photos";

export const atelierIds = ["vip-marvarid", "vip-bogi-visol", "vip-oq-tulpor", "vip-umr-ziyosi"] as const;
export type AtelierId = typeof atelierIds[number];
export type AtelierKind = "pearl" | "garden" | "horse" | "album";
export const atelier = {
  "vip-marvarid": { kind: "pearl", paper: "#f7f3ec", ink: "#494239", accent: "#a48960", soft: "#eae1d4", defaults: ["/vip/vip-marvarid/hero.webp", "/vip/vip-tilla-muhr/flowers.webp", "/vip/vip-osmon/hands.webp"] },
  "vip-bogi-visol": { kind: "garden", paper: "#f3f0e5", ink: "#293e32", accent: "#8d8458", soft: "#e2e5d5", defaults: ["/vip/vip-bogi-visol/hero.webp", "/vip/vip-suzana/flowers.webp", "/vip/vip-tilla-muhr/rings.webp"] },
  "vip-oq-tulpor": { kind: "horse", paper: "#f8f4e9", ink: "#344c3e", accent: "#9b8357", soft: "#e6eadc", defaults: ["/vip/vip-oq-tulpor/hero.webp"] },
  "vip-umr-ziyosi": { kind: "album", paper: "#f7efe5", ink: "#543e36", accent: "#95654f", soft: "#e9dcd0", defaults: ["/vip/vip-umr-ziyosi/hero.webp", "/vip/vip-suzana/flowers.webp", "/vip/vip-tilla-muhr/table.webp"] },
} satisfies Record<AtelierId, {kind: AtelierKind; paper: string; ink: string; accent: string; soft: string; defaults: string[]}>;

/** Existing bot slots, with all three defaults retained when the customer does not upload. Sunnat is intentionally immutable. */
export function atelierPhotos(data: Pick<InvitationData, "photos">, id: AtelierId): VipPhoto[] {
  const config = atelier[id];
  return config.defaults.map((fallback, index) => {
    const own = id === "vip-oq-tulpor" ? undefined : data.photos?.[index];
    return {src: own || fallback, fallback, client: Boolean(own), slot: (index + 1) as 1 | 2 | 3};
  });
}

/** Exactly one Latin capital per partner; uses the project's existing Uzbek transliteration. */
export function latinInitial(name?: string) {
  return name?.trim() ? slugify(name).replace(/[^a-z]/g, "").charAt(0).toUpperCase() : "";
}
export function partnerInitials(data: Pick<InvitationData, "groom" | "bride">) {
  return [latinInitial(data.groom), latinInitial(data.bride)];
}
