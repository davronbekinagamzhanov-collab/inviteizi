import { describe, expect, it } from "vitest";
import { ru } from "@/texts/bot-ru";
import { Sim } from "./testing/sim";
import { buttonLabels } from "./testing/fake-tg";
import { startRu } from "./testing/paths";

describe("юбилей (шаг 6)", () => {
  it("весь путь на русском: имя, кем приходится, возраст, тадбир → заказ с НАМУНА", async () => {
    const sim = new Sim();
    await startRu(sim, 5);
    await sim.click(5, ru.category.yubiley);
    await sim.click(5, /Анимированное/);
    await sim.click(5, ru.catalog.buy);
    expect(sim.lastText(5)).toBe(ru.form.personYubiley);
    await sim.text(5, "Мукаррам опа");
    await sim.click(5, ru.form.relations.ona);
    expect(sim.lastText(5)).toBe(ru.form.age);
    await sim.text(5, "шестьдесят");
    expect(sim.tg.to(5).at(-2)?.text).toBe(ru.form.badAge);
    await sim.text(5, "60");
    await sim.text(5, "Фарзандлари ва набиралари");
    await sim.click(5, "5"); // 5 декабря
    await sim.click(5, "18:00");
    await sim.text(5, "«Ширин» ресторани");
    await sim.text(5, "Шымкент");
    await sim.text(5, ru.event.skip);
    await sim.click(5, ru.event.noMore);
    await sim.click(5, ru.text.pick(1));
    await sim.click(5, ru.music.none);
    await sim.click(5, ru.rsvp.no);
    expect(sim.lastText(5)).toContain(ru.review.age(60));
    await sim.click(5, ru.review.confirm);
    const [o] = await sim.repo.listOrdersByUser(5);
    expect(o).toMatchObject({ occasion: "yubiley", templateId: "pion-guldasta", status: "preview", slug: "mukarram-opa" });
    expect(o.data).toMatchObject({ person: "Мукаррам опа", relation: "ona", age: 60 });
    expect(buttonLabels(sim.last(5)).some((l) => l.startsWith("💳"))).toBe(true);
  });
});

describe("каталог для клиентов (шаг 6)", () => {
  it("в боте только принятые шаблоны, у каждого тадбира есть хотя бы один формат", async () => {
    const { designsFor, formatsFor } = await import("./flow/util");
    const { ACCEPTED, FORMATS } = await import("@/templates/registry");
    const shown = (["nikoh", "nahorgi", "sunnat", "yubiley"] as const).flatMap((o) =>
      FORMATS.flatMap((f) => designsFor(o, f).map((d) => d.id)),
    );
    expect(new Set(shown)).toEqual(ACCEPTED);
    for (const o of ["nikoh", "nahorgi", "sunnat", "yubiley"] as const) expect(formatsFor(o).length, o).toBeGreaterThan(0);
  });
});
