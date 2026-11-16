import { computeExpiresAt } from "@/lib/orders";
import { applyPricing, buyerOf, catalogPromotion, priceNote, type PriceNote, type PromotionView } from "../pricing";
import { applyPromoCode, issueByPromotion } from "../flow/sales";
import { flushMarketing } from "@/bot/marketing";
/**
 * Сервер Mini App (/app): те же заказы, черновик и правила, что у чата (bot/flow).
 * Каждая функция получает уже проверенного пользователя (initData — lib/tg-init-data.ts) и Deps.
 * Черновик лежит в users.state (как у чата): закрыл приложение — открыл — продолжает; в чате тоже виден.
 */
import { randomUUID } from "node:crypto";
import type { Deps, Draft } from "../flow/types";
import type { Lang, MusicChoice, MusicRecord, OrderRecord, OrderStatus } from "@/lib/domain";
import {
  EXTRA_LANGS,
  STAFF_GRANT_REASONS,
  type ExtraLang,
  type InvitationData,
  type StaffGrantReason,
} from "@/lib/types";
import type { AppUser } from "@/lib/tg-init-data";
import { getDesign, isOnSale } from "@/templates/registry";
import { tPlain as t } from "@/texts/uz-cyrl";
import { kzToday } from "../calendar";
import { PAID_STATUSES, PAYABLE_STATUSES, txFor } from "../flow/util";
import { pageMode } from "@/lib/orders";
import {
  adminCard,
  checkLines,
  decisionButtons,
  sendLinkPack,
  upsertDraftOrder,
  type UpsertOutcome,
} from "../flow/orders";
import {
  validateForm,
  type FieldError,
  type FormInput,
  cleanOwnText,
  graphemes,
  MAX_CUSTOM_TEXT,
} from "@/lib/order-rules";
import { isQuiet } from "@/lib/quiet-hours";
import { PHOTO_MAX_COUNT } from "../own-photo";
import { ownMusicPath } from "../own-music";
import { removeUnusedMedia } from "../flow/care";

/** Черновик, как его хранит и присылает приложение */
export type AppDraft = {
  templateId?: string;
  form?: FormInput;
  photos?: string[];
  textId?: string;
  customText?: string;
  /** own — своя песня клиента (загружена из приложения прямо в бакет music или из чата) */
  music?: { kind: "list"; musicId: string } | { kind: "none" } | { kind: "own"; url: string; title?: string };
  rsvp?: boolean;
  /** v2: языки кроме узбекского и свой текст на них */
  langs?: ExtraLang[];
  customTexts?: Partial<Record<ExtraLang, string>>;
  /** Главный язык страницы (нет — узбекский) */
  mainLang?: ExtraLang;
  /** Правка неоплаченного заказа: та же ссылка */
  orderId?: string;
  /** id черновика: после «Бекор қилиш» запоздалые сохранения этого черновика не принимаются */
  draftId?: string;
};

export type AppOrder = {
  id: string;
  number: number;
  status: OrderStatus;
  templateId: string;
  title: string;
  date: string | null;
  amount: number;
  url: string;
  /** Скидка на эту сумму (акция / промокод / оптовая): старая цена, экономия, подпись. Только в quote/confirmPay */
  price?: PriceNote | null;
  /** Можно ввести промокод (обычный клиент, промокоды включены, не 0 ₸ по акции) */
  promoAllowed?: boolean;
  /** v2: короткая сводка для проверки перед оплатой («📅 14.11.2026, 18:00 · Наврўз») и подтверждена ли она */
  check: string;
  /** НАМУНА ещё открыта (24 часа после создания) */
  namunaOpen: boolean;
  confirmed: boolean;
  canEdit: boolean;
  canPay: boolean;
  paid: boolean;
  /** Чек не принят: причина на языке клиента */
  rejectReason: string | null;
  createdAt: string;
};

export type AppSession = {
  userId: number;
  lang: Lang;
  firstName: string | null;
  favorites: string[];
  draft: AppDraft | null;
  orders: AppOrder[];
  today: string;
  pay: { phone: string; name: string; card: string | null };
  /** Какие языки можно добавить (казахский — только при KAZAKH_ENABLED) */
  extraLangs: ExtraLang[];
  /** «Боғланиш» в «Ёрдам»: Telegram владельца */
  contact: string;
  /** Владелец/админ: вместо Kaspi и чека — «Бесплатно яратиш» (проверка ещё раз на сервере) */
  staff?: boolean;
  /** Действующая акция для этого покупателя (партнёрам, оптовикам, сотрудникам — null: бейджей нет) */
  promotion?: PromotionView | null;
  /** Оптовик: постоянная скидка, % (для ожидаемой цены в итоге; точную считает сервер на шаге оплаты) */
  wholesalePercent?: number | null;
};

