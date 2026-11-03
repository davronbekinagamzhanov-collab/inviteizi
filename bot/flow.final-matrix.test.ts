/**
 * Финальная матрица перед релизом (03.11.2026): КАЖДЫЙ тадбир × КАЖДЫЙ формат × uz/ru.
 * Каталог листается ▶ до конца и по кругу, ◀ обратно; «👁 Намуна» ведёт на /demo/<id>; дальше анкета
 * (uz — 3 тадбира, ru — 1), текст (uz — вариант, ru — свой), фото (только у clientPhotos-дизайнов),
 * музыка (uz — из списка, ru — своя песня), RSVP (uz — ҳа, ru — нет) → сводка → личная НАМУНА.
 * Потом правки до оплаты и закрытие правок после выдачи ссылки.
 */
import { describe, expect, it } from "vitest";
import { uz } from "@/texts/bot-uz";
import { ru } from "@/texts/bot-ru";
import type { Format, Occasion } from "@/lib/domain";
import { PRICES, getDesign, everAccepted, ACCEPTED } from "@/templates/registry";
import { designsFor, formatsFor } from "./flow/util";
import type { FakeMessage } from "./testing/fake-tg";
import { inlineButtons } from "./testing/fake-tg";
import { ADMIN, Sim } from "./testing/sim";

const ID = 11;
const BASE = "https://inviteizi.vercel.app";
const OCCASIONS: Occasion[] = ["nikoh", "nahorgi", "sunnat", "yubiley"];
type Lang = "uz" | "ru";
type Button = { text: string; data?: string; url?: string };

const buttons = (m: FakeMessage | undefined) => inlineButtons(m) as Button[];
const card = (sim: Sim) => sim.tg.to(ID).filter((m) => m.type === "photo").at(-1)!;

function photoSim() {
  const s = new Sim();
  s.deps.savePhoto = async (fileId) => `https://x.supabase.co/storage/v1/object/public/photos/client/${fileId}.webp`;
  s.deps.removePhotos = async () => undefined;
  return s;
}

async function press(sim: Sim, label: string | RegExp) {
  const screen = sim.last(ID);
  const b = buttons(screen).find((x) => x.data && (typeof label === "string" ? x.text === label : label.test(x.text)));
  if (!b) throw new Error(`Нет кнопки ${String(label)} на экране: ${screen.text.slice(0, 120)}`);
  await sim.callback(ID, b.data!, screen.id);
}
const has = (sim: Sim, label: string | RegExp) =>
  buttons(sim.last(ID)).some((x) => x.data && (typeof label === "string" ? x.text === label : label.test(x.text)));

/** Каталог: ▶ по всем дизайнам и по кругу, ◀ обратно, «👁 Намуна» — ссылка на демо этого дизайна */
async function browse(sim: Sim, occasion: Occasion, format: Format) {
  const list = designsFor(occasion, format);
  expect(list.length, `${occasion}/${format}`).toBeGreaterThan(0);
  const at = (k: number) => {
    const d = list[((k % list.length) + list.length) % list.length];
    const c = card(sim);
    expect(c.text, `${occasion}/${format} #${k}`).toContain(`№${d.number} `);
    const demo = buttons(c).find((b) => b.url);
    expect(demo?.url, d.id).toMatch(new RegExp(`/demo/${d.id}(\\?|$)`));
    expect(c.text.includes(uz.catalog.withPhoto) || c.text.includes(ru.catalog.withPhoto), d.id).toBe(Boolean(d.clientPhotos));
  };
  at(0);
  for (let k = 1; k <= list.length; k++) { await press(sim, "▶"); at(k); }
  for (let k = list.length - 1; k >= 0; k--) { await press(sim, "◀"); at(k); }
  // Выбираем дизайн с фото клиента, если он есть в этом формате: так проходим и шаг фото
  const target = Math.max(0, list.findIndex((d) => d.clientPhotos));
  for (let k = 0; k < target; k++) await press(sim, "▶");
  return list[target];
}

