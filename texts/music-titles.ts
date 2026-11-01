/**
 * Названия треков «нашего списка» (файлы в public/music/<тип>/<имя>.mp3).
 * Ключ — имя файла без .mp3. Нет записи — название берётся из имени файла (дефисы → пробелы).
 * artist — песня исполнителя (владелец может скрыть все такие одним действием: music.is_artist).
 * generated — временная мелодия, сделанная кодом: скрывается, когда у тадбира есть настоящие файлы.
 * demo — эту мелодию играет демо шаблонов этого тадбира (/demo/<id>).
 */
import type { Occasion } from "@/lib/types";

export type TrackTitle = { uz: string; ru: string; artist?: boolean; generated?: boolean; demo?: Occasion };

export const musicTitles: Record<string, TrackTitle> = {
  // Original, permanently supported recordings; not temporary placeholder melodies.
  "inviteizi-sunnat-qutlug-qadam": { uz: "Қутлуғ қадам", ru: "Добрый шаг" },
  "inviteizi-sunnat-oilaviy-shodlik": { uz: "Оилавий шодлик", ru: "Семейная радость" },
  "inviteizi-sunnat-duolar-sadosi": { uz: "Дуолар садоси", ru: "Отзвук добрых молитв" },
  "inviteizi-sunnat-navnihollar": { uz: "Навниҳоллар", ru: "Юные побеги" },
  "inviteizi-sunnat-bayram-nafasi": { uz: "Байрам нафаси", ru: "Дыхание праздника" },
  "inviteizi-sunnat-mehr-rishtasi": { uz: "Меҳр риштаси", ru: "Нить доброты" },
  "inviteizi-yubiley-umr-nuri": { uz: "Умр нури", ru: "Свет прожитых лет" },
  "inviteizi-yubiley-ehtirom": { uz: "Эҳтиром", ru: "Почтение" },
  "inviteizi-yubiley-xotira-bogi": { uz: "Хотира боғи", ru: "Сад воспоминаний" },
  "inviteizi-yubiley-diydor": { uz: "Дийдор", ru: "Радость встречи" },
  "inviteizi-yubiley-sokin-oqshom": { uz: "Сокин оқшом", ru: "Тихий вечер" },
  "inviteizi-yubiley-minnatdorlik": { uz: "Миннатдорлик", ru: "Благодарность" },

  // ── Никоҳ ──
  "atlas-ozbekiston": { uz: "Атлас — миллий куй", ru: "Атлас — узбекская мелодия", demo: "nikoh" },
  "debussy-clair-de-lune": { uz: "Дебюсси — «Ой нури»", ru: "Дебюсси — «Лунный свет»" },
  "pachelbel-kanon": { uz: "Пахельбель — «Канон»", ru: "Пахельбель — «Канон»" },
  "nozik-fortepiano": { uz: "Нозик фортепиано", ru: "Нежное фортепиано" },
  "janob-rasul-toy-toy": { uz: "Жаноб Расул — «Тўй-тўй»", ru: "Жаноб Расул — «Тўй-тўй»", artist: true },
  "umidaxon-toy-qilamiz": { uz: "Умидахон — «Тўй қиламиз»", ru: "Умидахон — «Тўй қиламиз»", artist: true },
  "vohid-abdulhakim-kelin-kuyov": { uz: "Воҳид Абдулҳаким — «Келин-куёв»", ru: "Вохид Абдулхаким — «Келин-куёв»", artist: true },
  "dildora-kunuzokova-ozbegim-toylari": { uz: "Дилдора Кунузокова — «Ўзбегим тўйлари»", ru: "Дилдора Кунузокова — «Ўзбегим тўйлари»", artist: true },
  "nilufar-usmonova-yor-yor": { uz: "Нилуфар Усмонова — «Ёр-ёр»", ru: "Нилуфар Усмонова — «Ёр-ёр»", artist: true },
  "oltin-monogramma": { uz: "Чанг ва най", ru: "Чанг и най", generated: true },
  sapfir: { uz: "Оқшом куйи", ru: "Вечерняя мелодия", generated: true },

  // ── Наҳорги ош ──
  "masrur-usmonov-toylar-muborak": { uz: "Масрур Усмонов — «Тўйлар муборак»", ru: "Масрур Усмонов — «Тўйлар муборак»", artist: true, demo: "nahorgi" },
  "tonggi-qozon": { uz: "Тонгги куй", ru: "Утренняя мелодия", generated: true },

  // ── Суннат ──
  "ravshan-komilov-toy-bola": { uz: "Равшан Комилов — «Тўй бола»", ru: "Равшан Комилов — «Тўй бола»", artist: true, demo: "sunnat" },
  "oq-ot": { uz: "Дойра ва сурнай", ru: "Дойра и сурнай", generated: true },

  // ── Юбилей ──
  "pion-guldasta": { uz: "Баҳор куйи", ru: "Весенняя мелодия", generated: true, demo: "yubiley" },
};

/**
 * Название из имени файла, если записи нет:
 * «Janob Rasul - To'y-to'y (uzhits.net)» → «Janob Rasul — To'y-to'y»; «yangi-qoshiq_2024» → «yangi qoshiq»
 */
export function titleFromFile(original: string): TrackTitle {
  const clean = original
    .replace(/\.[a-z0-9]+$/i, "") // расширение
    .replace(/\(.*?\)|\[.*?\]/g, " ") // (uzhits.net), [320kbps]
    .replace(/_+/g, " ")
    .replace(/\b(19|20)\d{2}\b|\b\d{3,}\b/g, " "); // годы и номера
  // имя целиком в kebab-case («yangi-qoshiq») — дефисы это пробелы; иначе дефисы — часть названия («To'y-to'y»)
  const kebab = !/\s/.test(clean.trim());
  const tidy = (part: string) => (kebab ? part.replace(/[-_]+/g, " ") : part.replace(/_+/g, " ")).replace(/\s+/g, " ").trim();
  const title = (clean.includes(" - ") ? clean.split(" - ").map(tidy).filter(Boolean).join(" — ") : tidy(clean)) || original;
  return { uz: title, ru: title };
}