const MAX_ORDERS = 20;
const ORDER_TITLE_MAX = 90;

/** Язык интерфейса: сохранённый → язык Telegram (казахский — только при KAZAKH_ENABLED) → узбекский */
function langFor(saved: Lang | null, code: string | null, kazakh: boolean): Lang {
  if (saved === "kk" && !kazakh) return "uz";
  if (saved) return saved;
  const c = code?.toLowerCase() ?? "";
  if (kazakh && c.startsWith("kk")) return "kk";
  return c.startsWith("ru") ? "ru" : "uz";
}

function namesOf(d: InvitationData) {
  return d.occasion === "nikoh" ? `${d.groom ?? ""} & ${d.bride ?? ""}` : (d.person ?? "");
}

export function appOrder(deps: Deps, o: OrderRecord, lang: Lang = "uz"): AppOrder {
  return {
    id: o.id,
    number: o.number,
    status: o.status,
    templateId: o.templateId,
    title: namesOf(o.data).slice(0, ORDER_TITLE_MAX),
    date: o.data.events[0]?.date ?? null,
    amount: o.amount,
    url: `${deps.env.publicBaseUrl}/${o.slug}`,
    check: checkLines(o, lang),
    namunaOpen: pageMode(o, deps.now()) !== "expired",
    // Подтверждение действует для текущей суммы (сменили дизайн/цену — проверить снова)
    confirmed: Boolean(o.payConfirmedAt) && (o.status === "awaiting_payment" || o.status === "rejected"),
    canEdit: PAYABLE_STATUSES.includes(o.status),
    canPay: PAYABLE_STATUSES.includes(o.status) && !eventsPassed(deps, o),
    paid: PAID_STATUSES.includes(o.status),
    rejectReason: o.status === "rejected" ? reasonIn(o.rejectReason, lang) : null,
    createdAt: o.createdAt.toISOString(),
  };
}

/** Причина отказа хранится по-узбекски (как видит админ) — клиенту на его языке */
function reasonIn(reason: string | null | undefined, lang: Lang): string | null {
  if (!reason) return null;
  const uzReasons = txFor("uz").admin.reasons;
  const code = Object.keys(uzReasons).find((k) => uzReasons[k] === reason);
  return code ? (txFor(lang).admin.reasons[code] ?? reason) : reason;
}

function eventsPassed(deps: Deps, o: OrderRecord) {
  const last = o.data.events
    .map((e) => e.date)
    .filter(Boolean)
    .sort()
    .at(-1);
  return !!last && last < kzToday(deps.now());
}

/** Черновик из users.state → вид приложения (только если там есть выбор дизайна) */
function draftOf(s: Draft): AppDraft | null {
  if (!s.templateId && !s.data) return null;
  const d = s.data ?? {};
  return {
    templateId: s.templateId,
    form: {
      ...d,
      photos: undefined,
      textId: undefined,
      customText: undefined,
      rsvp: undefined,
      langs: undefined,
      customTexts: undefined,
      mainLang: undefined,
    } as FormInput,
    photos: d.photos,
    textId: d.textId,
    customText: d.customText,
    music: !s.music
      ? undefined
      : s.music.kind !== "own"
        ? s.music
        : s.music.url
          ? { kind: "own", url: s.music.url, title: s.music.title }
          : undefined,
    rsvp: d.rsvp,
    langs: d.langs,
    customTexts: d.customTexts,
    mainLang: d.mainLang,
    orderId: s.orderId,
    draftId: s.draftId,
  };
}

/** Черновик без id (старый, из чата) отменяется и узнаётся по этой метке */
const LEGACY_DRAFT = "legacy";
const draftKey = (id: unknown) => (typeof id === "string" && id ? id.slice(0, 64) : LEGACY_DRAFT);
/** Этот черновик клиент уже отменил (запрос сохранения пришёл позже отмены) */
const isCancelledDraft = (prev: Draft | undefined, d: AppDraft) =>
  !!prev?.cancelled && prev.cancelled === draftKey(d.draftId);

/** Языки, которые клиент может добавить сейчас */
export const allowedLangs = (deps: Deps): ExtraLang[] => (deps.env.kazakhEnabled ? ["ru", "kk"] : ["ru"]);

/** Языки из приложения: только разрешённые, без повторов. Пусто — undefined (только узбекский) */
export function cleanLangs(deps: Deps, raw: unknown): ExtraLang[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const ok = allowedLangs(deps).filter((l) => raw.includes(l));
  return ok.length ? ok : undefined;
}

