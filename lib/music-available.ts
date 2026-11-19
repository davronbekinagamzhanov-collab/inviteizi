/**
 * Музыка, которая реально играет (19.11.2026).
 *
 * С 16.11.2026 Supabase Storage отвечает 402, песни библиотеки никоҳ/наҳорги/суннат лежали только там.
 * Играют только файлы сайта `public/audio/**` (список — lib/audio-files.json, собирается при сборке).
 * Правила:
 * - клиенту (бот и Mini App) показываются только песни, чей файл есть на сайте;
 * - у каждого тадбира не меньше 3 песен: если своих мало — подходящие по настроению из других тадбиров;
 * - заказ с недоступной песней (выбрана раньше) играет демо-мелодию своего тадбира, а не тишину.
 */
import audioFiles from "./audio-files.json";
import type { Occasion } from "./types";

/** Файлы на сайте, например «/audio/originals/inviteizi-yubiley-diydor.mp3» */
export const AUDIO_FILES: ReadonlySet<string> = new Set(audioFiles as string[]);

/** Наш сайт (адреса песен в таблице music могут быть абсолютными) */
const OWN_HOSTS = new Set(["inviteizi.vercel.app", "localhost"]);

/** Адрес песни → путь файла на сайте, если такой файл есть; иначе null (Supabase, чужой сайт, нет файла) */
export function localAudioPath(url: string | null | undefined): string | null {
  if (!url) return null;
  let path: string;
  if (url.startsWith("/")) path = url;
  else {
    try {
      const u = new URL(url);
      if (!OWN_HOSTS.has(u.hostname) && !u.hostname.endsWith(".vercel.app")) return null;
      path = u.pathname;
    } catch {
      return null;
    }
  }
  path = path.split("?")[0];
  try {
    path = decodeURI(path);
  } catch {
    return null;
  }
  return AUDIO_FILES.has(path) ? path : null;
}

export const isPlayableMusicUrl = (url: string | null | undefined) => localAudioPath(url) !== null;

/** Чужие мелодии, подходящие тадбиру по настроению (в порядке показа), — если своих меньше 3 */
export const MUSIC_BORROW: Record<Occasion, readonly string[]> = {
  nikoh: [
    "inviteizi-sunnat-oilaviy-shodlik",
    "inviteizi-yubiley-diydor",
    "inviteizi-sunnat-mehr-rishtasi",
    "inviteizi-sunnat-bayram-nafasi",
  ],
  nahorgi: [
    "inviteizi-sunnat-duolar-sadosi",
    "inviteizi-yubiley-minnatdorlik",
    "inviteizi-sunnat-bayram-nafasi",
    "inviteizi-yubiley-ehtirom",
  ],
  sunnat: ["inviteizi-yubiley-diydor", "inviteizi-yubiley-xotira-bogi", "inviteizi-yubiley-umr-nuri"],
  yubiley: ["inviteizi-sunnat-mehr-rishtasi", "inviteizi-sunnat-duolar-sadosi", "inviteizi-sunnat-oilaviy-shodlik"],
};

/** Демо-мелодия тадбира (демо дизайнов, заказы с недоступной песней) — всегда файл сайта */
export const DEMO_TRACK: Record<Occasion, string> = {
  nikoh: "inviteizi-sunnat-oilaviy-shodlik",
  nahorgi: "inviteizi-sunnat-duolar-sadosi",
  sunnat: "inviteizi-sunnat-qutlug-qadam",
  yubiley: "inviteizi-yubiley-umr-nuri",
};

export const MIN_TRACKS = 3;

type Track = { id: string; fileUrl: string; occasion?: Occasion | null };

/**
 * Список песен тадбира из всех активных строк таблицы music:
 * только играющие; свои первыми; если своих < 3 — добавляются все MUSIC_BORROW.
 * Без тадбира — все играющие.
 */
export function playableMusic<T extends Track>(all: readonly T[], occasion?: Occasion): T[] {
  const ok = all.filter((m) => isPlayableMusicUrl(m.fileUrl));
  if (!occasion) return ok;
  const mine = ok.filter((m) => !m.occasion || m.occasion === occasion);
  if (mine.length >= MIN_TRACKS) return mine;
  const have = new Set(mine.map((m) => m.id));
  // тот же файл под другим id не повторяем
  const files = new Set(mine.map((m) => localAudioPath(m.fileUrl)));
  for (const id of MUSIC_BORROW[occasion]) {
    const m = ok.find((x) => x.id === id);
    if (!m || have.has(m.id) || files.has(localAudioPath(m.fileUrl))) continue;
    mine.push(m);
    have.add(m.id);
    files.add(localAudioPath(m.fileUrl));
  }
  return mine;
}
