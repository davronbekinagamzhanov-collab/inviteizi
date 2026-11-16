import { coverVersioned } from "@/lib/cover-version";
/**
 * Финальная матрица перед релизом (03.11.2026): КАЖДЫЙ тадбир × КАЖДЫЙ формат × uz/ru.
 * Каталог листается ▶ до конца и по кругу, ◀ обратно; «👁 Намуна» ведёт на /demo/<id>; дальше анкета
 * (uz — 3 тадбира, ru — 1), текст (uz — вариант, ru — свой), фото (только у clientPhotos-дизайнов),
 * музыка (uz — из списка, ru — своя песня), RSVP (uz — ҳа, ru — нет) → сводка → личная НАМУНА.
 * Потом правки до оплаты и закрытие правок после выдачи ссылки.
 */
import { ON_SALE_IDS } from "@/templates/catalog";
import { describe, expect, it } from "vitest";
import { uz } from "@/texts/bot-uz";
import { ru } from "@/texts/bot-ru";
import type { Occasion } from "@/lib/domain";
import { PRICES, getDesign, everAccepted, ACCEPTED } from "@/templates/registry";
import { catalogList, PAGE } from "./flow/steps-order";
import { pickDesign } from "./testing/paths";
import type { FakeMessage } from "./testing/fake-tg";
import { inlineButtons } from "./testing/fake-tg";
import { ADMIN, Sim } from "./testing/sim";
import { DESIGN_MODULES } from "@/templates/design-modules";

const ID = 11;
const BASE = "https://inviteizi.vercel.app";
const OCCASIONS: Occasion[] = ["nikoh", "nahorgi", "sunnat", "yubiley"];
type Lang = "uz" | "ru";
type Button = { text: string; data?: string; url?: string };

const buttons = (m: FakeMessage | undefined) => inlineButtons(m) as Button[];

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

/** Каталог: альбом по 3 обложки, ▶ по всем страницам и по кругу, ◀ обратно; «N️⃣ 👁» — демо этого дизайна */
async function browse(sim: Sim, occasion: Occasion, pick: "photo" | "plain") {
  const list = catalogList({ s: { occasion } });
  expect(list.length, occasion).toBeGreaterThan(0);
  const pages = Math.ceil(list.length / PAGE);
  const at = (k: number) => {
    const start = (((k % pages) + pages) % pages) * PAGE;
    const menu = sim.last(ID);
    const albums = sim.tg.to(ID).filter((m) => m.type === "photo");
    const shown = list.slice(start, start + PAGE);
    for (const [n, d] of shown.entries()) {
      expect(menu.text, `${occasion} стр.${k}`).toContain(`№${d.number} `);
      expect(
        menu.text
          .split("\n")
          .find((l) => l.includes(`№${d.number} `))!
          .includes("📷"),
        d.id,
      ).toBe(Boolean(d.clientPhotos));
      const demo = buttons(menu).filter((b) => b.url)[n];
      expect(demo?.url, d.id).toMatch(new RegExp(`/demo/${d.id}(\\?|#|$)`));
      expect(
        albums.some((m) => m.media === `${BASE}${coverVersioned(`/covers/${d.id}.jpg`)}`),
        d.id,
      ).toBe(true);
    }
    // Прошлая страница удалена: в чате только обложки текущей
    expect(albums.length, "одна страница каталога в чате").toBe(shown.length);
  };
  at(0);
  if (pages > 1) {
    for (let k = 1; k <= pages; k++) {
      await press(sim, "▶");
      at(k);
    }
    for (let k = pages - 1; k >= 0; k--) {
      await press(sim, "◀");
      at(k);
    }
  }
  const target =
    (pick === "photo" ? list.find((d) => d.clientPhotos) : undefined) ?? list.find((d) => !d.clientPhotos) ?? list[0];
  await pickDesign(sim, ID, target.id);
  return target;
}

