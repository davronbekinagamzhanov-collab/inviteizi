import type { InvitationData } from "./types";

const NBSP = "\u00a0";

/**
 * Без «висячих» слов: «ва», «ҳам», «ё» прилипают к следующему слову, «билан», «учун», «каби» — к предыдущему.
 * Неразрывный пробел: перенос строки между ними невозможен.
 */
export function glueWords(text: string) {
  // [^\S\n] — пробелы, кроме перевода строки: свой перенос клиента в тексте не трогаем
  return text
    .replace(/(^|\s)(ва|ҳам|ё)[^\S\n]+/giu, `$1$2${NBSP}`)
    .replace(/[^\S\n]+(билан|учун|каби)(?=[\s.,!?:;]|$)/giu, `${NBSP}$1`);
}

/** Тексты заказа, которые дизайн показывает гостю, — со склейкой (данные в базе не меняются) */
export function glueData(d: InvitationData): InvitationData {
  const g = (s?: string) => (s ? glueWords(s) : s);
  return {
    ...d,
    groom: g(d.groom),
    bride: g(d.bride),
    person: g(d.person),
    hosts: glueWords(d.hosts),
    customText: g(d.customText),
    sides: d.sides ? { ...d.sides, groom: g(d.sides.groom), bride: g(d.sides.bride) } : d.sides,
  };
}

/** Весь объект текстов со склейкой: строки, результаты функций, вложенные объекты и массивы */
export function glueDeep<T>(value: T, glue: (s: string) => string = glueWords): T {
  if (typeof value === "string") return glue(value) as T;
  if (typeof value === "function") return ((...args: unknown[]) => glueDeep((value as (...a: unknown[]) => unknown)(...args), glue)) as T;
  if (Array.isArray(value)) return value.map((v) => glueDeep(v, glue)) as T;
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, glueDeep(v, glue)])) as T;
  return value;
}

/** Русский: короткие предлоги и союзы («в», «и», «на», «по»…) не висят в конце строки */
export function glueRuWords(text: string) {
  return text.replace(/(^|[\s(«])(и|а|в|во|с|со|к|ко|у|о|об|на|за|по|до|из|от|не)[^\S\n]+/giu, `$1$2${NBSP}`);
}

/** Казахский: «және», «мен» прилипают к следующему слову */
export function glueKkWords(text: string) {
  return text.replace(/(^|\s)(және|мен|бен|пен)[^\S\n]+/giu, `$1$2${NBSP}`);
}
