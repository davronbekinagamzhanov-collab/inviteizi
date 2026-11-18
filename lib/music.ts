/**
 * «Наш список» музыки по тадбирам: строки — таблица music, файлы — только сайт public/audio/**
 * (что реально играет — lib/music-available.ts). Названия — texts/music-titles.ts.
 */
import type { Occasion } from "./types";
import originals from "@/music/originals/manifest.json";
import { musicTitles } from "@/texts/music-titles";
import { slugify } from "./slug";
import { AUDIO_FILES, DEMO_TRACK } from "./music-available";

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

/**
 * Мелодия, которую играет демо шаблона (/demo/<id>) и заказ, чья песня больше недоступна.
 * Всегда файл сайта (Supabase Storage с 16.11.2026 отвечает 402): сначала песня библиотеки с пометкой demo,
 * если её файл уже лежит в public/audio/lib/<тадбир>/, иначе своя мелодия InviteIZI (lib/music-available.ts).
 */
export function demoMusicUrl(occasion: Occasion): string | undefined {
  const name = Object.keys(musicTitles).find((n) => musicTitles[n].demo === occasion);
  const lib = name ? `/audio/lib/${occasion}/${name}.mp3` : undefined;
  if (lib && AUDIO_FILES.has(lib)) return lib;
  const own = `/audio/originals/${DEMO_TRACK[occasion]}.mp3`;
  if (AUDIO_FILES.has(own)) return own;
  const first = originals.find((track) => track.occasion === occasion);
  return first ? `/audio/originals/${first.id}.mp3` : undefined;
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