async function walk(lang: Lang, occasion: Occasion, pick: "photo" | "plain" = "photo") {
  const tx = lang === "uz" ? uz : ru;
  const sim = photoSim();
  await sim.start(ID);
  await sim.click(ID, lang === "uz" ? uz.langUz : ru.langRu);
  await sim.text(ID, tx.menu.create);
  const wantEvents = lang === "uz" ? 3 : 1;
  let design = undefined as ReturnType<typeof getDesign>;
  let sawPhoto = false;
  let events = 0;
  let edited = false;

  for (let guard = 0; guard < 80; guard++) {
    const { step } = (await sim.user(ID))!;
    if (step === "idle") break;
    switch (step) {
      case "cat":
        await press(sim, tx.category[occasion]);
        break;
      case "catalog":
        design = await browse(sim, occasion, pick);
        break;
      case "groom":
        await sim.text(ID, "Муҳаммадюсуф");
        break;
      case "bride":
        await sim.text(ID, "Мадинабону");
        break;
      case "person":
        await sim.text(ID, "Абдурасулбек");
        break;
      case "relation":
      case "cause":
        await sim.callback(ID, buttons(sim.last(ID)).find((b) => b.data)!.data!, sim.last(ID).id);
        break;
      case "age":
        await sim.text(ID, "70");
        break;
      case "hosts":
        await sim.text(ID, "Каримовлар оиласи");
        break;
      case "sideAsk":
        await press(sim, tx.form.sideNo);
        break;
      case "evDate":
        await press(sim, String(14 + events));
        break;
      case "evSameDay":
        await press(sim, tx.event.sameDayNo);
        break;
      case "evTime":
        await sim.callback(ID, buttons(sim.last(ID)).find((b) => b.data)!.data!, sim.last(ID).id);
        break;
      case "evVenue":
        await sim.text(ID, "«Наврўз» тўйхонаси");
        break;
      case "evAddress":
        await sim.text(ID, "Сайрам, Амир Темур кўчаси 45");
        events++;
        break;
      case "evLoc":
        await press(sim, tx.event.skip);
        break;
      case "more":
        if (events < wantEvents)
          await sim.callback(
            ID,
            buttons(sim.last(ID)).find((b) => b.data && b.text !== tx.event.noMore)!.data!,
            sim.last(ID).id,
          );
        else await press(sim, tx.event.noMore);
        break;
      case "photoAsk":
        sawPhoto = true;
        await press(sim, tx.photo.yes);
        break;
      case "photoUpload":
        if (lang === "uz") {
          await sim.photo(ID, "P1");
          await sim.document(ID, "P2", "image/heic", "IMG_0001.HEIC");
          // Одно живое сообщение «📷 Расмлар: 2 та ✅», а не новое на каждое фото
          const live = sim.tg.to(ID).filter((m) => m.text.startsWith("📷 Расмлар: "));
          expect(live).toHaveLength(1);
          expect(live[0].text).toBe(tx.photo.accepted(2));
          await sim.photo(ID, "P3"); // третье — дальше само
        } else {
          const mark = sim.mark();
          await sim.document(ID, "BIG", "image/jpeg", "big.jpg", 21 * 1024 * 1024);
          expect(sim.textsSince(ID, mark)).toContain(tx.photo.tooBig);
          expect((await sim.user(ID))!.step).toBe("photoUpload");
          await sim.photo(ID, "P1");
          await press(sim, tx.photo.done);
        }
        break;
      case "review":
        // «Бот танлади»: текст №1, первая мелодия, ответы включены. ru меняет всё через ✏️
        if (lang === "ru" && !edited) {
          edited = true;
          expect(sim.lastText(ID)).toContain(tx.review.title);
          await press(sim, tx.review.editText);
          await press(sim, tx.text.own);
          await sim.text(ID, "Азиз меҳмонлар! Сизни тўйимизга чақирамиз.");
          await press(sim, tx.review.editMusic);
          await press(sim, tx.music.own);
          await sim.audio(ID, "OWN_SONG", 3_000_000);
          await press(sim, tx.rsvp.edit);
          await press(sim, tx.rsvp.no);
          break;
        }
        await press(sim, tx.review.confirm);
        break;
      default:
        throw new Error(`Путь ${lang}/${occasion} остановился на шаге ${step}: ${sim.lastText(ID).slice(0, 120)}`);
    }
  }
  expect((await sim.user(ID))!.step).toBe("idle");
  expect(sawPhoto, "шаг фото только у clientPhotos-дизайнов").toBe(Boolean(design!.clientPhotos));
  const [o] = await sim.repo.listOrdersByUser(ID);
  expect(o).toMatchObject({
    status: "preview",
    occasion,
    format: design!.format,
    templateId: design!.id,
    amount: PRICES[design!.format],
  });
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
  OCCASIONS.flatMap((occasion) => (["photo", "plain"] as const).map((pick) => [lang, occasion, pick] as const)),
);

