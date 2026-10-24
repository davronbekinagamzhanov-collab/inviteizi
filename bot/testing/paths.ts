/** Готовые пути по боту для сценарных тестов */
import { uz } from "@/texts/bot-uz";
import { ru } from "@/texts/bot-ru";
import type { Sim } from "./sim";

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
export async function nikohToReview(sim: Sim, id: number, names: [string, string] = ["Азиз", "Мадина"]) {
  await startUz(sim, id);
  await sim.click(id, uz.category.nikoh);
  await sim.click(id, /Анимацияли/);
  await sim.click(id, uz.catalog.buy);
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
  await sim.click(id, uz.text.pick(1));
  await sim.click(id, uz.music.none);
}

/** Никоҳ до созданного заказа (status preview) — возвращает заказ */
export async function nikohOrder(sim: Sim, id: number, names: [string, string] = ["Азиз", "Мадина"]) {
  await nikohToReview(sim, id, names);
  await sim.click(id, uz.review.confirm);
  const [order] = await sim.repo.listOrdersByUser(id);
  return order;
}

/** Заказ → «Тўлаш» → чек фото (status receipt_sent) */
export async function nikohWithReceipt(sim: Sim, id: number, names?: [string, string]) {
  await nikohOrder(sim, id, names);
  await sim.click(id, /^💳 Тўлаш/);
  await sim.photo(id, `RECEIPT_${id}`);
  const [order] = await sim.repo.listOrdersByUser(id);
  return order;
}
