/** Общие помощники логики бота: клавиатуры, форматирование, данные черновика */
import type { InlineButton, Markup } from "../tg";
import type { Ctx, Draft, DraftData } from "./types";
import type { InvitationData, InvitationEvent, Lang, Occasion, OrderRecord, OrderStatus } from "@/lib/domain";
import type { EventKind } from "@/lib/types";
import { getDesign, PRICES, FORMATS, type Format, activeDesigns } from "@/templates/registry";
import { t } from "@/texts/uz-cyrl";
import { uz, type BotTexts } from "@/texts/bot-uz";
import { ru } from "@/texts/bot-ru";
import { demoToken } from "@/lib/demo-tracking";
import { isEditImpossible } from "../errors";

export const texts: Record<Lang, BotTexts> = { uz, ru };
export const txFor = (lang: Lang | null | undefined): BotTexts => texts[lang ?? "uz"];

/** Песня клиента — до 20 МБ */
export { MAX_MUSIC_BYTES } from "../audio-type";
export const MAX_CUSTOM_TEXT = 600;
export const MAX_EVENTS = 3;
/** Статусы «уже оплачено» */
export const PAID_STATUSES: OrderStatus[] = ["active", "archived"];
/** Можно платить / присылать чек */
export const PAYABLE_STATUSES: OrderStatus[] = ["draft", "preview", "awaiting_payment", "rejected"];

// ── Клавиатуры ──

/** Кнопка текущего вопроса: срабатывает, только пока вопрос — последний */
export const ib = (c: Ctx, text: string, value: string): InlineButton => ({ text, data: `a:${c.s.q ?? 0}:${value}` });
export const backRow = (c: Ctx): InlineButton[] => [ib(c, c.tx.back, "back")];
export const inline = (rows: InlineButton[][]): { inline: InlineButton[][] } => ({ inline: rows });

export function mainMenu(tx: BotTexts): Markup {
  return { reply: [[{ text: tx.menu.create }], [{ text: tx.menu.my }], [{ text: tx.menu.help }, { text: tx.menu.lang }]] };
}

export async function send(c: Ctx, text: string, markup?: Markup) {
  return c.deps.tg.sendMessage(c.chatId, text, markup ? { markup } : {});
}

/** Обновить экран кнопки; если старое сообщение уже нельзя править — показать новым */
export async function editOrSend(c: Ctx, text: string, markup: { inline: InlineButton[][] }) {
  try {
    await c.deps.tg.editMessageText(c.chatId, c.u.messageId, text, { markup });
  } catch (e) {
    if (!isEditImpossible(e)) throw e;
    await send(c, text, markup);
  }
}

// ── Форматирование ──

export const price = (amount: number) => t.price(amount);
/** «2026-11-14» → «14.11.2026» */
export const fmtDate = (date: string) => date.split("-").reverse().join(".");
export const designName = (id: string) => t.designs[id] ?? id;
export const pageUrl = (c: Pick<Ctx, "deps">, slug: string) => `${c.deps.env.publicBaseUrl}/${slug}`;
export const coverUrl = (c: Pick<Ctx, "deps">, id: string, legacy = false) => `${c.deps.env.publicBaseUrl}/covers/${legacy ? "legacy/" : ""}${id}.jpg`;
// «👁 Намуна» в каталоге — чистое демо без надписи НАМУНА (личная НАМУНА — по ссылке заказа)
export const demoUrl = (c: Pick<Ctx, "deps"> & Partial<Pick<Ctx, "user">>, id: string, legacy = false) => {
  const token = c.user ? demoToken(c.user.id, id, c.deps.now()) : undefined;
  return `${c.deps.env.publicBaseUrl}/demo/${id}${legacy ? "/legacy" : ""}${token ? `#dt=${token}` : ""}`;
};
export const ownerUrl = (c: Pick<Ctx, "deps">) => `https://t.me/${c.deps.env.ownerUsername.replace(/^@/, "")}`;