/** Свой текст на других языках: только для выбранных языков и только если есть свой узбекский текст */
export function cleanCustomTexts(
  langs: ExtraLang[] | undefined,
  own: string | undefined,
  raw: unknown,
): Partial<Record<ExtraLang, string>> | undefined {
  if (!own || !langs || !raw || typeof raw !== "object") return undefined;
  const out: Partial<Record<ExtraLang, string>> = {};
  for (const l of langs) {
    const v = cleanOwnText((raw as Record<string, unknown>)[l]);
    if ("value" in v) out[l] = v.value;
  }
  return Object.keys(out).length ? out : undefined;
}

export async function openSession(deps: Deps, u: AppUser): Promise<AppSession> {
  const user = await deps.repo.touchUser({ id: u.id, username: u.username, firstName: u.firstName });
  const lang = langFor(user.lang, u.languageCode, Boolean(deps.env.kazakhEnabled));
  if (!user.lang) await deps.repo.setLang(u.id, lang);
  const all = await deps.repo.listOrdersByUser(u.id);
  const orders = all.slice(0, MAX_ORDERS).map((o) => appOrder(deps, o, lang));
  // Черновик правки заказа, который уже оплачен или на проверке чека, — больше не черновик: новый заказ с чистого листа
  let draft = draftOf(user.state as Draft);
  const bound = draft?.orderId ? all.find((o) => o.id === draft!.orderId) : undefined;
  if (draft?.orderId && (!bound || !PAYABLE_STATUSES.includes(bound.status))) {
    draft = null;
    await deps.repo.saveStep(u.id, "idle", { q: ((user.state as Draft).q ?? 0) + 1 });
  }
  return {
    userId: u.id,
    lang,
    firstName: user.firstName,
    favorites: await deps.repo.listFavorites(u.id),
    draft,
    orders,
    today: kzToday(deps.now()),
    pay: { phone: deps.env.kaspiPhone, name: deps.env.kaspiName, card: deps.env.paymentCardNumber ?? null },
    extraLangs: allowedLangs(deps),
    contact: `https://t.me/${deps.env.ownerUsername.replace(/^@/, "")}`,
    staff: await deps.repo.isAdmin(u.id),
    promotion: await catalogPromotion(deps, u.id),
    wholesalePercent: (await deps.repo.getWholesaler(u.id))?.percent ?? null,
  };
}

/**
 * Владелец создаёт приглашение без оплаты (подарок, пример, наличные, замена): без Kaspi и чека.
 * Только админ (по initData, не по URL), только свой неоплаченный заказ. Сумма 0, причина в заказе;
 * партнёру не начисляется (заказы сотрудников вне статистики продаж и начислений), ссылка — как после оплаты.
 */
export async function staffFreeIssue(deps: Deps, u: AppUser, orderId: unknown, reason: unknown) {
  if (!(await deps.repo.isAdmin(u.id))) return { error: "forbidden" as const };
  if (typeof reason !== "string" || !(STAFF_GRANT_REASONS as readonly string[]).includes(reason))
    return { error: "reason" as const };
  if (typeof orderId !== "string") return { error: "notFound" as const };
  const o = await deps.repo.getOrder(orderId).catch(() => null);
  if (!o || o.userId !== u.id) return { error: "notFound" as const };
  if (!PAYABLE_STATUSES.includes(o.status)) return { error: "closed" as const };
  const now = deps.now();
  const data = { ...o.data, staffGrant: { reason: reason as StaffGrantReason, by: u.id, at: now.toISOString() } };
  const done = await deps.repo.transition(o.id, PAYABLE_STATUSES, "active", {
    amount: 0,
    data,
    paidAt: now,
    payConfirmedAt: now,
    expiresAt: computeExpiresAt(data.events),
  });
  if (!done) return { error: "closed" as const };
  await sendLinkPack(deps, done, true).catch((e) =>
    console.error("free issue link", e instanceof Error ? e.name : "Error"),
  );
  const user = await deps.repo.getUser(u.id);
  return { ok: true as const, order: appOrder(deps, done, user?.lang ?? "uz") };
}

