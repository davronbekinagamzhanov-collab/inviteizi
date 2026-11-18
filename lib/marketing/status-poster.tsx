/**
 * Картинка для статуса 1080×1920: приглашение семьи (не реклама). С 19.11.2026 это то же фото 9:16, что
 * «Сақлаб олиш» → «🖼 Статус учун»: подложка самого дизайна, его шрифты и цвета, все тадбиры, QR на /<slug>
 * (lib/keepsake/render.tsx). Здесь — язык, поля для подписи и сама подпись в Telegram.
 */
import { reportText } from "@/lib/chart";
import { textsFor } from "@/texts/uz-cyrl";
import type { OrderRecord } from "@/lib/domain";
import { MAIN_EVENT } from "@/lib/order-rules";
import { parseWeddingDate } from "@/lib/wedding-date";
import type { InviteLang } from "@/texts/invite-lang";
import { keepsakePng } from "@/lib/keepsake/render";

/** Язык приглашения: основной язык страницы, выбранный клиентом (узбекский по умолчанию) */
export const posterLang = (order: OrderRecord): InviteLang => order.data.mainLang ?? "uz";

export function statusFields(order: OrderRecord, lang: InviteLang = posterLang(order)) {
  const text = textsFor(lang),
    e = order.data.events.find((e) => e.kind === MAIN_EVENT[order.occasion]) ?? order.data.events[0],
    w = e ? parseWeddingDate(e.date, e.time) : null;
  return {
    names: reportText(
      order.occasion === "nikoh"
        ? `${order.data.groom ?? ""} & ${order.data.bride ?? ""}`
        : (order.data.person ?? order.data.hosts),
    ),
    title: reportText(text.occasionTitles[order.occasion]),
    invite: reportText(text.statusPoster.title[order.occasion]),
    scan: reportText(text.statusPoster.scan),
    date: w ? text.date.long(w.day, w.monthIndex, w.year) + " · " + e!.time : "",
    venue: e?.venueName ? reportText(e.venueName) : "",
    age: order.occasion === "yubiley" && order.data.age ? order.data.age + " " + text.ageLabel : null,
  };
}

export async function statusPoster(order: OrderRecord, url: string, lang: InviteLang = posterLang(order)) {
  const data = { ...order.data, mainLang: lang === "uz" ? undefined : lang } as OrderRecord["data"];
  return keepsakePng({ ...order, data }, url, "story");
}

/** Подпись к фото в Telegram: одна строка, ссылка, «Статусга қўйинг» */
export function statusCaption(order: OrderRecord, url: string, cta: string) {
  const f = statusFields(order);
  return [[f.names, f.date].filter(Boolean).join(" · "), url, cta].join("\n");
}
