/**
 * Сервер Mini App (/app): те же заказы, черновик и правила, что у чата (bot/flow).
 * Каждая функция получает уже проверенного пользователя (initData — lib/tg-init-data.ts) и Deps.
 * Черновик лежит в users.state (как у чата): закрыл приложение — открыл — продолжает; в чате тоже виден.
 */
import type { Deps, Draft } from "../flow/types";
import type { Lang, MusicChoice, OrderRecord, OrderStatus } from "@/lib/domain";
import { EXTRA_LANGS, type ExtraLang, type InvitationData } from "@/lib/types";
import type { AppUser } from "@/lib/tg-init-data";
import { getDesign, isOnSale } from "@/templates/registry";
import { tPlain as t } from "@/texts/uz-cyrl";
import { kzToday } from "../calendar";
import { PAID_STATUSES, PAYABLE_STATUSES, txFor } from "../flow/util";
import { pageMode } from "@/lib/orders";
import { adminCard, checkLines, decisionButtons, upsertDraftOrder, type UpsertOutcome } from "../flow/orders";
import { validateForm, type FieldError, type FormInput, cleanOwnText, graphemes, MAX_CUSTOM_TEXT } from "@/lib/order-rules";
import { isQuiet } from "@/lib/quiet-hours";
import { PHOTO_MAX_COUNT } from "../own-photo";

/** Черновик, как его хранит и присылает приложение */
export type AppDraft = {
  templateId?: string;
  form?: FormInput;
  photos?: string[];
  textId?: string;
  customText?: string;
  music?: { kind: "list"; musicId: string } | { kind: "none" };
  rsvp?: boolean;
  /** v2: языки кроме узбекского и свой текст на них */
  langs?: ExtraLang[];
  customTexts?: Partial<Record<ExtraLang, string>>;
  /** Главный язык страницы (нет — узбекский) */
  mainLang?: ExtraLang;
  /** Правка неоплаченного заказа: та же ссылка */
  orderId?: string;
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
  /** v2: короткая сводка для проверки перед оплатой («📅 14.11.2026, 18:00 · Наврўз») и подтверждена ли она */
  check: string;
  /** НАМУНА ещё открыта (24 часа после создания) */
  namunaOpen: boolean;
  confirmed: boolean;
  canEdit: boolean;
  canPay: boolean;
  paid: boolean;
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
    confirmed: Boolean(o.payConfirmedAt) && o.status === "awaiting_payment",
    canEdit: PAYABLE_STATUSES.includes(o.status),
    canPay: PAYABLE_STATUSES.includes(o.status) && !eventsPassed(deps, o),
    paid: PAID_STATUSES.includes(o.status),
    createdAt: o.createdAt.toISOString(),
  };
}

function eventsPassed(deps: Deps, o: OrderRecord) {
  const last = o.data.events.map((e) => e.date).filter(Boolean).sort().at(-1);
  return !!last && last < kzToday(deps.now());
}

/** Черновик из users.state → вид приложения (только если там есть выбор дизайна) */
function draftOf(s: Draft): AppDraft | null {
  if (!s.templateId && !s.data) return null;
  const d = s.data ?? {};
  return {
    templateId: s.templateId,
    form: { ...d, photos: undefined, textId: undefined, customText: undefined, rsvp: undefined, langs: undefined, customTexts: undefined, mainLang: undefined } as FormInput,
    photos: d.photos,
    textId: d.textId,
    customText: d.customText,
    music: s.music && s.music.kind !== "own" ? s.music : undefined,
    rsvp: d.rsvp,
    langs: d.langs,
    customTexts: d.customTexts,
    mainLang: d.mainLang,
    orderId: s.orderId,
  };
}

/** Языки, которые клиент может добавить сейчас */
export const allowedLangs = (deps: Deps): ExtraLang[] => (deps.env.kazakhEnabled ? ["ru", "kk"] : ["ru"]);

/** Языки из приложения: только разрешённые, без повторов. Пусто — undefined (только узбекский) */
export function cleanLangs(deps: Deps, raw: unknown): ExtraLang[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const ok = allowedLangs(deps).filter((l) => raw.includes(l));
  return ok.length ? ok : undefined;
}

/** Свой текст на других языках: только для выбранных языков и только если есть свой узбекский текст */
export function cleanCustomTexts(langs: ExtraLang[] | undefined, own: string | undefined, raw: unknown): Partial<Record<ExtraLang, string>> | undefined {
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
  };
}