/** «✅ Ҳаммаси тўғри, тўлаймиз» в приложении: время подтверждения в заказе, дальше — реквизиты */
export async function confirmPay(deps: Deps, u: AppUser, orderId: unknown, terms?: unknown) {
  if (typeof orderId !== "string") return { error: "notFound" as const };
  // п.18: без «Шартларга розиман» реквизиты не показываем
  if (terms !== true) return { error: "terms" as const };
  const o = await deps.repo.getOrder(orderId).catch(() => null);
  if (!o || o.userId !== u.id) return { error: "notFound" as const };
  if (o.status === "receipt_sent") return { error: "waiting" as const };
  if (!PAYABLE_STATUSES.includes(o.status)) return { error: "closed" as const };
  if (eventsPassed(deps, o)) return { error: "passed" as const };
  // Цена могла измениться (акция закончилась) — клиент видит новую сумму до реквизитов
  const priced = await applyPricing(deps, o);
  if (priced.amount !== o.amount) return { error: "priceChanged" as const, order: await pricedOrder(deps, u, priced) };
  // 0 ₸ по акции: без Kaspi и чека, ссылка сразу
  if (o.amount === 0 && o.pricing?.kind === "promotion") {
    const done = await issueByPromotion(deps, o);
    if (!done) return { error: "closed" as const };
    return { ok: true as const, order: await pricedOrder(deps, u, done), free: true as const };
  }
  if (o.amount === 0 && deps.env.marketing?.promos && deps.repo.marketing) {
    const paid = await deps.repo.marketing.confirm(
      o.id,
      u.id,
      deps.now(),
      deps.env.publicBaseUrl,
      "promotion",
      computeExpiresAt(o.data.events),
      deps.env.marketing,
    );
    if (!paid) return { error: "closed" as const };
    await flushMarketing(deps);
    const fresh = await deps.repo.getOrder(o.id);
    return fresh
      ? { ok: true as const, order: appOrder(deps, fresh, (await deps.repo.getUser(u.id))?.lang ?? "uz") }
      : { error: "notFound" as const };
  }
  const r = await deps.repo.transition(o.id, PAYABLE_STATUSES, "awaiting_payment", {
    payConfirmedAt: deps.now(),
    termsAcceptedAt: deps.now(),
  });
  if (!r) return { error: "closed" as const };
  return { ok: true as const, order: await pricedOrder(deps, u, r) };
}

/** Заказ для экрана оплаты: цена зафиксирована сейчас + строка скидки + можно ли промокод */
async function pricedOrder(deps: Deps, u: AppUser, o: OrderRecord): Promise<AppOrder> {
  const lang = (await deps.repo.getUser(u.id))?.lang ?? "uz";
  const promoAllowed =
    Boolean(deps.env.marketing?.promos && deps.repo.marketing) &&
    PAYABLE_STATUSES.includes(o.status) &&
    !(o.amount === 0 && o.pricing?.kind === "promotion") &&
    (await buyerOf(deps, u.id)).role === "client";
  return { ...appOrder(deps, o, lang), price: await priceNote(deps, o), promoAllowed };
}

/** Переход к оплате в приложении: цена фиксируется (акция / промокод / оптовая) и показывается со скидкой */
export async function quoteOrder(deps: Deps, u: AppUser, orderId: unknown) {
  if (typeof orderId !== "string") return { error: "notFound" as const };
  const o = await deps.repo.getOrder(orderId).catch(() => null);
  if (!o || o.userId !== u.id) return { error: "notFound" as const };
  return { ok: true as const, order: await pricedOrder(deps, u, await applyPricing(deps, o)) };
}

/** «Есть промокод?» в приложении */
export async function promoForOrder(deps: Deps, u: AppUser, orderId: unknown, code: unknown) {
  if (typeof orderId !== "string") return { error: "notFound" as const };
  const r = await applyPromoCode(deps, u.id, orderId, code);
  if ("error" in r) return r;
  return { ok: true as const, order: await pricedOrder(deps, u, r.order) };
}

export async function setLang(deps: Deps, u: AppUser, lang: unknown) {
  if (lang !== "uz" && lang !== "ru" && !(lang === "kk" && deps.env.kazakhEnabled)) return { error: "bad" as const };
  await deps.repo.touchUser({ id: u.id, username: u.username, firstName: u.firstName });
  await deps.repo.setLang(u.id, lang);
  return { ok: true as const };
}

export async function toggleFavorite(deps: Deps, u: AppUser, templateId: unknown, saved: unknown) {
  if (typeof templateId !== "string" || !getDesign(templateId) || typeof saved !== "boolean")
    return { error: "bad" as const };
  await deps.repo.setFavorite(u.id, templateId, saved);
  return { favorites: await deps.repo.listFavorites(u.id) };
}

export async function musicFor(deps: Deps, templateId: unknown, lang: Lang) {
  const design = typeof templateId === "string" ? getDesign(templateId) : undefined;
  if (!design) return { error: "bad" as const };
  const title = (m: MusicRecord) => (lang === "ru" ? m.titleRu : m.titleUz);
  const mine = await deps.repo.listMusic(design.occasion);
  const ids = new Set(mine.map((m) => m.id));
  // «Бошқа мусиқалар»: мелодии остальных тадбиров с подписью категории
  const others = (await deps.repo.listMusic()).filter(
    (m) => !ids.has(m.id) && m.occasion && m.occasion !== design.occasion,
  );
  return {
    tracks: mine.map((m) => ({ id: m.id, title: title(m), url: m.fileUrl })),
    others: others.map((m) => ({ id: m.id, title: title(m), url: m.fileUrl, occasion: m.occasion! })),
  };
}

