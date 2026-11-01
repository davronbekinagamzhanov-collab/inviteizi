/**
 * «Наш список» музыки по тадбирам. Файлы: public/music/<папка>/<имя>.mp3 → бакет music/<папка>/<имя>.mp3,
 * строки — таблица music (scripts/music-sync.mjs). Названия — texts/music-titles.ts.
 */
import type { Occasion } from "./types";
import originals from "@/music/originals/manifest.json";
import { musicTitles } from "@/texts/music-titles";
import { slugify } from "./slug";

/** Папка музыки тадбира (наҳорги ош — «nahorgi-osh», как владелец назвал папку) */
export const MUSIC_FOLDERS: Record<Occasion, string> = {
  nikoh: "nikoh",
  nahorgi: "nahorgi-osh",
  sunnat: "sunnat",
  yubiley: "yubiley",
};

export const occasionOfFolder = (folder: string): Occasion | undefined =>
  (Object.keys(MUSIC_FOLDERS) as Occasion[]).find((o) => MUSIC_FOLDERS[o] === folder);

/** id трека в таблице music: «nikoh-atlas-ozbekiston» */
export const trackId = (occasion: Occasion, name: string) => `${occasion}-${name}`;

/** Путь файла в бакете music */
export const trackPath = (occasion: Occasion, name: string) => `${MUSIC_FOLDERS[occasion]}/${name}.mp3`;

const SUPABASE_URL = "https://hjakyirmyauqhurkqhsn.supabase.co";

/**
 * Мелодия, которую играет демо шаблона (/demo/<id>): своя для каждого тадбира.
 * Публичный адрес в хранилище — файл загружает scripts/music-sync.mjs.
 */
export function demoMusicUrl(occasion: Occasion): string | undefined {
  const original = originals.find(track => track.occasion === occasion);
  if (original) return `/audio/originals/${original.id}.mp3`;
  const name = Object.keys(musicTitles).find((n) => musicTitles[n].demo === occasion);
  return name ? `${SUPABASE_URL}/storage/v1/object/public/music/${trackPath(occasion, name)}` : undefined;
}

/**
 * Имя файла трека → латиница kebab-case (так файл называется на диске и в хранилище):
 * «Janob Rasul - To'y-to'y.mp3» → «janob-rasul-toy-toy», «toy-bola_(uzhits.net)» → «toy-bola»
 */
export function trackFileName(original: string): string {
  const base = original
    .replace(/\.mp3$/i, "")
    .replace(/uzhits\s*\.?\s*net/gi, " ")
    .replace(/[_()[\]]+/g, " ")
    .replace(/\b(19|20)\d{2}\b|\b\d{3,}\b/g, " ");
  return slugify(base);
}