/** «✅ Ҳаммаси тўғри, тўлаймиз» в приложении: время подтверждения в заказе, дальше — реквизиты */
export async function confirmPay(deps: Deps, u: AppUser, orderId: unknown) {
  if (typeof orderId !== "string") return { error: "notFound" as const };
  const o = await deps.repo.getOrder(orderId).catch(() => null);
  if (!o || o.userId !== u.id) return { error: "notFound" as const };
  if (o.status === "receipt_sent") return { error: "waiting" as const };
  if (!PAYABLE_STATUSES.includes(o.status)) return { error: "closed" as const };
  if (eventsPassed(deps, o)) return { error: "passed" as const };
  const r = await deps.repo.transition(o.id, PAYABLE_STATUSES, "awaiting_payment", { payConfirmedAt: deps.now() });
  if (!r) return { error: "closed" as const };
  return { ok: true as const, order: appOrder(deps, r, (await deps.repo.getUser(u.id))?.lang ?? "uz") };
}

export async function setLang(deps: Deps, u: AppUser, lang: unknown) {
  if (lang !== "uz" && lang !== "ru" && !(lang === "kk" && deps.env.kazakhEnabled)) return { error: "bad" as const };
  await deps.repo.touchUser({ id: u.id, username: u.username, firstName: u.firstName });
  await deps.repo.setLang(u.id, lang);
  return { ok: true as const };
}

export async function toggleFavorite(deps: Deps, u: AppUser, templateId: unknown, saved: unknown) {
  if (typeof templateId !== "string" || !getDesign(templateId) || typeof saved !== "boolean") return { error: "bad" as const };
  await deps.repo.setFavorite(u.id, templateId, saved);
  return { favorites: await deps.repo.listFavorites(u.id) };
}

export async function musicFor(deps: Deps, templateId: unknown, lang: Lang) {
  const design = typeof templateId === "string" ? getDesign(templateId) : undefined;
  if (!design) return { error: "bad" as const };
  const list = await deps.repo.listMusic(design.occasion);
  return { tracks: list.map((m) => ({ id: m.id, title: lang === "ru" ? m.titleRu : m.titleUz, url: m.fileUrl })) };
}

/** Фото клиента: только наши адреса из бакета photos, не больше трёх */
function cleanPhotos(deps: Deps, photos: unknown): string[] | undefined {
  if (!Array.isArray(photos)) return undefined;
  const ok = photos.filter((p): p is string => typeof p === "string" && /^https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\/photos\/client\/[a-f0-9]{64}\.webp$/.test(p));
  return ok.length ? [...new Set(ok)].slice(0, PHOTO_MAX_COUNT) : undefined;
}

/** Черновик приложения → черновик чата (users.state). Музыка «своя» из чата сохраняется, если её не меняли */
function toDraft(deps: Deps, prev: Draft, d: AppDraft, data: Partial<InvitationData>): Draft {
  const design = d.templateId ? getDesign(d.templateId) : undefined;
  const music: MusicChoice | undefined = d.music?.kind === "none" ? { kind: "none" } : d.music?.kind === "list" && typeof d.music.musicId === "string" ? { kind: "list", musicId: d.music.musicId.slice(0, 64) } : prev.music;
  const own = cleanOwnText(d.customText);
  const photos = design?.clientPhotos ? cleanPhotos(deps, d.photos) : undefined;
  const langs = cleanLangs(deps, d.langs);
  return {
    q: prev.q,
    handledUpdates: prev.handledUpdates,
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
      customTexts: cleanCustomTexts(langs, "value" in own ? own.value : undefined, d.customTexts) ?? (prev.data?.customTexts ? {} : undefined),
      // Главный язык — только из выбранных; иначе узбекский
      mainLang: typeof d.mainLang === "string" && langs?.includes(d.mainLang) ? d.mainLang : undefined,
    },
  };
}

const MAX_DRAFT_JSON = 16_000;

