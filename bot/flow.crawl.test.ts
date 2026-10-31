/**
 * Весь путь клиента: все тадбиры, тарифы и оба языка. На каждом экране нажимаем каждую кнопку
 * (и кнопки следующего экрана), присылаем неподходящие сообщения, затем идём дальше по обычному пути.
 * FakeTg отклоняет всё, что нарушает лимиты Telegram, поэтому такие ошибки здесь тоже видны.
 */
import { describe, expect, it, vi } from "vitest";
import { uz } from "@/texts/bot-uz";
import { ru } from "@/texts/bot-ru";
import type { Occasion } from "@/lib/domain";
import { formatsFor } from "./flow/util";
import type { FakeMessage } from "./testing/fake-tg";
import { inlineButtons } from "./testing/fake-tg";
import { ADMIN, Sim } from "./testing/sim";

const ID = 7;
const OCCASIONS: Occasion[] = ["nikoh", "nahorgi", "sunnat", "yubiley"];

/** Самые длинные разрешённые ответы: проверяем и лимит длины сообщений */
const MAX = { name: "Ш".repeat(40), hosts: "Х".repeat(60), venue: "В".repeat(80), address: "М".repeat(150) };

type Button = { text: string; data: string };
const callbacks = (m: FakeMessage | undefined) =>
  inlineButtons(m).filter((b): b is Button => "data" in b && !/:x$/.test(b.data));

async function explore(sim: Sim, screen: FakeMessage, depth: number, seen: Set<string>) {
  const user = (await sim.user(ID))!;
  const step = user.step;
  const state = structuredClone(user.state);
  const restore = () => sim.repo.saveStep(ID, step, structuredClone(state));
  for (const b of callbacks(screen).slice(0, depth === 2 ? 40 : 8)) {
    const key = `${depth}:${step}:${b.data.replace(/^a:\d+:/, "")}`;
    if (seen.has(key)) continue;
    seen.add(key);
    await sim.callback(ID, b.data, screen.id);
    const next = structuredClone(sim.last(ID));
    if (depth > 1 && next.id !== screen.id) await explore(sim, next, depth - 1, seen);
    await restore();
  }
}

async function wrongMessages(sim: Sim) {
  const user = (await sim.user(ID))!;
  if (user.step === "receipt") return;
  const state = structuredClone(user.state);
  const step = user.step;
  for (const send of [() => sim.text(ID, "???"), () => sim.voice(ID), () => sim.sticker(ID), () => sim.location(ID, 42.3, 69.6), () => sim.photo(ID, "P")]) {
    await send();
    await sim.repo.saveStep(ID, step, structuredClone(state));
  }
}

async function press(sim: Sim, screen: FakeMessage, label: string | RegExp) {
  const b = callbacks(screen).find((x) => (typeof label === "string" ? x.text === label : label.test(x.text)));
  if (!b) throw new Error(`Нет кнопки ${String(label)} на экране: ${screen.text.slice(0, 80)}`);
  await sim.callback(ID, b.data, screen.id);
}

async function walk(lang: "uz" | "ru", occasion: Occasion, format: "animated" | "scroll" | "simple") {
  const tx = lang === "uz" ? uz : ru;
  const sim = new Sim();
  const seen = new Set<string>();
  await sim.start(ID);
  await sim.click(ID, lang === "uz" ? uz.langUz : ru.langRu);
  await sim.text(ID, tx.menu.create);

  for (let guard = 0; guard < 60; guard++) {
    const { step } = (await sim.user(ID))!;
    if (step === "idle") break;
    const screen = structuredClone(sim.last(ID));
    await explore(sim, screen, 2, seen);
    await wrongMessages(sim);
    switch (step) {
      case "cat": await press(sim, screen, tx.category[occasion]); break;
      case "fmt": await press(sim, screen, new RegExp(tx.format.names[format])); break;
      case "catalog": await press(sim, screen, tx.catalog.buy); break;
      case "groom": case "bride": case "person": await sim.text(ID, MAX.name); break;
      case "relation": case "cause": await sim.callback(ID, callbacks(screen)[0].data, screen.id); break;
      case "age": await sim.text(ID, "60"); break;
      case "hosts": await sim.text(ID, MAX.hosts); break;
      case "sideAsk": await press(sim, screen, tx.form.sideYes); break;
      case "sideBride": await sim.text(ID, MAX.hosts); break;
      case "evDate": await press(sim, screen, "14"); break;
      case "evSameDay": await press(sim, screen, tx.event.sameDayYes); break;
      case "evTime": await sim.callback(ID, callbacks(screen)[0].data, screen.id); break;
      case "evVenue": await sim.text(ID, MAX.venue); break;
      case "evAddress": await sim.text(ID, MAX.address); break;
      case "evLoc": await press(sim, screen, tx.event.skip); break;
      case "more": await press(sim, screen, tx.event.noMore); break;
      case "text": await press(sim, screen, tx.text.pick(1)); break;
      case "music": await press(sim, screen, tx.music.none); break;
      case "review": await press(sim, screen, tx.review.confirm); break;
      default: throw new Error(`Обычный путь остановился на шаге ${step}`);
    }
  }
  expect((await sim.user(ID))!.step).toBe("idle");

  // После анкеты: заказ, оплата, подтверждение, меню и команды
  const [order] = (await sim.repo.listOrdersByUser(ID)).filter((o) => o.format === format && o.occasion === occasion);
  expect(order).toBeTruthy();
  await sim.callback(ID, `pay:${order.number}`, sim.last(ID).id);
  await sim.photo(ID, "RECEIPT");
  await sim.start(ADMIN);
  await sim.click(ADMIN, lang === "uz" ? uz.langUz : ru.langRu);
  await sim.callback(ADMIN, `ok:${order.number}`, sim.last(ADMIN).id);
  expect((await sim.repo.getOrder(order.id))!.status).toBe("active");
  await sim.callback(ID, `link:${order.number}`, sim.last(ID).id);
  for (const label of Object.values(tx.menu)) await sim.text(ID, label);
  await sim.click(ID, lang === "uz" ? uz.langUz : ru.langRu);
  for (const command of ["help", "my", "lang", "favorites", "new", "orders", "stats", "find", "dashboard", "hamkor", "nosuch"]) await sim.command(ID, command);

  const failures = sim.repo.botErrors.map((e) => `${e.step}: ${e.errorName} ${e.message}`);
  expect([...new Set(failures)]).toEqual([]);
  expect(sim.tg.messages.filter((m) => m.text === tx.error)).toEqual([]);
  return sim;
}

const cases = (["uz", "ru"] as const).flatMap((lang) =>
  OCCASIONS.flatMap((occasion) => formatsFor(occasion).map((format) => [lang, occasion, format] as const)),
);

describe("все кнопки на всём пути клиента", () => {
  it("проверяем все 4 тадбира и 3 тарифа", () => {
    expect(cases).toHaveLength(2 * 4 * 3);
  });
  it.each(cases)("%s / %s / %s", async (lang, occasion, format) => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      await walk(lang, occasion, format);
    } finally {
      log.mockRestore();
    }
  }, 120_000);
});
