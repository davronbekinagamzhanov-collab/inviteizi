/** Шаги выбора: тадбир → формат → дизайн из каталога */
import type { Ctx, Result, Step, StepId } from "./types";
import type { Occasion } from "@/lib/domain";
import type { Format } from "@/templates/registry";
import { PRICES } from "@/templates/registry";
import { after, backRow, coverUrl, data, demoUrl, designName, designsFor, formatsFor, ib, inline, price, send } from "./util";
import type { InlineButton } from "../tg";

const OCCASIONS: Occasion[] = ["nikoh", "nahorgi", "sunnat"];

export const cat: Step = {
  async ask(c) {
    const rows = OCCASIONS.map((o) => [ib(c, c.tx.category[o as "nikoh" | "nahorgi" | "sunnat"], o)]);
    await send(c, c.tx.category.ask, inline([...rows, backRow(c)]));
  },
  async onButton(c, v) {
    if (!OCCASIONS.includes(v as Occasion)) return null;
    if (c.s.occasion !== v) c.s.data = { occasion: v as Occasion, events: [] };
    c.s.occasion = v as Occasion;
    return { to: "fmt" };
  },
};

export const fmt: Step = {
  async ask(c) {
    const rows = formatsFor(c.s.occasion ?? "nikoh").map((f) => [ib(c, c.tx.format[f](price(PRICES[f])), f)]);
    await send(c, c.tx.format.ask, inline([...rows, [ib(c, c.tx.format.info, "info")], backRow(c)]));
  },
  async onButton(c, v) {
    if (v === "info") {
      await c.deps.tg.answerCallbackQuery((c.u as { callbackId: string }).callbackId, { text: c.tx.format.infoText, alert: true });
      c.answered = true;
      return { stay: true };
    }
    if (!formatsFor(c.s.occasion ?? "nikoh").includes(v as Format)) return null;
    if (c.s.format !== v) c.s.catIdx = 0;
    c.s.format = v as Format;
    return { to: "catalog" };
  },
};

function catalogView(c: Ctx) {
  const list = designsFor(c.s.occasion ?? "nikoh", c.s.format ?? "animated");
  const i = ((c.s.catIdx ?? 0) % list.length + list.length) % list.length;
  c.s.catIdx = i;
  const d = list[i];
  const fmtName = c.tx.format.names[d.format];
  const caption = c.tx.catalog.caption(d.number, designName(d.id), fmtName, price(PRICES[d.format]));
  const rows: InlineButton[][] = [];
  if (list.length > 1) rows.push([ib(c, "◀", "prev"), ib(c, `${i + 1}/${list.length}`, "x"), ib(c, "▶", "next")]);
  rows.push([{ text: c.tx.catalog.demo, url: demoUrl(c, d.id) }, ib(c, c.tx.catalog.buy, "buy")]);
  rows.push(backRow(c));
  return { d, caption, markup: inline(rows), photo: coverUrl(c, d.id), count: list.length };
}

/** Первый вопрос анкеты для тадбира */
export function formStart(c: Ctx): StepId {
  return c.s.occasion === "nikoh" ? "groom" : "person";
}

export const catalog: Step = {
  async ask(c) {
    const v = catalogView(c);
    try {
      await c.deps.tg.sendPhoto(c.chatId, v.photo, { caption: v.caption, markup: v.markup });
    } catch (e) {
      // обложки нет или Telegram её не скачал — каталог текстом, клиент не застревает
      console.error("каталог: обложка", v.d.id, e instanceof Error ? e.message : e);
      await send(c, v.caption, v.markup);
    }
  },
  async onButton(c, value): Promise<Result> {
    if (value === "prev" || value === "next") {
      c.s.catIdx = (c.s.catIdx ?? 0) + (value === "next" ? 1 : -1);
      const v = catalogView(c);
      try {
        await c.deps.tg.editMessageMedia(c.chatId, c.u.messageId, v.photo, v.caption, v.markup);
      } catch {
        // сообщение текстовое (обложки не было) или фото не загрузилось
        await c.deps.tg.editMessageText(c.chatId, c.u.messageId, v.caption, { markup: v.markup }).catch(() => send(c, v.caption, v.markup));
      }
      return { stay: true };
    }
    if (value === "buy") {
      const v = catalogView(c);
      c.s.templateId = v.d.id;
      data(c).occasion = c.s.occasion;
      return { to: after(c, formStart(c)) };
    }
    return null;
  },
};
