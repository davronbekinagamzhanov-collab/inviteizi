/** Шаги выбора: тадбир → дизайн из каталога (альбом по 3 обложки). Шага «формат» больше нет — у каждого дизайна своя цена */
import type { Ctx, Result, Step, StepId } from "./types";
import type { Occasion } from "@/lib/domain";
import type { Design } from "@/templates/registry";
import { activeDesigns, PRICES } from "@/templates/registry";
import { after, backRow, coverUrl, data, demoUrl, designName, ib, inline, price, send } from "./util";
import type { InlineButton } from "../tg";
import { usesLegacyDesign } from "@/templates/design-version";
import { photoAttributions } from "@/texts/uz-cyrl";
import { photoStepFor } from "./steps-photo";

export const OCCASIONS: Occasion[] = ["nikoh", "nahorgi", "sunnat", "yubiley"];
/** Сколько обложек в одном альбоме */
export const PAGE = 3;
const MARKS = ["1️⃣", "2️⃣", "3️⃣"];

export const cat: Step = {
  async ask(c) {
    const rows = OCCASIONS.map((o) => [ib(c, c.tx.category[o], o)]);
    await send(c, c.tx.category.ask, inline([...rows, backRow(c)]));
  },
  async onButton(c, v) {
    if (!OCCASIONS.includes(v as Occasion)) return null;
    if (c.s.occasion !== v) {
      c.s.data = { occasion: v as Occasion, events: [] };
      c.s.catIdx = 0;
    }
    c.s.occasion = v as Occasion;
    return { to: "catalog" };
  },
};

/** Старый шаг «формат» (черновики до обновления): сразу показываем каталог */
export const fmt: Step = {
  async ask(c) {
    c.step = "catalog";
    await catalog.ask(c);
  },
  async onButton() {
    return { to: "catalog" };
  },
};

/** Каталог тадбира одним списком (порядок CATALOG_ORDER). После оплаты дизайн меняется только в том же формате — цена уже уплачена */
export function catalogList(c: Pick<Ctx, "s">): Design[] {
  const occ = c.s.occasion ?? "nikoh";
  return activeDesigns().filter((d) => d.occasion === occ && (!c.s.paid || d.format === c.s.format));
}

/** Начало страницы, на которой стоит дизайн */
export const pageOf = (list: Design[], id: string | undefined) => Math.floor(Math.max(0, list.findIndex((d) => d.id === id)) / PAGE) * PAGE;

/** Убрать альбом и кнопки прошлой страницы каталога (листание, «Назад», /start) */
export async function dropCatalog(c: Ctx, keep?: number) {
  const ids = c.s.catMsgs ?? [];
  delete c.s.catMsgs;
  for (const id of ids) if (id !== keep) await c.deps.tg.deleteMessage(c.chatId, id).catch(() => undefined);
}

function page(c: Ctx) {
  const list = catalogList(c);
  if (!list.length) return null;
  c.s.catRevision = list.map((d) => d.id).join(",");
  const start = Math.floor(((((c.s.catIdx ?? 0) % list.length) + list.length) % list.length) / PAGE) * PAGE;
  c.s.catIdx = start;
  // Правка неоплаченного заказа старой версии: обложка и демо — как у него
  const legacy = (id: string) => Boolean(c.s.orderId) && usesLegacyDesign(id, c.s.data?.designVersion);
  const items = list.slice(start, start + PAGE).map((d, k) => ({ d, mark: MARKS[k], legacy: legacy(d.id) }));
  return { list, start, items };
}

