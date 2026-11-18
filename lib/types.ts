/**
 * Данные одного пригласительного. Позже это будет строка в таблице orders (Supabase).
 * Шаблон получает только эти данные и ничего не знает о базе.
 * Имена, места и хозяева — данные клиента. Все остальные слова — в texts/uz-cyrl.ts.
 */

/** Тадбир — повод всего пригласительного */
export type Occasion = "nikoh" | "sunnat" | "nahorgi" | "yubiley";

/** Вид отдельного события внутри пригласительного (у каждого свои дата, время, место) */
export type EventKind =
  | "nahorgi" // наҳорги ош (утром)
  | "nikohMarosim" // никоҳ маросими (ЗАГС / имом)
  | "nikohBazm" // тўй базми
  | "kelinSalom" // келин салом (обычно на следующее утро)
  | "sunnatBazm"
  | "yubileyBazm";

export type InvitationEvent = {
  kind: EventKind;
  date: string; // "2026-11-14" (ГГГГ-ММ-ДД)
  time: string; // "18:00"
  venueName: string; // «Наврўз» тўйхонаси  /  Хонадонимиз
  address: string; // Сайрам, Амир Темур кўчаси 45
  location?: { lat: number; lng: number }; // точка, которую клиент отправил в Telegram
  mapUrl?: string; // ссылка 2GIS / Google Maps, если клиент прислал ссылку вместо точки
};

/** Кем приходится виновник торжества хозяевам: от этого собирается текст */
/** ozimiz — «ўзимизники»: тўй самих хозяев, без «фарзандимиз» */
export type Relation = "farzand" | "ogil" | "qiz" | "nabira" | "uka" | "ona" | "ota" | "ozimiz";

/** Языки приглашения кроме узбекского */
export type ExtraLang = "ru" | "kk";
export const EXTRA_LANGS: ExtraLang[] = ["ru", "kk"];

export type InvitationData = {
  /** Explicit opt-in; absent keeps the original appearance of every existing order. */
  designVersion?: "premium-v1";
  /** Выдано владельцем без оплаты (Mini App «Бесплатно яратиш»): причина, кто и когда. Сумма заказа 0 */
  staffGrant?: { reason: StaffGrantReason; by: number; at: string };
  occasion: Occasion;
  /** Никоҳ: жених и невеста */
  groom?: string;
  bride?: string;
  /** Суннат: мальчик; наҳорги ош: чей повод; юбилей: юбиляр («Мукаррам опа») */
  person?: string;
  relation?: Relation;
  /** Наҳорги ош: по какому поводу (никоҳ, суннат…) */
  cause?: Exclude<Occasion, "nahorgi">;
  /** Юбилей: сколько лет */
  age?: number;
  /** «Каримовлар оиласи» */
  hosts: string;
  /** Никоҳ: «Куёв томони» и «Келин томони» (если клиент указал обе семьи) */
  sides?: { groom?: string; bride?: string };
  /** 1–3 события; первое — главное (для таймера и «Тўй санаси») */
  events: InvitationEvent[];
  /** Готовый вариант текста из t.invite (по умолчанию первый) */
  textId?: string;
  /** Свой текст клиента (до 600 знаков) — заменяет готовый */
  customText?: string;
  /** v2: языки, которые гость может выбрать кроме узбекского (узбекский есть всегда) */
  langs?: ExtraLang[];
  /** v2: на каком языке страница открывается по умолчанию (узбекский — если не указан). Только из выбранных */
  mainLang?: ExtraLang;
  /** v2: свой текст клиента на других языках (ввёл сам). Нет — гость видит узбекский свой текст */
  customTexts?: Partial<Record<ExtraLang, string>>;
  /** Файл песни клиента. Нет — играет мелодия дизайна */
  musicUrl?: string;
  /** Клиент выбрал «без музыки» */
  noMusic?: boolean;
  /** Фото клиента (1–3 публичных адреса WebP в бакете photos). Пусто — дизайн ставит своё фото */
  photos?: string[];
  /** Клиент разрешил гостям отвечать «Келаман / Келолмайман» */
  rsvp?: boolean;
  /** Только для страницы: куда отправлять ответ гостя. В базе не хранится */
  rsvpSlug?: string;
};

/** demo — с водяным знаком «НАМУНА» и без музыки (до оплаты); full — полная версия */
export type InvitationMode = "demo" | "full";

/** Причины бесплатной выдачи владельцем: подарок, пример, оплачено наличными, замена */
export const STAFF_GRANT_REASONS = ["gift", "sample", "cash", "replace"] as const;
export type StaffGrantReason = (typeof STAFF_GRANT_REASONS)[number];

/** Демо каталога: форма «Келасизми?» видна как образец и ничего не отправляет (19.11.2026) */
// подчёркивания в адресе заказа невозможны (isValidSlug), поэтому настоящий заказ с таким адресом не появится
export const DEMO_RSVP_SLUG = "_namuna_";