export const OWN_MUSIC_MAX = 20 * 1024 * 1024;
const OWN_MUSIC_EXT = ["mp3", "m4a", "aac", "ogg", "oga", "opus", "wav"];

/**
 * Своя песня из приложения: подписанная ссылка на загрузку прямо в бакет music (телефон грузит сам,
 * с процентом; лимит тела Vercel 4,5 МБ не мешает). До 20 МБ, только аудио.
 */
export async function musicUpload(deps: Deps, ext: unknown, size: unknown) {
  const e = typeof ext === "string" ? ext.toLowerCase().replace(/^\./, "") : "";
  if (!OWN_MUSIC_EXT.includes(e)) return { error: "format" as const };
  if (typeof size !== "number" || size <= 0) return { error: "format" as const };
  if (size > OWN_MUSIC_MAX) return { error: "tooBig" as const };
  if (!deps.signMusicUpload) return { error: "server" as const };
  const id = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
  return deps.signMusicUpload(`own/${id}.${e}`);
}

/** Фото клиента: только наши адреса из бакета photos, не больше трёх */
function cleanPhotos(deps: Deps, photos: unknown): string[] | undefined {
  if (!Array.isArray(photos)) return undefined;
  const ok = photos.filter(
    (p): p is string =>
      typeof p === "string" &&
      /^https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\/photos\/client\/[a-f0-9]{64}\.webp$/.test(p),
  );
  return ok.length ? [...new Set(ok)].slice(0, PHOTO_MAX_COUNT) : undefined;
}

/** Черновик приложения → черновик чата (users.state). Музыка «своя» из чата сохраняется, если её не меняли */
function toDraft(deps: Deps, prev: Draft, d: AppDraft, data: Partial<InvitationData>): Draft {
  const design = d.templateId ? getDesign(d.templateId) : undefined;
  const music: MusicChoice | undefined =
    d.music?.kind === "none"
      ? { kind: "none" }
      : d.music?.kind === "list" && typeof d.music.musicId === "string"
        ? { kind: "list", musicId: d.music.musicId.slice(0, 64) }
        : d.music?.kind === "own" &&
            typeof d.music.url === "string" &&
            ownMusicPath(d.music.url) &&
            /^https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\/music\/own\//.test(d.music.url)
          ? {
              kind: "own",
              fileId: prev.music?.kind === "own" && prev.music.url === d.music.url ? prev.music.fileId : "app",
              url: d.music.url,
              title: typeof d.music.title === "string" ? d.music.title.slice(0, 60) : undefined,
            }
          : prev.music;
  const own = cleanOwnText(d.customText);
  const photos = design?.clientPhotos ? cleanPhotos(deps, d.photos) : undefined;
  const langs = cleanLangs(deps, d.langs);
  return {
    q: prev.q,
    handledUpdates: prev.handledUpdates,
    draftId: typeof d.draftId === "string" && d.draftId ? d.draftId.slice(0, 64) : undefined,
    occasion: design?.occasion ?? prev.occasion,
    format: design?.format ?? prev.format,
    templateId: design?.id ?? prev.templateId,
    // Заказ, к которому привязан черновик, помнит сервер: повторная отправка не создаст второй заказ
    orderId: typeof d.orderId === "string" ? d.orderId : prev.orderId,
    music,
    data: {
      ...data,
      occasion: design?.occasion ?? data.occasion,
      photos,
      textId: typeof d.textId === "string" ? d.textId.slice(0, 32) : undefined,
      customText: "value" in own ? own.value : undefined,
      rsvp: d.rsvp !== false,
      // Языки сняли — пишем «пусто», чтобы заказ вернулся к одному узбекскому (до этого колонку не трогаем)
      langs: langs ?? (prev.data?.langs?.length ? [] : undefined),
      customTexts:
        cleanCustomTexts(langs, "value" in own ? own.value : undefined, d.customTexts) ??
        (prev.data?.customTexts ? {} : undefined),
      // Главный язык — только из выбранных; иначе узбекский
      mainLang: typeof d.mainLang === "string" && langs?.includes(d.mainLang) ? d.mainLang : undefined,
    },
  };
}

const MAX_DRAFT_JSON = 16_000;

