/** Только сервер: проверка файла картины на диске. Реестр дизайнов без node:fs — его подключает и приложение (/app) */
import { existsSync } from "node:fs";
import path from "node:path";
import type { Design } from "./registry";

/** Адрес картины дизайна, если файл уже лежит в public/ (иначе дизайн рисует временный фон) */
export function existingArt(design: Design) {
  if (!design.art) return undefined;
  return existsSync(path.join(process.cwd(), "public", design.art)) ? design.art : undefined;
}
