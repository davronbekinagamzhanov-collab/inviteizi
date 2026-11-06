/**
 * Правила анкеты заказа — одни для чата (bot/flow) и приложения (/app).
 * Без сервера и без текстов: только что спросить, что обязательно и что допустимо.
 */
import type { EventKind, InvitationData, InvitationEvent, Occasion, Relation } from "./types";

export const NAME_MAX = 40;
/** Суннат: двое мальчиков «Аҳмад ва Маҳмуд»; наҳорги ош и юбилей — имя с уважительным словом */
export const PERSON_MAX = NAME_MAX * 2;
export const HOSTS_MAX = 60;
export const VENUE_MAX = 80;
export const ADDRESS_MAX = 120;
export const MAX_CUSTOM_TEXT = 600;
export const MAX_EVENTS = 3;
export const AGE_MIN = 1;
export const AGE_MAX = 120;

/** Главный тадбир приглашения по поводу */
export const MAIN_EVENT: Record<Occasion, EventKind> = {
  nikoh: "nikohBazm",
  nahorgi: "nahorgi",
  sunnat: "sunnatBazm",
  yubiley: "yubileyBazm",
};

/** Кем приходится виновник торжества — варианты по поводу (первый — по умолчанию) */
export const RELATIONS: Record<Occasion, Relation[]> = {
  nikoh: ["farzand", "nabira", "ozimiz"],
  nahorgi: ["ogil", "qiz", "nabira", "uka", "ozimiz"],
  sunnat: ["ogil", "nabira", "uka", "farzand"],
  yubiley: ["ona", "ota", "ozimiz"],
};

/** Наҳорги ош: по какому поводу */
export const CAUSES = ["nikoh", "sunnat"] as const;
export type Cause = (typeof CAUSES)[number];

export const isCompleteEvent = (e: Partial<InvitationEvent> | null | undefined): e is InvitationEvent =>
  !!(e?.kind && e.date && e.time && e.venueName && e.address);

/** Какие тадбиры ещё можно добавить к главному (каждый вид — один раз) */
export function addableKinds(occasion: Occasion, cause: Occasion | undefined, have: (EventKind | undefined)[]): EventKind[] {
  const bazm: EventKind = cause === "sunnat" ? "sunnatBazm" : "nikohBazm";
  const options: EventKind[] = occasion === "nikoh" ? ["nahorgi", "kelinSalom"] : occasion === "nahorgi" ? [bazm] : ["nahorgi"];
  const taken = new Set(have);
  return options.filter((k) => !taken.has(k));
}

/** Повод наҳорги ош сменился — базм уже добавленного тадбира следует за ним (дата и место остаются) */
export function followCause(events: { kind?: EventKind }[], cause: Cause) {
  const bazm: EventKind = cause === "sunnat" ? "sunnatBazm" : "nikohBazm";
  for (const e of events) if (e.kind === "nikohBazm" || e.kind === "sunnatBazm") e.kind = bazm;
}

export type TextProblem = "empty" | "letters" | "long";

/** Имя, хозяева, место: невидимые символы убираем, пробелы схлопываем, нужна хотя бы одна буква */
export function cleanText(raw: unknown, max: number): { value: string } | { problem: TextProblem } {
  if (typeof raw !== "string") return { problem: "empty" };
  const v = raw.replace(/[\p{Cc}\p{Cf}]/gu, " ").trim().replace(/\s+/g, " ");
  if (!v) return { problem: "empty" };
  if (!/[\p{L}\p{N}]/u.test(v)) return { problem: "letters" };
  if (v.length > max) return { problem: "long" };
  return { value: v };
}

/** Свой текст приглашения: переносы строк клиента сохраняем, считаем видимые знаки (эмодзи — один знак) */
export function cleanOwnText(raw: unknown): { value: string } | { problem: TextProblem } {
  if (typeof raw !== "string") return { problem: "empty" };
  const v = raw
    .replace(/\r\n?/g, "\n")
    .replace(/[\p{Cc}\p{Cf}]/gu, (ch) => (ch === "\n" || ch === "‍" ? ch : " "))
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!v) return { problem: "empty" };
  if (!/[\p{L}\p{N}]/u.test(v)) return { problem: "letters" };
  if (graphemes(v) > MAX_CUSTOM_TEXT) return { problem: "long" };
  return { value: v };
}

export function graphemes(s: string) {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    return [...new Intl.Segmenter("uz", { granularity: "grapheme" }).segment(s)].length;
  }
  return [...s].length;
}