/** Сохранить черновик (каждое изменение формы, с задержкой на клиенте). Ничего не проверяет строго — это черновик */
export async function saveDraft(deps: Deps, u: AppUser, d: AppDraft) {
  if (!d || typeof d !== "object" || JSON.stringify(d).length > MAX_DRAFT_JSON) return { error: "bad" as const };
  const user =
    (await deps.repo.getUser(u.id)) ??
    (await deps.repo.touchUser({ id: u.id, username: u.username, firstName: u.firstName }));
  const prev = user.state as Draft;
  // Гонка: сохранение ушло до «Бекор қилиш», а дошло после — черновик не воскрешаем
  if (isCancelledDraft(prev, d)) return { error: "cancelled" as const };
  // Черновик правки заказа, которого уже нет (отменён) или он закрыт, — не сохраняем
  if (typeof d.orderId === "string") {
    const o = await deps.repo.getOrder(d.orderId).catch(() => null);
    if (!o || o.userId !== u.id || !PAYABLE_STATUSES.includes(o.status)) return { error: "closed" as const };
  }
  const form = (d.form ?? {}) as FormInput;
  const draft = toDraft(deps, prev, d, { ...form, events: (form.events ?? []).slice(0, 3) } as Partial<InvitationData>);
  // Чат видит черновик как свой: на «review» его можно сразу подтвердить, номер вопроса сдвигается — старые кнопки чата не сработают
  draft.q = (prev.q ?? 0) + 1;
  await deps.repo.saveStep(u.id, "idle", draft as Record<string, unknown>);
  return { ok: true as const };
}

export type SubmitResult =
  | { ok: true; order: AppOrder; created: boolean }
  | { error: "fields"; fields: FieldError[] }
  /** Свой текст длиннее 600 знаков: не обрезаем молча — приложение показывает мягкую ошибку под полем */
  | { error: "textLong"; length: number; max: number }
  | { error: "design" | "closed" | "waiting" | "notFound" | "formatLocked" | "busy" };

/** «НАМУНА»: проверить анкету целиком и создать заказ (или обновить неоплаченный) */
export async function submitDraft(deps: Deps, u: AppUser, d: AppDraft): Promise<SubmitResult> {
  const design = d?.templateId ? getDesign(d.templateId) : undefined;
  if (!design) return { error: "design" };
  if (!d.orderId && !isOnSale(design.id)) return { error: "design" };
  const v = validateForm(design.occasion, (d.form ?? {}) as FormInput, kzToday(deps.now()));
  if ("errors" in v) return { error: "fields", fields: v.errors };
  const own = cleanOwnText(d.customText);
  if (typeof d.customText === "string" && "problem" in own && own.problem === "long")
    return { error: "textLong", length: graphemes(d.customText.trim()), max: MAX_CUSTOM_TEXT };
  for (const l of EXTRA_LANGS) {
    const tr = d.customTexts?.[l];
    if (typeof tr === "string" && graphemes(tr.trim()) > MAX_CUSTOM_TEXT)
      return { error: "textLong", length: graphemes(tr.trim()), max: MAX_CUSTOM_TEXT };
  }
  const user =
    (await deps.repo.getUser(u.id)) ??
    (await deps.repo.touchUser({ id: u.id, username: u.username, firstName: u.firstName }));
  const prev = user.state as Draft;
  if (isCancelledDraft(prev, d)) return { error: "notFound" };
  const draft = toDraft(deps, prev, d, v.data);
  // Мелодия только из списка этого тадбира; несуществующая (или чужого тадбира) — первая по умолчанию
  // Мелодия — из нашего списка (своего тадбира или «Бошқа мусиқалар»); несуществующая — первая мелодия тадбира
  const tracks = await deps.repo.listMusic(design.occasion);
  const all = await deps.repo.listMusic();
  if (
    !draft.music ||
    (draft.music.kind === "list" && !all.some((t) => t.id === (draft.music as { musicId: string }).musicId))
  ) {
    draft.music = tracks[0] ? { kind: "list", musicId: tracks[0].id } : { kind: "none" };
  }
  // Готовый текст должен существовать для этого тадбира, иначе — лучший (первый)
  const options = t.inviteOptions({ ...(draft.data as InvitationData) });
  if (!options.some((o) => o.id === draft.data?.textId)) draft.data!.textId = options[0]?.id;

  const q = prev.q ?? 0;
  if (!draft.orderId) await deps.repo.saveStep(u.id, "review", { ...draft, q } as Record<string, unknown>);
  const r: UpsertOutcome = await upsertDraftOrder(deps, u.id, draft, q);
  switch (r.kind) {
    case "created":
    case "updated": {
      if (r.kind === "updated") {
        // Черновик правки остаётся привязан к заказу: следующее «Сақлаш» обновит ту же ссылку
        await deps.repo.saveStep(u.id, "idle", { ...draft, q: q + 1 } as Record<string, unknown>);
      } else {
        await deps.repo.saveStep(u.id, "idle", {
          q: q + 2,
          draftId: draft.draftId,
          templateId: draft.templateId,
          occasion: draft.occasion,
          format: draft.format,
          orderId: r.order.id,
          music: draft.music,
          data: draft.data,
        } as Record<string, unknown>);
      }
      return { ok: true, order: appOrder(deps, r.order, user.lang ?? "uz"), created: r.kind === "created" };
    }
    case "race": {
      // Двойное нажатие: заказ уже создан параллельным запросом — отдаём его
      const last = (await deps.repo.listOrdersByUser(u.id))[0];
      return last && PAYABLE_STATUSES.includes(last.status)
        ? { ok: true, order: appOrder(deps, last, user.lang ?? "uz"), created: false }
        : { error: "busy" };
    }
    case "catalogChanged":
      return { error: "design" };
    case "incomplete":
      return { error: "fields", fields: [] };
    default:
      return { error: r.kind };
  }
}

