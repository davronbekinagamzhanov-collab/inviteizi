/**
 * Язык, на котором сейчас показано пригласительное (v2, часть 9).
 * Меняется только в браузере гостя (переключатель «ЎЗ · РУ · ҚЗ»). На сервере всегда «uz»:
 * один процесс обслуживает много запросов, общий язык там недопустим.
 */
export type InviteLang = "uz" | "ru" | "kk";
export const INVITE_LANGS: InviteLang[] = ["uz", "ru", "kk"];

let current: InviteLang = "uz";

export const getInviteLang = (): InviteLang => current;

export function setInviteLang(lang: InviteLang) {
  if (typeof window === "undefined") return;
  current = lang;
}