describe("финальная матрица: тадбир × язык × дизайн (с фото / без) до личной НАМУНА", () => {
  it("в каждом тадбире есть дизайны всех трёх цен", () => {
    for (const occasion of OCCASIONS)
      expect([...new Set(catalogList({ s: { occasion } }).map((d) => d.format))].sort(), occasion).toEqual([
        "animated",
        "scroll",
        "simple",
      ]);
  });
  it.each(cases)("%s · %s · %s", async (lang, occasion, pick) => {
    await walk(lang, occasion, pick);
  });
});

describe("правки до оплаты — та же ссылка НАМУНА", () => {
  it("дизайн с фото → без фото: фото убираются, цена — нового дизайна; без фото → с фото: шаг фото появляется", async () => {
    const { sim, o, tx } = await walk("uz", "nikoh", "photo");
    expect(getDesign(o.templateId)!.clientPhotos).toBe(true);
    expect(o.data.photos).toHaveLength(3);
    const list = catalogList({ s: { occasion: "nikoh" } });
    const plain = list.find((d) => !d.clientPhotos && d.format !== o.format)!;
    await press(sim, tx.order.edit);
    await press(sim, tx.review.editDesign);
    await pickDesign(sim, ID, plain.id);
    await press(sim, tx.review.confirm);
    let now = (await sim.repo.getOrder(o.id))!;
    expect(now).toMatchObject({
      slug: o.slug,
      format: plain.format,
      amount: PRICES[plain.format],
      templateId: plain.id,
    });
    expect(now.data.photos ?? []).toEqual([]);
    expect(sim.lastText(ID)).toContain(`${BASE}/${o.slug}`);
    const withPhoto = list.find((d) => d.clientPhotos && d.id !== o.templateId)!;
    await press(sim, tx.order.edit);
    await press(sim, tx.review.editDesign);
    await pickDesign(sim, ID, withPhoto.id);
    expect(sim.lastText(ID)).toBe(tx.photo.ask);
    await press(sim, tx.photo.yes);
    await sim.photo(ID, "NEW1");
    await press(sim, tx.photo.done);
    expect((await sim.user(ID))!.step).toBe("review");
    await press(sim, tx.review.confirm);
    now = (await sim.repo.getOrder(o.id))!;
    expect(now).toMatchObject({
      slug: o.slug,
      format: withPhoto.format,
      amount: PRICES[withPhoto.format],
      templateId: withPhoto.id,
    });
    expect(now.data.photos).toHaveLength(1);
  });

  it("имена, дата, текст, музыка — сохраняются в тот же заказ, ссылка та же", async () => {
    const { sim, o, tx } = await walk("uz", "sunnat", "plain");
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
    const { sim, o, tx } = await walk("ru", "yubiley", "plain");
    await sim.callback(ID, `payok:${o.number}`, sim.last(ID).id);
    await sim.photo(ID, "RECEIPT");
    await sim.photo(ID, "RECEIPT2"); // второй чек — не второй заказ
    expect(await sim.repo.listOrdersByUser(ID)).toHaveLength(1);
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
    const shown = new Set(OCCASIONS.flatMap((oc) => catalogList({ s: { occasion: oc } }).map((d) => d.id)));
    for (const d of everAccepted()) {
      expect(shown.has(d.id), d.id).toBe(ACCEPTED.has(d.id));
      expect(DESIGN_MODULES[d.id], d.id).toBeTypeOf("function");
    }
    expect(shown.has("islimi-varaq")).toBe(false);
    expect([...shown].sort()).toEqual([...ON_SALE_IDS].sort()); // ровно витрина templates/catalog.ts
  });
});