/** Правка неоплаченного заказа: заказ → черновик приложения */
export async function editOrder(
  deps: Deps,
  u: AppUser,
  orderId: unknown,
): Promise<{ draft: AppDraft } | { error: "notFound" | "closed" }> {
  if (typeof orderId !== "string") return { error: "notFound" };
  const o = await deps.repo.getOrder(orderId).catch(() => null);
  if (!o || o.userId !== u.id) return { error: "notFound" };
  if (!PAYABLE_STATUSES.includes(o.status)) return { error: "closed" };
  const user = await deps.repo.getUser(u.id);
  const prev = (user?.state ?? {}) as Draft;
  const draft: Draft = {
    q: (prev.q ?? 0) + 1,
    draftId: randomUUID(),
    occasion: o.occasion,
    format: o.format,
    templateId: o.templateId,
    orderId: o.id,
    music: o.music,
    data: { ...o.data },
  };
  await deps.repo.saveStep(u.id, "idle", draft as Record<string, unknown>);
  return { draft: draftOf(draft)! };
}

/** Шаг, на котором клиент ушёл: 1 дизайн · 2 анкета · 3 НАМУНА · 4 проверил перед оплатой · 5 чек не приняли */
function cancelStep(o: OrderRecord | null, d: Draft): number {
  if (o) return o.status === "rejected" ? 5 : o.payConfirmedAt ? 4 : 3;
  const f = (d.data ?? {}) as Partial<InvitationData>;
  return f.groom || f.bride || f.person || f.events?.length ? 2 : 1;
}

/**
 * «Бекор қилиш»: незаконченный заказ (или черновик без заказа) удаляется вместе с именами, текстами,
 * фото и своей песней; остаётся только обезличенная запись «отменён на шаге N». Чужой, оплаченный
 * или с чеком на проверке — нельзя.
 */
export async function cancelOrder(
  deps: Deps,
  u: AppUser,
  orderId: unknown,
): Promise<{ ok: true } | { error: "notFound" | "closed" | "waiting" }> {
  const user = await deps.repo.getUser(u.id);
  const st = (user?.state ?? {}) as Draft;
  let order: OrderRecord | null = null;
  // Плашка черновика без orderId, а черновик привязан к заказу — отменяем этот заказ
  if ((orderId === undefined || orderId === null) && st.orderId) orderId = st.orderId;
  if (orderId !== undefined && orderId !== null) {
    if (typeof orderId !== "string") return { error: "notFound" };
    order = await deps.repo.getOrder(orderId).catch(() => null);
    if (!order || order.userId !== u.id) return { error: "notFound" };
    if (order.status === "receipt_sent") return { error: "waiting" };
    if (!PAYABLE_STATUSES.includes(order.status)) return { error: "closed" };
  } else if (!st.templateId && !st.data) return { error: "notFound" };
  const step = cancelStep(order, st);
  const removed: { photos: string[]; music: string | null }[] = [];
  if (order) {
    const r = await deps.repo.cancelOrder(order.id, u.id);
    if (!r) return { error: "closed" };
    removed.push(r);
  }
  // Черновик в users.state (если он об этом заказе или без заказа) — тоже стираем
  // Черновик стираем, только если это он: отменяют его самого или заказ, к которому он привязан.
  // Новый черновик клиента (ещё без заказа) при отмене старого заказа не трогаем
  if (!order || st.orderId === order.id) {
    removed.push({ photos: st.data?.photos ?? [], music: st.music?.kind === "own" ? (st.music.url ?? null) : null });
    // Метка отмены: запоздавшие «сохранить черновик» этого черновика сервер отклонит
    await deps.repo.saveStep(u.id, "idle", { q: (st.q ?? 0) + 1, cancelled: draftKey(st.draftId) });
  }
  const design = getDesign(order?.templateId ?? st.templateId ?? "");
  await deps.repo
    .recordCancellation({
      step,
      occasion: design?.occasion ?? null,
      format: design?.format ?? null,
      templateId: design?.id ?? null,
    })
    // Нет таблицы order_cancellations (миграция не применена) — отмена всё равно прошла, запись пропускаем
    .catch((e) => console.warn("cancel record skipped", e instanceof Error ? e.name : "Error"));
  await removeUnusedMedia(deps, removed).catch((e) =>
    console.error("cancel media", e instanceof Error ? e.name : "Error"),
  );
  return { ok: true };
}