/** Сохранить черновик (каждое изменение формы, с задержкой на клиенте). Ничего не проверяет строго — это черновик */
export async function saveDraft(deps: Deps, u: AppUser, d: AppDraft) {
  if (!d || typeof d !== "object" || JSON.stringify(d).length > MAX_DRAFT_JSON) return { error: "bad" as const };
  const user = (await deps.repo.getUser(u.id)) ?? (await deps.repo.touchUser({ id: u.id, username: u.username, firstName: u.firstName }));
  const prev = user.state as Draft;
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
  if (typeof d.customText === "string" && "problem" in own && own.problem === "long") return { error: "textLong", length: graphemes(d.customText.trim()), max: MAX_CUSTOM_TEXT };
  for (const l of EXTRA_LANGS) {
    const tr = d.customTexts?.[l];
    if (typeof tr === "string" && graphemes(tr.trim()) > MAX_CUSTOM_TEXT) return { error: "textLong", length: graphemes(tr.trim()), max: MAX_CUSTOM_TEXT };
  }
  const user = (await deps.repo.getUser(u.id)) ?? (await deps.repo.touchUser({ id: u.id, username: u.username, firstName: u.firstName }));
  const prev = user.state as Draft;
  const draft = toDraft(deps, prev, d, v.data);
  // Мелодия только из списка этого тадбира; несуществующая (или чужого тадбира) — первая по умолчанию
  const tracks = await deps.repo.listMusic(design.occasion);
  if (!draft.music || (draft.music.kind === "list" && !tracks.some((t) => t.id === (draft.music as { musicId: string }).musicId))) {
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
        await deps.repo.saveStep(u.id, "idle", { q: q + 2, templateId: draft.templateId, occasion: draft.occasion, format: draft.format, orderId: r.order.id, music: draft.music, data: draft.data } as Record<string, unknown>);
      }
      return { ok: true, order: appOrder(deps, r.order, user.lang ?? "uz"), created: r.kind === "created" };
    }
    case "race": {
      // Двойное нажатие: заказ уже создан параллельным запросом — отдаём его
      const last = (await deps.repo.listOrdersByUser(u.id))[0];
      return last && PAYABLE_STATUSES.includes(last.status) ? { ok: true, order: appOrder(deps, last, user.lang ?? "uz"), created: false } : { error: "busy" };
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
export async function editOrder(deps: Deps, u: AppUser, orderId: unknown): Promise<{ draft: AppDraft } | { error: "notFound" | "closed" }> {
  if (typeof orderId !== "string") return { error: "notFound" };
  const o = await deps.repo.getOrder(orderId).catch(() => null);
  if (!o || o.userId !== u.id) return { error: "notFound" };
  if (!PAYABLE_STATUSES.includes(o.status)) return { error: "closed" };
  const user = await deps.repo.getUser(u.id);
  const prev = (user?.state ?? {}) as Draft;
  const draft: Draft = { q: (prev.q ?? 0) + 1, occasion: o.occasion, format: o.format, templateId: o.templateId, orderId: o.id, music: o.music, data: { ...o.data } };
  await deps.repo.saveStep(u.id, "idle", draft as Record<string, unknown>);
  return { draft: draftOf(draft)! };
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
export type ReceiptResult = { ok: true; night: boolean } | { error: "notFound" | "closed" | "waiting" | "passed" | "format" | "tooBig" | "send" };

/** Картинка → JPEG (Telegram показывает её как фото), PDF — документом */
export async function receiptPayload(f: ReceiptFile): Promise<{ kind: "photo" | "document"; bytes: Uint8Array; name: string } | null> {
  const isPdf = f.mime === "application/pdf" || /\.pdf$/i.test(f.name) || Buffer.from(f.bytes.subarray(0, 5)).toString("latin1") === "%PDF-";
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
  const payload = await receiptPayload(f);
  if (!payload) return { error: "format" };

  // Сначала «занимаем» заказ: второй чек (двойное нажатие) сюда не дойдёт
  const now = deps.now();
  const claimed = await deps.repo.transition(o.id, PAYABLE_STATUSES, "receipt_sent", { receiptAt: now, rejectReason: null, adminRemindedAt: null, receipt: null });
  if (!claimed) return { error: "waiting" };

  const client = await deps.repo.getUser(u.id);
  let fileId: string | undefined;
  for (const adminId of await deps.repo.listAdminIds()) {
    const lang = (await deps.repo.getUser(adminId))?.lang ?? "uz";
    const tx = txFor(lang);
    const opts = { caption: adminCard(deps, claimed, lang, client), markup: { inline: decisionButtons(tx, claimed.number) }, fileName: payload.name };
    const file = fileId ?? payload.bytes;
    try {
      const sent = payload.kind === "document" ? await deps.tg.sendDocument(adminId, file, opts) : await deps.tg.sendPhoto(adminId, file, opts);
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
