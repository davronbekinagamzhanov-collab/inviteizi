/** Все тексты бота и данные кнопок укладываются в лимиты Telegram на обоих языках */
import { describe, expect, it } from "vitest";
import { uz } from "@/texts/bot-uz";
import { ru, staff } from "@/texts/bot-ru";
import { activeDesigns } from "@/templates/registry";
import { TG_LIMITS } from "./testing/fake-tg";

const LONG = "Ш".repeat(80);
const LONG_URL = `https://inviteizi.vercel.app/${"s".repeat(80)}`;

/** Все строки дерева текстов; функции вызываем с длинными значениями */
function strings(node: unknown, path: string, out: [string, string][] = []): [string, string][] {
  if (typeof node === "string") out.push([path, node]);
  else if (typeof node === "function") {
    // Аргументы бывают строками и объектами: любое поле значения превращается в длинный текст
    const wide: unknown = new Proxy(() => LONG_URL, {
      get: (_, key) => (key === Symbol.toPrimitive ? () => LONG_URL : wide),
    });
    const args = Array.from({ length: node.length }, () => wide);
    out.push([path, String(node(...args))]);
  } else if (Array.isArray(node)) node.forEach((v, i) => strings(v, `${path}[${i}]`, out));
  else if (node && typeof node === "object") for (const [k, v] of Object.entries(node)) strings(v, `${path}.${k}`, out);
  return out;
}

const worstCard = { n: 99999, amount: "10 000 ₸", format: "Варақланадиган", design: `№100 ${LONG}`, names: `${LONG} ва ${LONG}`, date: "31.12.2027 23:59", client: `@${"u".repeat(32)} (id 9999999999)`, url: LONG_URL };

describe("лимиты Telegram: панели владельца и менеджера (staff, ru)", () => {
  it("любой текст помещается в сообщение", () => {
    for (const [path, text] of strings(staff, "staff")) expect(text.length, path).toBeLessThanOrEqual(TG_LIMITS.message);
  });
});

describe.each([["uz", uz], ["ru", ru]] as const)("лимиты Telegram: %s", (_, tx) => {
  it("любой текст помещается в сообщение", () => {
    for (const [path, text] of strings(tx, "tx")) expect(text.length, path).toBeLessThanOrEqual(TG_LIMITS.message);
  });

  it("всплывающие ответы на кнопки не длиннее 200", () => {
    for (const text of [tx.oldButton, tx.admin.notAdmin, tx.admin.already, tx.admin.reasonAsk]) expect(text.length, text).toBeLessThanOrEqual(TG_LIMITS.alert);
  });

  it("подписи к фото и документам не длиннее 1024", () => {
    const captions = [
      tx.pay.qrCaption,
      tx.catalog.caption(100, LONG, "Варақланадиган", "10 000 ₸") + `\n${tx.catalog.withPhoto}\n\n${tx.catalog.photoCredit(LONG, LONG, LONG_URL)}`,
      tx.admin.card(worstCard),
    ];
    for (const text of captions) expect(text.length, text).toBeLessThanOrEqual(TG_LIMITS.caption);
  });

  it("подписи кнопок не длиннее 64", () => {
    const labels = [
      tx.langUz, tx.langRu, tx.back, tx.contact, ...Object.values(tx.menu),
      tx.category.nikoh, tx.category.nahorgi, tx.category.sunnat, tx.category.yubiley,
      tx.format.animated("10 000 ₸"), tx.format.scroll("10 000 ₸"), tx.format.simple("10 000 ₸"), tx.format.info,
      tx.catalog.demo, tx.catalog.buy, tx.form.sideYes, tx.form.sideNo,
      tx.event.readyVenues, tx.event.mapChoice, tx.event.linkChoice, tx.event.manualChoice, tx.event.openPlace, tx.event.skip,
      tx.event.timeOther, tx.event.sameDayYes, tx.event.sameDayNo, tx.event.addNahorgi, tx.event.addKelinSalom, tx.event.addBazm, tx.event.noMore,
      tx.text.more, tx.text.pick(99), tx.text.own, tx.music.fromList, tx.music.own, tx.music.none, tx.music.choose,
      tx.review.editNames, tx.review.editRelation, tx.review.editAge, tx.review.editCause, tx.review.editHosts, tx.review.editSides, tx.review.editText, tx.review.editMusic, tx.review.editDesign, tx.review.confirm,
      tx.review.evDate, tx.review.evTime, tx.review.evVenue, tx.review.evAddress, tx.review.evLocation, tx.review.evDelete,
      tx.order.pay("10 000 ₸"), tx.order.edit, tx.pay.copy, tx.pay.copyCard, tx.pay.sendReceipt, tx.pay.shareButton, tx.pay.newOrder, tx.pay.resend,
      tx.admin.approve, tx.admin.reject, ...Object.values(tx.admin.reasons), tx.my.link,
      // фото клиента, ответы гостей, избранное (03.11.2026)
      tx.photo.yes, tx.photo.no, tx.photo.example, tx.photo.done, tx.photo.again, tx.photo.edit,
      tx.rsvp.yes, tx.rsvp.no, tx.dashboard.favoriteAdd, tx.dashboard.favoriteList,
    ];
    for (const label of labels) expect(label.length, label).toBeLessThanOrEqual(TG_LIMITS.button);
  });

  it("профиль бота и команды в пределах Bot API", () => {
    expect(tx.profile.name.length).toBeLessThanOrEqual(64);
    expect(tx.profile.short.length).toBeLessThanOrEqual(120);
    expect(tx.profile.description.length).toBeLessThanOrEqual(512);
    for (const [command, description] of Object.entries(tx.profile.commands)) {
      expect(command).toMatch(/^[a-z0-9_]{1,32}$/);
      expect(description.length).toBeGreaterThanOrEqual(1);
      expect(description.length).toBeLessThanOrEqual(256);
    }
  });
});

describe("данные кнопок не длиннее 64 байт", () => {
  it("самые длинные шаблоны callback_data", () => {
    const q = 9_999_999;
    const longestId = activeDesigns().map((d) => d.id).sort((a, b) => b.length - a.length)[0];
    for (const data of [`fav:remove:${longestId}`, `fav:choose:${longestId}`, `a:${q}:d:2027-12-31`, `a:${q}:m:2027-12`, `a:${q}:venue:${"v".repeat(24)}`, `a:${q}:add:kelinSalom`, "nr:9999999:money", "pay:9999999", "rcpt:9999999", "edit:9999999", "link:9999999"]) {
      expect(Buffer.byteLength(data), data).toBeLessThanOrEqual(TG_LIMITS.callbackData);
    }
  });
});