/** Начать новое приглашение: черновик очищается (заказы остаются) */
export async function newDraft(deps: Deps, u: AppUser) {
  const user = await deps.repo.getUser(u.id);
  await deps.repo.saveStep(u.id, "idle", { q: ((user?.state as Draft | undefined)?.q ?? 0) + 1 });
  return { ok: true as const };
}

export async function listOrders(deps: Deps, u: AppUser) {
  const lang = (await deps.repo.getUser(u.id))?.lang ?? "uz";
  return { orders: (await deps.repo.listOrdersByUser(u.id)).slice(0, MAX_ORDERS).map((o) => appOrder(deps, o, lang)) };
}

// ── Чек из приложения ──

export const RECEIPT_MAX_BYTES = 10 * 1024 * 1024;
export type ReceiptFile = { bytes: Uint8Array; mime: string; name: string };
export type ReceiptResult =
  | { ok: true; night: boolean }
  | {
      error:
        | "notFound"
        | "closed"
        | "waiting"
        | "passed"
        | "format"
        | "tooBig"
        | "send"
        | "notConfirmed"
        | "priceChanged";
    };

/** Картинка → JPEG (Telegram показывает её как фото), PDF — документом */
export async function receiptPayload(
  f: ReceiptFile,
): Promise<{ kind: "photo" | "document"; bytes: Uint8Array; name: string } | null> {
  const isPdf =
    f.mime === "application/pdf" ||
    /\.pdf$/i.test(f.name) ||
    Buffer.from(f.bytes.subarray(0, 5)).toString("latin1") === "%PDF-";
  if (isPdf) return { kind: "document", bytes: f.bytes, name: "chek.pdf" };
  try {
    const { toJpeg } = await import("../own-photo");
    return { kind: "photo", bytes: await toJpeg(f.bytes), name: "chek.jpg" };
  } catch {
    return null;
  }
}

export async function submitReceipt(deps: Deps, u: AppUser, orderId: unknown, f: ReceiptFile): Promise<ReceiptResult> {
  if (typeof orderId !== "string") return { error: "notFound" };
  if (f.bytes.byteLength > RECEIPT_MAX_BYTES) return { error: "tooBig" };
  if (!f.bytes.byteLength) return { error: "format" };
  const o = await deps.repo.getOrder(orderId).catch(() => null);
  if (!o || o.userId !== u.id) return { error: "notFound" };
  if (o.status === "receipt_sent") return { error: "waiting" };
  if (!PAYABLE_STATUSES.includes(o.status)) return { error: "closed" };
  if (eventsPassed(deps, o)) return { error: "passed" };
  // Чек — только после «✅ Ҳаммаси тўғри» (pay_confirmed_at): без него нет доказательства, что клиент видел предупреждение
  if (!o.payConfirmedAt) return { error: "notConfirmed" };
  // Акция закончилась до чека: сумма другая — сначала показать новую сумму (подтверждение сбрасывается)
  if ((await applyPricing(deps, o)).amount !== o.amount) return { error: "priceChanged" };
  const payload = await receiptPayload(f);
  if (!payload) return { error: "format" };

  // Сначала «занимаем» заказ: второй чек (двойное нажатие) сюда не дойдёт
  const now = deps.now();
  const claimed = await deps.repo.transition(o.id, PAYABLE_STATUSES, "receipt_sent", {
    receiptAt: now,
    rejectReason: null,
    adminRemindedAt: null,
    receipt: null,
  });
  if (!claimed) return { error: "waiting" };

  const client = await deps.repo.getUser(u.id);
  let fileId: string | undefined;
  for (const adminId of await deps.repo.listAdminIds()) {
    const lang = (await deps.repo.getUser(adminId))?.lang ?? "uz";
    const tx = txFor(lang);
    const opts = {
      caption: adminCard(deps, claimed, lang, client),
      markup: { inline: decisionButtons(tx, claimed.number) },
      fileName: payload.name,
    };
    const file = fileId ?? payload.bytes;
    try {
      const sent =
        payload.kind === "document"
          ? await deps.tg.sendDocument(adminId, file, opts)
          : await deps.tg.sendPhoto(adminId, file, opts);
      fileId ??= sent.fileId;
    } catch (e) {
      // Админ мог не запускать бота — остальным всё равно отправляем
      console.error("app receipt → admin", e instanceof Error ? e.name : "Error");
    }
  }
  if (fileId) await deps.repo.updateOrder(o.id, { receipt: { fileId, kind: payload.kind } });
  else {
    // Ни один админ не получил чек: возвращаем заказ к оплате, клиент отправит ещё раз
    await deps.repo.transition(o.id, ["receipt_sent"], o.status, { receiptAt: null });
    return { error: "send" };
  }
  return { ok: true, night: isQuiet(now) };
}
