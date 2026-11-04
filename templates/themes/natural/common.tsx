"use client";
/** Данные, общие для натуральных дизайнов: фото (клиента или стоковые), подписи авторов, места для карты */
import type { InvitationData } from "@/lib/types";
import type { PhotoCredit } from "../../blocks/Brand";
import type { Invitation } from "../../blocks/useInvitation";
import {
  localCredit,
  localPhoto,
  unsplashCredit,
  unsplashSrc,
  type LocalSlot,
  type UnsplashSlot,
} from "./photos";

export type Stock =
  | { kind: "unsplash"; slot: UnsplashSlot; w?: number; h?: number; zoom?: number }
  | { kind: "local"; slot: LocalSlot };
export type Shot = { src: string; client: boolean; credit?: PhotoCredit };

export function stock(s: Stock): Shot {
  if (s.kind === "unsplash")
    return {
      src: unsplashSrc(s.slot, s.w ?? 860, s.h, s.zoom),
      client: false,
      credit: unsplashCredit(s.slot),
    };
  return {
    src: localPhoto(s.slot).src,
    client: false,
    credit: localCredit(s.slot),
  };
}

/**
 * Фото для мест дизайна: сначала фото клиента (по порядку), потом — стоковые.
 * clientSlots — сколько первых мест могут занять фото клиента.
 */
export function shots(
  data: InvitationData,
  fallbacks: Stock[],
  clientSlots = fallbacks.length,
): Shot[] {
  const own = (data.photos ?? []).slice(0, clientSlots);
  return fallbacks.map((f, i) =>
    own[i] ? { src: own[i], client: true } : stock(f),
  );
}

/** Подписи авторов только тех фото, что реально на странице (без повторов) */
export function creditsOf(list: Shot[]): PhotoCredit[] {
  const seen = new Set<string>();
  return list.flatMap((x) =>
    x.credit && !seen.has(x.credit.authorUrl) && seen.add(x.credit.authorUrl)
      ? [x.credit]
      : [],
  );
}

/** Разные места тадбиров (у каждого — своя кнопка карты) */
export function venues(inv: Invitation) {
  const seen = new Map<string, Invitation["events"][number]>();
  for (const e of inv.program) {
    const key = `${e.venueName}|${e.address}`;
    if (!seen.has(key)) seen.set(key, e);
  }
  return [...seen.values()];
}

/** Первая буква имени (кириллица остаётся кириллицей) */
export const initial = (name?: string) =>
  (name ?? "").trim().charAt(0).toUpperCase();
