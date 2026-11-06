/** Готовые пути по боту для сценарных тестов */
import { uz } from "@/texts/bot-uz";
import { ru } from "@/texts/bot-ru";
import { kk } from "@/texts/bot-kk";
import type { Format } from "@/lib/domain";
import { FORMATS } from "@/templates/registry";
import type { Draft } from "../flow/types";
import { catalogList, PAGE } from "../flow/steps-order";
import type { Sim } from "./sim";


/**
 * Каталог в чате (v2): альбом по 3 обложки. Листает ▶ до страницы с нужным дизайном и жмёт «N️⃣ Шуни танлайман».
 * which: формат (первый дизайн этого формата в каталоге), id дизайна или ничего (первый в каталоге).
 */
export async function pickDesign(sim: Sim, id: number, which?: Format | string) {
  const st = (await sim.user(id))!.state as Draft;
  const list = catalogList({ s: { occasion: st.occasion, paid: st.paid, format: st.format } });
  const target = which === undefined ? list[0] : (FORMATS as readonly string[]).includes(which) ? list.find((d) => d.format === which) : list.find((d) => d.id === which);
  if (!target) throw new Error(`В каталоге нет ${which}`);
  const idx = list.indexOf(target);
  const want = Math.floor(idx / PAGE) * PAGE;
  for (let i = 0; i <= list.length; i++) {
    const now = ((await sim.user(id))!.state as Draft).catIdx ?? 0;
    if (now === want) break;
    await sim.click(id, "▶");
  }
  const mark = ["1️⃣", "2️⃣", "3️⃣"][idx % PAGE];
  await sim.click(id, new RegExp(`^${mark} (${uz.catalog.pick("").trim()}|${ru.catalog.pick("").trim()}|${kk.catalog.pick("").trim()})$`));
  return target;
}

/** Дизайн уже в черновике → тот же, но через каталог «✏️ Дизайн» не нужен: только выбор на открытой странице */
export const pickFromOpenCatalog = pickDesign;

/**
 * Бот сам выбрал текст №1, первую мелодию и «ответы: ҳа». Старые тесты отвечали на эти вопросы —
 * тот же итог через ✏️ в сводке: текст N, музыка (none — без музыки, keep — как выбрал бот), ответы.
 */
export async function setChoices(sim: Sim, id: number, o: { text?: number; music?: "none" | "keep"; rsvp?: boolean } = {}) {
  const tx = ((await sim.user(id))!.lang ?? "uz") === "ru" ? ru : uz;
  if (o.text && o.text !== 1) {
    await sim.click(id, tx.review.editText);
    await sim.click(id, tx.text.pick(o.text));
  }
  if ((o.music ?? "none") === "none") {
    await sim.click(id, tx.review.editMusic);
    await sim.click(id, tx.music.none);
  }
  if (o.rsvp === false) {
    await sim.click(id, tx.rsvp.edit);
    await sim.click(id, tx.rsvp.no);
  }
}


/** /start → язык → «Создать» (клиент стоит на выборе тадбира) */
export async function startUz(sim: Sim, id: number, payload = "") {
  await sim.start(id, payload);
  await sim.click(id, uz.langUz);
  await sim.text(id, uz.menu.create);
}

export async function startRu(sim: Sim, id: number, payload = "") {
  await sim.start(id, payload);
  await sim.click(id, ru.langRu);
  await sim.text(id, ru.menu.create);
}

/** Никоҳ на ўзбекском до сводки: один тадбир (никоҳ базми 14 ноября 18:00), 1-й текст, без музыки */
/** Никоҳ до шага «Мусиқа» (вопрос о музыке уже задан) */
export async function nikohToMusic(sim: Sim, id: number, names: [string, string] = ["Азиз", "Мадина"], format: Format = "animated") {
  await startUz(sim, id);
  await sim.click(id, uz.category.nikoh);
  await pickDesign(sim, id, format);
  await sim.text(id, names[0]);
  await sim.text(id, names[1]);
  await sim.click(id, "Фарзандларимиз");
  await sim.text(id, "Каримовлар оиласи");
  await sim.click(id, uz.form.sideNo);
  await sim.click(id, "14");
  await sim.click(id, "18:00");
  await sim.text(id, "«Наврўз» тўйхонаси");
  await sim.text(id, "Сайрам, Амир Темур кўчаси 45");
  await sim.text(id, uz.event.skip);
  await sim.click(id, uz.event.noMore);
  // v2: бот сам выбрал текст/музыку/ответы и показал сводку; к вопросу о музыке — через ✏️
  await sim.click(id, uz.review.editMusic);
}

/** Никоҳ до шага «Матн» (варианты текста уже показаны) */
export async function nikohToText(sim: Sim, id: number, format: Format = "animated") {
  await startUz(sim, id);
  await sim.click(id, uz.category.nikoh);
  await pickDesign(sim, id, format);
  await sim.text(id, "Азиз");
  await sim.text(id, "Мадина");
  await sim.click(id, "Фарзандларимиз");
  await sim.text(id, "Каримовлар оиласи");
  await sim.click(id, uz.form.sideNo);
  await sim.click(id, "14");
  await sim.click(id, "18:00");
  await sim.text(id, "«Наврўз» тўйхонаси");
  await sim.text(id, "Сайрам, Амир Темур кўчаси 45");
  await sim.text(id, uz.event.skip);
  await sim.click(id, uz.event.noMore);
  await sim.click(id, uz.review.editText);
}

export async function nikohToReview(sim: Sim, id: number, names: [string, string] = ["Азиз", "Мадина"], format: Format = "animated") {
  await nikohToMusic(sim, id, names, format);
  await sim.click(id, uz.music.none);
  await sim.click(id, uz.rsvp.edit);
  await sim.click(id, uz.rsvp.no);
}

/** Никоҳ до созданного заказа (status preview) — возвращает заказ */
export async function nikohOrder(sim: Sim, id: number, names: [string, string] = ["Азиз", "Мадина"], format: Format = "animated") {
  await nikohToReview(sim, id, names, format);
  await sim.click(id, uz.review.confirm);
  const [order] = await sim.repo.listOrdersByUser(id);
  return order;
}

/** Заказ → «Тўлаш» → чек фото (status receipt_sent) */
export async function nikohWithReceipt(sim: Sim, id: number, names?: [string, string]) {
  await nikohOrder(sim, id, names);
  await sim.click(id, /^💳 Тўлаш/);
  // v2: проверка перед оплатой — «✅ Ҳаммаси тўғри, тўлаймиз»
  await sim.click(id, uz.pay.confirmYes);
  await sim.photo(id, `RECEIPT_${id}`);
  const [order] = await sim.repo.listOrdersByUser(id);
  return order;
}

/** Выбрать дизайн по id, где бы он ни стоял в каталоге */
export async function selectCatalogDesign(sim: Sim, user: number, template: string) {
  await pickDesign(sim, user, template);
}