async function walk(lang: Lang, occasion: Occasion, format: Format) {
  const tx = lang === "uz" ? uz : ru;
  const sim = photoSim();
  await sim.start(ID);
  await sim.click(ID, lang === "uz" ? uz.langUz : ru.langRu);
  await sim.text(ID, tx.menu.create);
  const wantEvents = lang === "uz" ? 3 : 1;
  let design = undefined as ReturnType<typeof getDesign>;
  let sawPhoto = false;
  let events = 0;

  for (let guard = 0; guard < 80; guard++) {
    const { step } = (await sim.user(ID))!;
    if (step === "idle") break;
    switch (step) {
      case "cat": await press(sim, tx.category[occasion]); break;
      case "fmt": await press(sim, new RegExp(tx.format.names[format])); break;
      case "catalog": design = await browse(sim, occasion, format); await press(sim, tx.catalog.buy); break;
      case "groom": await sim.text(ID, "Муҳаммадюсуф"); break;
      case "bride": await sim.text(ID, "Мадинабону"); break;
      case "person": await sim.text(ID, "Абдурасулбек"); break;
      case "relation": case "cause": await sim.callback(ID, buttons(sim.last(ID)).find((b) => b.data)!.data!, sim.last(ID).id); break;
      case "age": await sim.text(ID, "70"); break;
      case "hosts": await sim.text(ID, "Каримовлар оиласи"); break;
      case "sideAsk": await press(sim, tx.form.sideNo); break;
      case "evDate": await press(sim, String(14 + events)); break;
      case "evSameDay": await press(sim, tx.event.sameDayNo); break;
      case "evTime": await sim.callback(ID, buttons(sim.last(ID)).find((b) => b.data)!.data!, sim.last(ID).id); break;
      case "evVenue": await sim.text(ID, "«Наврўз» тўйхонаси"); break;
      case "evAddress": await sim.text(ID, "Сайрам, Амир Темур кўчаси 45"); events++; break;
      case "evLoc": await press(sim, tx.event.skip); break;
      case "more":
        if (events < wantEvents) await sim.callback(ID, buttons(sim.last(ID)).find((b) => b.data && b.text !== tx.event.noMore)!.data!, sim.last(ID).id);
        else await press(sim, tx.event.noMore);
        break;
      case "photoAsk": sawPhoto = true; await press(sim, tx.photo.yes); break;
      case "photoUpload":
        if (lang === "uz") {
          await sim.photo(ID, "P1");
          await sim.document(ID, "P2", "image/heic", "IMG_0001.HEIC");
          await sim.photo(ID, "P3"); // третье — дальше само
        } else {
          const mark = sim.mark();
          await sim.document(ID, "BIG", "image/jpeg", "big.jpg", 11 * 1024 * 1024);
          expect(sim.textsSince(ID, mark)).toContain(tx.photo.tooBig);
          expect((await sim.user(ID))!.step).toBe("photoUpload");
          await sim.photo(ID, "P1");
          await press(sim, tx.photo.done);
        }
        break;
      case "text":
        if (lang === "uz") await press(sim, tx.text.pick(1));
        else { await press(sim, tx.text.own); await sim.text(ID, "Азиз меҳмонлар! Сизни тўйимизга чақирамиз."); }
        break;
      case "music":
        if (lang === "uz" && has(sim, tx.music.fromList)) {
          await press(sim, tx.music.fromList);
          await press(sim, /^▶️ /);
          await sim.click(ID, tx.music.choose); // «✅» — под карточкой песни
        } else if (lang === "ru") {
          await press(sim, tx.music.own);
          await sim.audio(ID, "OWN_SONG", 3_000_000);
        } else await press(sim, tx.music.none);
        break;
      case "rsvp": await press(sim, lang === "uz" ? tx.rsvp.yes : tx.rsvp.no); break;
      case "review": await press(sim, tx.review.confirm); break;
      default: throw new Error(`Путь ${lang}/${occasion}/${format} остановился на шаге ${step}: ${sim.lastText(ID).slice(0, 120)}`);
    }
  }
  expect((await sim.user(ID))!.step).toBe("idle");
  expect(sawPhoto, "шаг фото только у clientPhotos-дизайнов").toBe(Boolean(design!.clientPhotos));
  const [o] = await sim.repo.listOrdersByUser(ID);
  expect(o).toMatchObject({ status: "preview", occasion, format, templateId: design!.id, amount: PRICES[format] });
  // никоҳ — до 3 тадбиров; у остальных бот предлагает 2 вида (основной + наҳорги ош / базм)
  expect(o.data.events).toHaveLength(events);
  expect(events).toBe(lang === "ru" ? 1 : occasion === "nikoh" ? 3 : 2);
  expect(o.data.photos ?? []).toHaveLength(design!.clientPhotos ? (lang === "uz" ? 3 : 1) : 0);
  expect(o.data.rsvp).toBe(lang === "uz");
  if (lang === "ru") expect(o.music).toMatchObject({ kind: "own" });
  expect(sim.lastText(ID)).toBe(tx.order.created(`${BASE}/${o.slug}`));
  expect(sim.repo.botErrors).toEqual([]);
  expect(sim.tg.messages.filter((m) => m.text === tx.error)).toEqual([]);
  return { sim, o, tx };
}

const cases = (["uz", "ru"] as const).flatMap((lang) =>
  OCCASIONS.flatMap((occasion) => formatsFor(occasion).map((format) => [lang, occasion, format] as const)),
);

describe("финальная матрица: тадбир × формат × язык до личной НАМУНА", () => {
  it("все 4 тадбира × 3 формата есть в боте", () => {
    for (const occasion of OCCASIONS) expect(formatsFor(occasion).sort(), occasion).toEqual(["animated", "scroll", "simple"]);
  });
  it.each(cases)("%s · %s · %s", async (lang, occasion, format) => {
    await walk(lang, occasion, format);
  });
});

