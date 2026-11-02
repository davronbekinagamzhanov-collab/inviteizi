import unsplash from "./unsplash.json";
import local from "./local-photos.json";

/** Фото с Unsplash: показываем по hotlink-адресу images.unsplash.com с размером под телефон */
export type UnsplashSlot = keyof typeof unsplash;
export type LocalSlot = keyof typeof local;

const UTM = "utm_source=inviteizi&utm_medium=referral";

export function unsplashSrc(slot: UnsplashSlot, width = 860, height?: number) {
  const p = unsplash[slot];
  const size = height ? `&w=${width}&h=${height}&fit=crop&crop=entropy` : `&w=${width}`;
  return `${p.raw}${size}&q=72&fm=webp&auto=format`;
}

/** Подпись «Сурат: Имя / Unsplash» для низа страницы (ссылки с utm — правило Unsplash) */
export type PhotoCredit = { author: string; authorUrl: string; source: string; sourceUrl: string };

export function unsplashCredit(slot: UnsplashSlot): PhotoCredit {
  const p = unsplash[slot];
  return { author: p.author, authorUrl: `${p.authorUrl}?${UTM}`, source: "Unsplash", sourceUrl: `https://unsplash.com/?${UTM}` };
}

export function localPhoto(slot: LocalSlot) {
  return local[slot] as { src: string; poster?: string; author: string; license: string; licenseUrl: string; source: string };
}

export function localCredit(slot: LocalSlot): PhotoCredit {
  const p = localPhoto(slot);
  return { author: p.author, authorUrl: p.source, source: p.source.includes("pixabay") ? "Pixabay" : "Openverse", sourceUrl: p.source };
}
