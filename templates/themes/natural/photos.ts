import unsplash from "./unsplash.json";
import local from "./local-photos.json";

/** Фото с Unsplash: показываем по hotlink-адресу images.unsplash.com с размером под телефон */
export type UnsplashSlot = keyof typeof unsplash;
export type LocalSlot = keyof typeof local;

const UTM = "utm_source=inviteizi&utm_medium=referral";

// Запрашиваем в 1,5 раза больше заданной ширины: на телефоне @3x (430 px → 1290) фото не «мылится»
const SHARP = 1.5;

/** zoom > 1 — кадр «приближен» к центру (fp-z), чтобы убрать лишнее по краям (стол, посторонние предметы) */
export function unsplashSrc(slot: UnsplashSlot, width = 860, height?: number, zoom?: number) {
  const p = unsplash[slot];
  const w = Math.min(2000, Math.round(width * SHARP));
  const h = height && Math.round((height * w) / width);
  const size = zoom
    ? `&w=${w}&h=${h ?? w}&fit=crop&crop=focalpoint&fp-x=.5&fp-y=.5&fp-z=${zoom}`
    : h ? `&w=${w}&h=${h}&fit=crop&crop=entropy` : `&w=${w}`;
  return `${p.raw}${size}&q=75&fm=webp&auto=format`;
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
  // CC BY / BY-SA (Wikimedia): «Автор / CC BY-SA 4.0» — ссылка на файл у автора, на лицензию у её названия
  if (p.license.startsWith("CC BY")) return { author: p.author, authorUrl: p.source, source: p.license, sourceUrl: p.licenseUrl };
  return { author: p.author, authorUrl: p.source, source: p.source.includes("pixabay") ? "Pixabay" : "Openverse", sourceUrl: p.source };
}