/** «18:00» — часы 0–23, минуты 00–59 */
export const isTime = (v: unknown): v is string => typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
/** «2026-11-14» — настоящая дата календаря */
export function isDate(v: unknown): v is string {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

/** Ссылка на карту: только https 2GIS / Google / Yandex / Apple — ничего другого в приглашение не попадёт */
const MAP_HOSTS = /^(?:[a-z0-9-]+\.)*(?:2gis\.(?:kz|ru|com|uz)|go\.2gis\.com|google\.[a-z.]+|goo\.gl|maps\.app\.goo\.gl|yandex\.(?:kz|ru|com|uz)|maps\.apple\.com)$/i;
export function cleanMapUrl(raw: unknown): string | undefined {
  if (typeof raw !== "string" || !raw.trim()) return undefined;
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "https:" || !MAP_HOSTS.test(u.hostname) || u.href.length > 500) return undefined;
    return u.href;
  } catch {
    return undefined;
  }
}

/** Поля, которые клиент заполняет в анкете, — по поводу */
export function fieldsFor(occasion: Occasion) {
  return {
    couple: occasion === "nikoh",
    person: occasion !== "nikoh",
    cause: occasion === "nahorgi",
    age: occasion === "yubiley",
  };
}

/** Анкета, как её присылает приложение: всё может быть пустым */
export type FormInput = Omit<Partial<InvitationData>, "events"> & { events?: Partial<InvitationEvent>[] };

export type FieldError =
  | "groom" | "bride" | "person" | "relation" | "cause" | "age" | "hosts" | "sideBride"
  | `ev${number}.date` | `ev${number}.past` | `ev${number}.time` | `ev${number}.venueName` | `ev${number}.address` | `ev${number}.mapUrl`;

/**
 * Проверка анкеты целиком (приложение показывает ошибку под полем).
 * today — «ГГГГ-ММ-ДД» по времени Казахстана: прошедший день выбрать нельзя.
 * Возвращает очищенные данные или список полей с ошибкой.
 */
export function validateForm(
  occasion: Occasion,
  input: FormInput,
  today: string,
): { data: InvitationData } | { errors: FieldError[] } {
  const errors: FieldError[] = [];
  const f = fieldsFor(occasion);
  const out: InvitationData = { occasion, hosts: "", events: [] };
  const take = (key: FieldError, raw: unknown, max: number) => {
    const r = cleanText(raw, max);
    if ("problem" in r) errors.push(key);
    return "value" in r ? r.value : undefined;
  };
  if (f.couple) {
    out.groom = take("groom", input.groom, NAME_MAX);
    out.bride = take("bride", input.bride, NAME_MAX);
  } else {
    out.person = take("person", input.person, PERSON_MAX);
  }
  const relations = RELATIONS[occasion];
  out.relation = relations.includes(input.relation as Relation) ? input.relation : relations[0];
  if (f.cause) {
    if (CAUSES.includes(input.cause as Cause)) out.cause = input.cause as Cause;
    else errors.push("cause");
  }
  if (f.age) {
    const n = Number(input.age);
    if (Number.isInteger(n) && n >= AGE_MIN && n <= AGE_MAX) out.age = n;
    else errors.push("age");
  }
  out.hosts = take("hosts", input.hosts, HOSTS_MAX) ?? "";
  if (f.couple && input.sides?.bride !== undefined && input.sides.bride !== "") {
    const bride = take("sideBride", input.sides.bride, HOSTS_MAX);
    if (bride) out.sides = { groom: out.hosts, bride };
  }

  const events: Partial<InvitationEvent>[] = (input.events ?? []).slice(0, MAX_EVENTS);
  if (!events.length) events.push({ kind: MAIN_EVENT[occasion] });
  const allowed = new Set<EventKind>([MAIN_EVENT[occasion], ...addableKinds(occasion, out.cause, [])]);
  const seen = new Set<EventKind>();
  events.forEach((e, i) => {
    const kind = i === 0 ? MAIN_EVENT[occasion] : e.kind;
    if (!kind || !allowed.has(kind) || seen.has(kind)) return;
    seen.add(kind);
    const ev: Partial<InvitationEvent> = { kind };
    if (!isDate(e.date)) errors.push(`ev${i}.date`);
    else if (e.date < today) errors.push(`ev${i}.past`);
    else ev.date = e.date;
    if (isTime(e.time)) ev.time = e.time;
    else errors.push(`ev${i}.time`);
    ev.venueName = take(`ev${i}.venueName`, e.venueName, VENUE_MAX);
    ev.address = take(`ev${i}.address`, e.address, ADDRESS_MAX);
    if (e.mapUrl) {
      const url = cleanMapUrl(e.mapUrl);
      if (url) ev.mapUrl = url;
      else errors.push(`ev${i}.mapUrl`);
    }
    if (e.location && Number.isFinite(e.location.lat) && Number.isFinite(e.location.lng)) ev.location = { lat: e.location.lat, lng: e.location.lng };
    if (isCompleteEvent(ev)) out.events.push(ev);
  });
  if (f.cause && out.cause) followCause(out.events, out.cause as Cause);
  return errors.length ? { errors } : { data: out };
}
