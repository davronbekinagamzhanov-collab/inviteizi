/** Шаги выбора: тадбир → формат → дизайн из каталога */
import type { Ctx, Result, Step, StepId } from "./types";
import type { Occasion } from "@/lib/domain";
import type { Format } from "@/templates/registry";
import { PRICES } from "@/templates/registry";
import { after, backRow, coverUrl, data, demoUrl, designName, designsFor, formatsFor, ib, inline, price, priceNote, send } from "./util";
import type { InlineButton } from "../tg";
import { usesLegacyDesign } from "@/templates/design-version";
import { photoAttributions } from "@/texts/uz-cyrl";

const OCCASIONS: Occasion[] = ["nikoh", "nahorgi", "sunnat", "yubiley"];

export const cat: Step = {
  async ask(c) {
    const rows = OCCASIONS.map((o) => [ib(c, c.tx.category[o], o)]);
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
    await send(c, `${c.tx.format.ask}\n\n${priceNote(c.tx)}`, inline([...rows, [ib(c, c.tx.format.info, "info")], backRow(c)]));
  },
  async onButton(c, v) {
    if (v === "info") {
      // Обычным сообщением: у всплывающего окна лимит 200 символов. Кнопки тарифов показываем снова ниже
      return { hint: c.tx.format.infoText };
    }
    if (!formatsFor(c.s.occasion ?? "nikoh").includes(v as Format)) return null;
    if (c.s.format !== v) c.s.catIdx = 0;
    c.s.format = v as Format;
    return { to: "catalog" };
  },
};

function catalogView(c: Ctx) {
  const list = designsFor(c.s.occasion ?? "nikoh", c.s.format ?? "animated");
  if (!list.length) return null; // A persisted pre-upgrade catalog may now have no designs in this format.
  c.s.catRevision = list.map(d => d.id).join(",");
  const i = ((c.s.catIdx ?? 0) % list.length + list.length) % list.length;
  c.s.catIdx = i;
  const d = list[i];
  // An unversioned unpaid edit keeps its pinned appearance; show its matching cover/demo.
  const legacy = Boolean(c.s.orderId) && usesLegacyDesign(d.id,c.s.data?.designVersion);
  const fmtName = c.tx.format.names[d.format];
  const credit = photoAttributions[d.id];
  const caption = c.tx.catalog.caption(d.number, designName(d.id), fmtName, price(PRICES[d.format])) + (credit ? `\n\n${c.tx.catalog.photoCredit(credit.author,credit.license,credit.source)}` : "");
  const rows: InlineButton[][] = [];
  if (list.length > 1) rows.push([ib(c, "◀", "prev"), ib(c, `${i + 1}/${list.length}`, "x"), ib(c, "▶", "next")]);
  rows.push([{ text: c.tx.catalog.demo, url: demoUrl(c, d.id, legacy) }, ib(c, c.tx.catalog.buy, "buy")]);
  rows.push([{ text: c.tx.dashboard.favoriteAdd, data: `fav:add:${d.id}` }, { text: c.tx.dashboard.favoriteList, data: "favorites" }]);
  rows.push(backRow(c));
  return { d, caption, markup: inline(rows), photo: coverUrl(c, d.id, legacy), count: list.length };
}

/** Первый вопрос анкеты для тадбира */
export function formStart(c: Ctx): StepId {
  return c.s.occasion === "nikoh" ? "groom" : "person";
}

export const catalog: Step = {
  async ask(c) {
    const v = catalogView(c);
    if (!v) {
      c.step = "fmt";
      await fmt.ask(c);
      return;
    }
    try {
      await c.deps.tg.sendPhoto(c.chatId, v.photo, { caption: v.caption, markup: v.markup });
    } catch (e) {
      // обложки нет или Telegram её не скачал — каталог текстом, клиент не застревает
      console.error("каталог: обложка", v.d.id, e instanceof Error ? e.name : "Error");
      await send(c, v.caption, v.markup);
    }
  },
  async onButton(c, value): Promise<Result> {
    const list = designsFor(c.s.occasion ?? "nikoh", c.s.format ?? "animated");
    if (!list.length) return { to: "fmt" };
    // Old index-only callbacks must not silently buy a different design after reclassification.
    if (c.s.catRevision !== list.map(d => d.id).join(",")) {
      c.s.catIdx = 0;
      return { to: "catalog" };
    }
    if (value === "prev" || value === "next") {
      c.s.catIdx = (c.s.catIdx ?? 0) + (value === "next" ? 1 : -1);
      const v = catalogView(c);
      if (!v) return { to: "fmt" };
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
      if (!v) return { to: "fmt" };
      c.s.templateId = v.d.id;
      // Optional telemetry must not block the existing purchase flow during rollout/outage.
      await c.deps.repo.recordEvent(c.user.id, "design_selected", v.d.id, `${v.d.id}:${c.s.q ?? 0}`).catch(error=>{
        console.warn("design selection analytics",error instanceof Error?error.name:"Error");
      });
      data(c).occasion = c.s.occasion;
      return { to: after(c, formStart(c)) };
    }
    return null;
  },
};