/** «Азиз ва Мадина» / «Жасурбек» */
export function namesOf(d: Partial<InvitationData>) {
  return d.occasion === "nikoh" ? `${d.groom ?? ""} ${t.cover.andWord} ${d.bride ?? ""}` : (d.person ?? "");
}

export const eventLabel = (tx: BotTexts, kind: EventKind) => tx.event.kinds[kind];

// ── Дизайны ──

export function designsFor(occasion: Occasion, format: Format) {
  return activeDesigns().filter((d) => d.occasion === occasion && d.format === format);
}

export function formatsFor(occasion: Occasion): Format[] {
  return FORMATS.filter((f) => designsFor(occasion, f).length > 0);
}

/** «Нарх ўзгармайди»: цифры только из PRICES */
export function priceNote(tx: BotTexts) {
  const n = (f: Format) => price(PRICES[f]).replace(/\s*₸$/, "");
  return tx.pricing.note(n("animated"), n("scroll"), n("simple"));
}

export function designLine(tx: BotTexts, templateId: string, format: Format, amount = PRICES[format]) {
  const d = getDesign(templateId);
  return tx.review.design(d?.number ?? 0, designName(templateId), tx.format.names[format], price(amount));
}

// ── Черновик ──

export const MAIN_EVENT: Record<Occasion, EventKind> = {
  nikoh: "nikohBazm",
  nahorgi: "nahorgi",
  sunnat: "sunnatBazm",
  yubiley: "yubileyBazm",
};

export function data(c: Ctx) {
  c.s.data ??= { occasion: c.s.occasion, events: [] };
  c.s.data.events ??= [];
  // JSON serializes sparse draft arrays as null. Preserve real entries and their back-stack indexes.
  const events=c.s.data.events;
  if(events.some(e=>e==null)){
    const compactIndex=(i:number)=>events.slice(0,i).filter(e=>e!=null).length;
    if(c.s.ev!==undefined)c.s.ev=compactIndex(c.s.ev);
    for(const entry of c.s.back??[])if(entry.ev!==undefined)entry.ev=compactIndex(entry.ev);
    c.s.data.events=events.filter(e=>e!=null);
  }
  return c.s.data as DraftData & { events: Partial<InvitationEvent>[] };
}

/** Тадбир, который сейчас заполняется */
export function curEvent(c: Ctx): Partial<InvitationEvent> {
  const evs = data(c).events;
  const i = c.s.ev ?? 0;
  evs[i] ??= { kind: MAIN_EVENT[c.s.occasion ?? "nikoh"] };
  return evs[i];
}

export const isCompleteEvent = (e: Partial<InvitationEvent> | null | undefined): e is InvitationEvent =>
  !!(e?.kind && e.date && e.time && e.venueName && e.address);

/** Черновик → данные пригласительного (только законченные тадбиры) */
export function finalData(s: Draft): InvitationData {
  const d = s.data ?? {};
  const out: InvitationData = { ...(d as InvitationData), occasion: s.occasion ?? d.occasion ?? "nikoh" };
  out.events = (d.events ?? []).filter(isCompleteEvent);
  return out;
}

/** Последний тадбир + 30 дней (конец дня по времени Казахстана) */
export function expiresAt(d: InvitationData): Date | null {
  const last = d.events.map((e) => e.date).sort().at(-1);
  if (!last) return null;
  return new Date(new Date(`${last}T23:59:59+05:00`).getTime() + 30 * 24 * 60 * 60_000);
}

/** Шаг после ответа: при правке из сводки — обратно к сводке */
export const after = <T extends string>(c: Ctx, next: T): T | "review" => c.s.ret ?? next;

/** Строка заказа для «моих» и для админа */
export function orderTitle(o: OrderRecord) {
  return `${namesOf(o.data)} · ${t.occasionTitles[o.occasion]}`;
}
