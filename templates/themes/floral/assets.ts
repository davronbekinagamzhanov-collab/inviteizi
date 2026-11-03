import type { PhotoCredit } from "../natural/photos";

/**
 * Акварельные цветы стиля «Гулли рамка» (public/floral/*.webp, прозрачные).
 * Источник — Pixabay (Pixabay Content License), авторы — в public/floral/CREDITS.md.
 */
const FLORAL = {
  "rose-garland": { author: "Urdu-Flex-Data", page: "https://pixabay.com/illustrations/flowers-roses-border-banner-floral-7912130/", w: 1280, h: 339 },
  "rose-anemone": { author: "mizanrahmanmiraz", page: "https://pixabay.com/illustrations/flower-ornament-nature-pink-plant-4329170/", w: 1280, h: 534 },
  "eucalyptus-top": { author: "PhuongLucky", page: "https://pixabay.com/vectors/flowers-greetting-card-6798843/", w: 1140, h: 604 },
  "eucalyptus-bottom": { author: "PhuongLucky", page: "https://pixabay.com/vectors/flowers-greetting-card-6798843/", w: 1140, h: 603 },
  "blossom-pink": { author: "18706286", page: "https://pixabay.com/illustrations/flowers-plant-watercolor-bloom-5958386/", w: 643, h: 1062 },
  "tea-sprig": { author: "SYG_Anime", page: "https://pixabay.com/illustrations/leaves-plant-watercolor-eucalyptus-5672036/", w: 928, h: 1100 },
  "tea-leaves": { author: "SYG_Anime", page: "https://pixabay.com/illustrations/leaves-twig-watercolor-foliage-5677717/", w: 1009, h: 1195 },
  "tulip-pink": { author: "ViolkaArt", page: "https://pixabay.com/illustrations/tulips-pink-tulips-7704887/", w: 900, h: 1239 },
  "burgundy-peony": { author: "lucianapappdesign", page: "https://pixabay.com/illustrations/watercolor-flower-painting-flora-4358965/", w: 973, h: 930 },
  "burgundy-small": { author: "lucianapappdesign", page: "https://pixabay.com/illustrations/watercolour-flowers-4609343/", w: 451, h: 466 },
} as const;

export type FloralAsset = keyof typeof FLORAL;

export const floralSrc = (name: FloralAsset) => `/floral/${name}.webp`;
export const floralSize = (name: FloralAsset) => ({ width: FLORAL[name].w, height: FLORAL[name].h });

const UTM = "utm_source=inviteizi&utm_medium=referral";

/** Подписи авторов для низа страницы (одна строка) — без повторов */
export function floralCredits(names: FloralAsset[]): PhotoCredit[] {
  const seen = new Set<string>();
  return names.flatMap((n) => {
    const a = FLORAL[n];
    // один автор — одна ссылка (на первую его иллюстрацию)
    if (seen.has(a.author)) return [];
    seen.add(a.author);
    return [{ author: a.author, authorUrl: `${a.page}?${UTM}`, source: "Pixabay", sourceUrl: `https://pixabay.com/?${UTM}` }];
  });
}
