/** Находки ревью бота (docs/reviews/bot-review.md): I2, I4, M1, M2, M5, M6 */
import { describe, expect, it } from "vitest";
import { uz } from "@/texts/bot-uz";
import { isMapLink } from "./parse";
import { Sim } from "./testing/sim";
import { buttonLabels } from "./testing/fake-tg";
import { nikohOrder, nikohToMusic, startUz } from "./testing/paths";

const qOf = async (sim: Sim, id: number) => Number(((await sim.user(id))?.state as { q?: number }).q ?? 0);

describe("находки ревью бота", () => {
  it("I2: песню не удалось сохранить → клиенту честно «юборинг қайта», шаг тот же, музыка не записана", async () => {
    const sim = new Sim();
    sim.deps.saveMusic = async () => {
      throw new Error("storage down");
    };
    await nikohToMusic(sim, 1);
    await sim.click(1, uz.music.own);
    await sim.audio(1, "SONG1", 3_000_000);
    expect(sim.lastText(1)).toBe(uz.music.saveFailed);
    const u = await sim.user(1);
    expect(u?.step).toBe("musicOwn");
    expect((u?.state as { music?: unknown }).music).toBeUndefined();
  });

  it("I4: обложка каталога не загрузилась → каталог текстом с теми же кнопками", async () => {
    const sim = new Sim();
    sim.tg.sendPhoto = async () => {
      throw new Error("Bad Request: wrong file identifier/HTTP URL specified");
    };
    await startUz(sim, 1);
    await sim.click(1, uz.category.nikoh);
    await sim.click(1, /Анимацияли/);
    const m = sim.last(1);
    expect(m.type).toBe("text");
    expect(m.text).toContain("№");
    expect(buttonLabels(m)).toEqual(expect.arrayContaining([uz.catalog.demo, uz.catalog.buy]));
    await sim.click(1, "▶"); // листание без фото тоже работает
    expect(buttonLabels(sim.last(1))).toContain(uz.catalog.buy);
  });

  it("M1: после «Тўлаш» номер вопроса не сбрасывается — старые кнопки не срабатывают", async () => {
    const sim = new Sim();
    await nikohOrder(sim, 1);
    const before = await qOf(sim, 1);
    await sim.click(1, /^💳 Тўлаш/);
    expect(await qOf(sim, 1)).toBeGreaterThanOrEqual(before);
  });

  it("M2: ссылка карты — только настоящие домены карт", () => {
    expect(isMapLink("https://2gis.kz/shymkent/geo/123")).toBe(true);
    expect(isMapLink("https://www.google.com/maps/place/x")).toBe(true);
    expect(isMapLink("https://maps.app.goo.gl/abc")).toBe(true);
    expect(isMapLink("https://yandex.kz/maps/-/abc")).toBe(true);
    expect(isMapLink("https://google.evil.com/maps/x")).toBe(false);
    expect(isMapLink("https://yandex.evil.ru/maps/x")).toBe(false);
    expect(isMapLink("https://2gis.kz.evil.com/x")).toBe(false);
  });

  it("M5: внутренний сбой — бот не молчит, пишет «хатолик, қайта уриниб кўринг»", async () => {
    const sim = new Sim();
    await startUz(sim, 1);
    sim.repo.listOrdersByUser = async () => {
      throw new Error("db down");
    };
    await sim.text(1, uz.menu.my);
    expect(sim.lastText(1)).toBe(uz.error);
  });

  it("M6: поддельная дата в кнопке календаря (2026-13-45) — подсказка, без сбоя", async () => {
    const sim = new Sim();
    await startUz(sim, 1);
    await sim.click(1, uz.category.nikoh);
    await sim.click(1, /Анимацияли/);
    await sim.click(1, uz.catalog.buy);
    await sim.text(1, "Азиз");
    await sim.text(1, "Мадина");
    await sim.click(1, "Фарзандларимиз");
    await sim.text(1, "Каримовлар оиласи");
    await sim.click(1, uz.form.sideNo);
    const q = await qOf(sim, 1);
    await sim.callback(1, `a:${q}:d:2026-13-45`, sim.last(1).id);
    await sim.callback(1, `a:${q}:d:2099-01-01`, sim.last(1).id); // дальше 12 месяцев
    const u = await sim.user(1);
    expect(u?.step).toBe("evDate");
    expect((u?.state as { data?: { events?: { date?: string }[] } }).data?.events?.[0]?.date).toBeUndefined();
  });
});
