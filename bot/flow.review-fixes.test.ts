/**
 * Находки финального ревьюера (03.11.2026) — каждая закрыта тестом:
 * 1) сумма в кнопке чека после смены формата; 2) базм при смене повода наҳорги; 3) 404 по-узбекски;
 * 4) снятый с каталога дизайн не купить; 5) тадбир прошёл — оплата не принимается;
 * + «Танлаш» в избранном во время правки меняет текущий заказ, а не создаёт второй.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { uz } from "@/texts/bot-uz";
import { PRICES, getDesign, isOnSale } from "@/templates/registry";
import { designsFor } from "./flow/util";
import { inlineButtons } from "./testing/fake-tg";
import { nikohOrder } from "./testing/paths";
import { Sim } from "./testing/sim";
import NotFound from "@/app/not-found";

// next/font работает только в сборке Next — в тесте шрифт не нужен
vi.mock("next/font/local", () => ({ default: () => ({ variable: "font" }) }));

const ID = 21;
type Button = { text: string; data?: string };
const receiptButton = (sim: Sim) =>
  sim.tg.to(ID).flatMap((m) => inlineButtons(m) as Button[]).filter((b) => b.data?.startsWith("rcpt:")).at(-1)!;

/** Правка заказа: другой формат, первый дизайн без фото клиента → «Сотиб олиш» → «Ҳаммаси тўғри» */
async function switchFormat(sim: Sim, n: number, format: "simple" | "scroll") {
  await sim.callback(ID, `edit:${n}`, sim.last(ID).id);
  await sim.click(ID, uz.review.editDesign);
  await sim.click(ID, new RegExp(uz.format.names[format]));
  const idx = designsFor("nikoh", format).findIndex((d) => !d.clientPhotos);
  for (let k = 0; k < idx; k++) await sim.click(ID, "▶");
  await sim.click(ID, uz.catalog.buy);
  await sim.click(ID, uz.review.confirm);
}

describe("находки ревьюера", () => {
  it("1. сменили формат после «Тўлаш» — старая кнопка чека показывает реквизиты с новой суммой", async () => {
    const sim = new Sim();
    const o = await nikohOrder(sim, ID);
    await sim.callback(ID, `pay:${o.number}`, sim.last(ID).id);
    const old = receiptButton(sim);
    expect(old.data).toBe(`rcpt:${o.number}:${PRICES.animated}`);
    await switchFormat(sim, o.number, "simple");
    expect((await sim.repo.getOrder(o.id))!.amount).toBe(PRICES.simple);
    await sim.callback(ID, old.data!, 1);
    // не шаг «пришлите чек» по старой сумме, а новые реквизиты
    expect(receiptButton(sim).data).toBe(`rcpt:${o.number}:${PRICES.simple}`);
    expect(sim.lastText(ID)).not.toBe(uz.pay.receiptAsk);
    // новая кнопка уже ведёт к приёму чека
    await sim.callback(ID, receiptButton(sim).data!, 1);
    expect(sim.lastText(ID)).toBe(uz.pay.receiptAsk);
  });

  it("2. наҳорги ош: повод никоҳ → суннат — «Никоҳ базми» становится «Суннат базми», дата и место те же", async () => {
    const sim = new Sim();
    const design = designsFor("nahorgi", "animated")[0];
    await sim.start(ID);
    await sim.click(ID, uz.langUz);
    const main = { ...design.sample.events[0] };
    const bazm = { ...main, kind: "nikohBazm" as const, time: "18:00" };
    await sim.repo.saveStep(ID, "cause", { q: 700, ret: "review", occasion: "nahorgi", format: design.format, templateId: design.id, data: { ...design.sample, cause: "nikoh", events: [main, bazm] } });
    await sim.callback(ID, "a:700:sunnat", 1);
    const events = ((await sim.user(ID))!.state.data as { events: { kind: string; date: string; time: string }[] }).events;
    expect(events.map((e) => e.kind)).toEqual([main.kind, "sunnatBazm"]);
    expect(events[1]).toMatchObject({ date: bazm.date, time: "18:00" });
  });

  it("3. неверная ссылка — страница по-узбекски, без английского «could not be found»", () => {
    const html = renderToStaticMarkup(createElement(NotFound));
    expect(html).toContain("Таклифнома топилмади");
    expect(html).not.toMatch(/not be found|404/);
  });

  it("4. старый черновик со снятым дизайном: заказ не создаётся, бот просит выбрать заново", async () => {
    const hidden = getDesign("islimi-varaq")!;
    expect(isOnSale(hidden.id)).toBe(false);
    const sim = new Sim();
    await sim.start(ID);
    await sim.click(ID, uz.langUz);
    await sim.repo.saveStep(ID, "review", { q: 700, occasion: hidden.occasion, format: hidden.format, templateId: hidden.id, data: { ...hidden.sample, rsvp: false } });
    const mark = sim.mark();
    await sim.callback(ID, "a:700:ok", 1);
    await sim.click(ID, uz.review.confirm).catch(() => undefined);
    expect(await sim.repo.listOrdersByUser(ID)).toHaveLength(0);
    expect(sim.textsSince(ID, mark).join("\n")).toContain(uz.order.catalogChanged);
  });

  it("5. тадбир давно прошёл — «Тўлаш» и старая кнопка чека не принимают оплату", async () => {
    const sim = new Sim();
    const o = await nikohOrder(sim, ID);
    await sim.callback(ID, `pay:${o.number}`, sim.last(ID).id);
    const old = receiptButton(sim);
    sim.advance(90 * 24 * 60);
    await sim.callback(ID, `pay:${o.number}`, 1);
    expect(sim.lastText(ID)).toBe(uz.pay.eventPassed);
    expect((inlineButtons(sim.last(ID)) as Button[]).some((b) => b.data?.startsWith("pay:"))).toBe(false);
    await sim.callback(ID, old.data!, 1);
    expect(sim.lastText(ID)).toBe(uz.pay.eventPassed);
    expect((await sim.repo.getOrder(o.id))!.status).not.toBe("receipt_sent");
  });
});

describe("избранное во время правки", () => {
  it("«Танлаш» меняет дизайн текущего заказа — второго заказа и новой ссылки нет", async () => {
    const sim = new Sim();
    const o = await nikohOrder(sim, ID);
    const fav = designsFor("nikoh", "simple").find((d) => !d.clientPhotos)!;
    await sim.callback(ID, `fav:add:${fav.id}`, 1);
    await sim.callback(ID, `edit:${o.number}`, sim.last(ID).id);
    await sim.callback(ID, `fav:choose:${fav.id}`, 1);
    await sim.click(ID, uz.catalog.buy);
    expect((await sim.user(ID))!.step).toBe("review");
    await sim.click(ID, uz.review.confirm);
    const orders = await sim.repo.listOrdersByUser(ID);
    expect(orders).toHaveLength(1);
    expect(orders[0]).toMatchObject({ id: o.id, slug: o.slug, templateId: fav.id, format: "simple", amount: PRICES.simple });
  });
});
