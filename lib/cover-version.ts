/**
 * Адрес обложки с версией: /covers/<id>.webp?v=<хеш файла>. /covers отдаётся с кэшем на год (next.config.ts),
 * поэтому при замене картинки адрес обязан меняться — иначе телефон и Telegram показывают старую.
 * Хеши считает scripts/cover-versions.mjs перед сборкой (templates/cover-versions.json).
 */
import versions from "@/templates/cover-versions.json";

export type CoverVersions = Record<string, string>;

/** Чистая функция для тестов: путь + таблица версий → адрес с ?v= (нет файла в таблице — без версии) */
export function withVersion(src: string, table: CoverVersions): string {
  const [bare] = src.split("?");
  const v = table[bare];
  return v ? `${bare}?v=${v}` : bare;
}

export const coverVersioned = (src: string) => withVersion(src, versions as CoverVersions);