async function render(c: Ctx) {
  const p = page(c);
  if (!p) {
    c.step = "cat";
    await cat.ask(c);
    return;
  }
  await dropCatalog(c);
  const t = c.tx.catalog;
  const ids: number[] = [];
  const photos = p.items.map(({ d, mark, legacy }) => ({ url: coverUrl(c, d.id, legacy), caption: `${mark} №${d.number} · ${price(PRICES[d.format])}` }));
  try {
    if (photos.length > 1) ids.push(...(await c.deps.tg.sendMediaGroup(c.chatId, photos)).messageIds);
    else ids.push((await c.deps.tg.sendPhoto(c.chatId, photos[0].url, { caption: photos[0].caption })).messageId);
  } catch (e) {
    // Обложку Telegram не скачал — каталог только текстом, клиент не застревает
    console.error("каталог: обложки", p.items.map((i) => i.d.id).join(","), e instanceof Error ? e.name : "Error");
  }
  const lines = p.items.map(({ d, mark }) => t.line(mark, d.number, designName(d.id), price(PRICES[d.format]), Boolean(d.clientPhotos)));
  const credits = p.items.flatMap(({ d }) => {
    const a = photoAttributions[d.id];
    return a ? [t.photoCredit(a.author, a.license, a.source)] : [];
  });
  const rows: InlineButton[][] = p.items.map(({ d, mark, legacy }) => [{ text: t.view(mark), url: demoUrl(c, d.id, legacy) }, ib(c, t.pick(mark), `p:${d.id}`)]);
  if (p.list.length > PAGE) rows.push([ib(c, "◀", "prev"), ib(c, t.range(p.start + 1, Math.min(p.start + PAGE, p.list.length), p.list.length), "x"), ib(c, "▶", "next")]);
  rows.push(backRow(c));
  const text = [t.pageTitle, "", ...lines, ...(credits.length ? ["", ...credits] : [])].join("\n");
  ids.push((await send(c, text, inline(rows))).messageId);
  c.s.catMsgs = ids;
}

/** Первый вопрос анкеты для тадбира */
export function formStart(c: Ctx): StepId {
  return c.s.occasion === "nikoh" ? "groom" : "person";
}

export const catalog: Step = {
  async ask(c) {
    await render(c);
  },
  async onButton(c, value): Promise<Result> {
    const list = catalogList(c);
    if (!list.length) return { to: "cat" };
    // Каталог поменялся, пока кнопки висели: не покупаем «не тот» дизайн — показываем заново
    if (c.s.catRevision !== list.map((d) => d.id).join(",")) {
      c.s.catIdx = 0;
      await render(c);
      return { stay: true };
    }
    if (value === "prev" || value === "next") {
      c.s.catIdx = (c.s.catIdx ?? 0) + (value === "next" ? PAGE : -PAGE);
      await render(c);
      return { stay: true };
    }
    if (!value.startsWith("p:")) return null;
    const d = list.find((x) => x.id === value.slice(2));
    if (!d) return null;
    // Кнопки этой страницы → строка «✅ Танланди: №12 Мухр», альбом убираем
    const menuId = c.s.catMsgs?.at(-1);
    await dropCatalog(c, menuId);
    if (menuId) await c.deps.tg.editMessageText(c.chatId, menuId, c.tx.catalog.chosen(d.number, designName(d.id))).catch(() => undefined);
    c.s.templateId = d.id;
    c.s.format = d.format;
    c.s.catIdx = pageOf(list, d.id);
    // Аналитика не должна мешать покупке
    await c.deps.repo.recordEvent(c.user.id, "design_selected", d.id, `${d.id}:${c.s.q ?? 0}`).catch((error) => {
      console.warn("design selection analytics", error instanceof Error ? error.name : "Error");
    });
    data(c).occasion = c.s.occasion;
    // Сменили дизайн до оплаты на дизайн без фото — прежние фото клиента не тянем в новый заказ
    if (!d.clientPhotos && data(c).photos?.length) data(c).photos = [];
    // Правка: перешли на дизайн с фото, а фото ещё нет — предлагаем добавить, потом обратно к сводке
    if (c.s.ret && photoStepFor(c) && !data(c).photos?.length) return { to: "photoAsk" };
    return { to: after(c, formStart(c)) };
  },
};