describe("правки до оплаты — та же ссылка НАМУНА", () => {
  it("дизайн без фото → с фото: шаг фото появляется; с фото → без фото: фото убираются; формат меняет цену", async () => {
    const { sim, o, tx } = await walk("uz", "nikoh", "simple");
    expect(getDesign(o.templateId)!.clientPhotos).toBe(true);
    expect(o.data.photos).toHaveLength(3);
    // → Анимацияли, дизайн без фото
    await press(sim, tx.order.edit);
    await press(sim, tx.review.editDesign);
    await press(sim, new RegExp(tx.format.names.animated));
    const plain = designsFor("nikoh", "animated").findIndex((d) => !d.clientPhotos);
    for (let k = 0; k < plain; k++) await press(sim, "▶");
    await press(sim, tx.catalog.buy);
    await press(sim, tx.review.confirm);
    let now = (await sim.repo.getOrder(o.id))!;
    expect(now).toMatchObject({ slug: o.slug, format: "animated", amount: PRICES.animated, templateId: designsFor("nikoh", "animated")[plain].id });
    expect(now.data.photos ?? []).toEqual([]);
    expect(sim.lastText(ID)).toContain(`${BASE}/${o.slug}`);
    // → Оддий, дизайн с фото: после выбора бот спрашивает фото
    await press(sim, tx.order.edit);
    await press(sim, tx.review.editDesign);
    await press(sim, new RegExp(tx.format.names.simple));
    const withPhoto = designsFor("nikoh", "simple").findIndex((d) => d.clientPhotos);
    for (let k = 0; k < withPhoto; k++) await press(sim, "▶");
    await press(sim, tx.catalog.buy);
    expect(sim.lastText(ID)).toBe(tx.photo.ask);
    await press(sim, tx.photo.yes);
    await sim.photo(ID, "NEW1");
    await press(sim, tx.photo.done);
    expect((await sim.user(ID))!.step).toBe("review");
    await press(sim, tx.review.confirm);
    now = (await sim.repo.getOrder(o.id))!;
    expect(now).toMatchObject({ slug: o.slug, format: "simple", amount: PRICES.simple });
    expect(now.data.photos).toHaveLength(1);
  });

  it("имена, дата, текст, музыка — сохраняются в тот же заказ, ссылка та же", async () => {
    const { sim, o, tx } = await walk("uz", "sunnat", "scroll");
    await press(sim, tx.order.edit);
    await press(sim, tx.review.editNames);
    await sim.text(ID, "Жасурбек");
    await press(sim, /^✏️ 1\. /);
    await press(sim, tx.review.evDate);
    await press(sim, "20");
    await press(sim, tx.review.editText);
    await press(sim, tx.text.own);
    await sim.text(ID, "Бизнинг янги матнимиз.");
    await press(sim, tx.review.editMusic);
    await press(sim, tx.music.none);
    await press(sim, tx.review.confirm);
    const now = (await sim.repo.getOrder(o.id))!;
    expect(now.slug).toBe(o.slug);
    expect(now.data.person).toBe("Жасурбек");
    expect(now.data.events[0].date.endsWith("-20")).toBe(true);
    expect(now.data.customText).toContain("Бизнинг янги матнимиз.");
    expect(now.music).toMatchObject({ kind: "none" });
    expect(sim.lastText(ID)).toContain(`${BASE}/${o.slug}`);
  });
});

describe("оплата и закрытие правок", () => {
  it("чек → ✅ админа → ссылка; после этого правок нет, только «🆕 Янги таклифнома»", async () => {
    const { sim, o, tx } = await walk("ru", "yubiley", "animated");
    await sim.callback(ID, `pay:${o.number}`, sim.last(ID).id);
    await sim.photo(ID, "RECEIPT");
    await sim.photo(ID, "RECEIPT2"); // второй чек — не второй заказ
    expect((await sim.repo.listOrdersByUser(ID))).toHaveLength(1);
    await sim.start(ADMIN);
    await sim.click(ADMIN, uz.langUz);
    const ok = sim.findButton(ADMIN, uz.admin.approve);
    await sim.callback(ADMIN, ok.data, ok.msg.id);
    await sim.callback(ADMIN, ok.data, ok.msg.id); // двойное нажатие
    expect((await sim.repo.getOrder(o.id))!.status).toBe("active");
    const links = sim.tg.to(ID).filter((m) => m.text.includes(`${BASE}/${o.slug}`));
    expect(links.length).toBeGreaterThan(0);
    expect(buttons(sim.last(ID)).map((b) => b.text)).not.toContain(tx.order.edit);
  });
});

describe("скрытые дизайны", () => {
  it("в каталоге бота их нет, но код и номер на месте (старые оплаченные ссылки открываются)", () => {
    const shown = new Set(OCCASIONS.flatMap((oc) => formatsFor(oc).flatMap((f) => designsFor(oc, f).map((d) => d.id))));
    for (const d of everAccepted()) {
      expect(shown.has(d.id), d.id).toBe(ACCEPTED.has(d.id));
      expect(getDesign(d.id)?.load, d.id).toBeTypeOf("function");
    }
    expect(shown.has("islimi-varaq")).toBe(false);
    expect(shown.size).toBe(33);
  });
});
