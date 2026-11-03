import type { InvitationData } from "./types";

const NBSP = "\u00a0";

/**
 * Без «висячих» слов: «ва», «ҳам», «ё» прилипают к следующему слову, «билан», «учун», «каби» — к предыдущему.
 * Неразрывный пробел: перенос строки между ними невозможен.
 */
export function glueWords(text: string) {
  return text
    .replace(/(^|\s)(ва|ҳам|ё)\s+/giu, `$1$2${NBSP}`)
    .replace(/\s+(билан|учун|каби)(?=[\s.,!?:;]|$)/giu, `${NBSP}$1`);
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
