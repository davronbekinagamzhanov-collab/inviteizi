import { describe, expect, it } from "vitest";
import { uz } from "@/texts/bot-uz";
import { t } from "@/texts/uz-cyrl";
import { samples } from "@/lib/samples";
import { Sim } from "./testing/sim";
import { buttonLabels } from "./testing/fake-tg";
import { nikohToText } from "./testing/paths";

describe("выбор текста приглашения (шаг 4)", () => {
  it("по 3 варианта + «Бошқа вариантлар» листает дальше по кругу", async () => {
    const sim = new Sim();
    await nikohToText(sim, 1);
    let m = sim.last(1);
    expect(buttonLabels(m)).toEqual(expect.arrayContaining([uz.text.pick(1), uz.text.pick(2), uz.text.pick(3), uz.text.more, uz.text.own]));
    expect(buttonLabels(m)).not.toContain(uz.text.pick(4));

    await sim.click(1, uz.text.more);
    m = sim.last(1);
    expect(buttonLabels(m)).toEqual(expect.arrayContaining([uz.text.pick(4), uz.text.pick(5), uz.text.pick(6)]));
    expect(buttonLabels(m)).not.toContain(uz.text.pick(1));

    await sim.click(1, uz.text.more);
    expect(buttonLabels(sim.last(1))).toEqual(expect.arrayContaining([uz.text.pick(7), uz.text.pick(8)]));

    await sim.click(1, uz.text.more); // по кругу — снова первые три
    expect(buttonLabels(sim.last(1))).toContain(uz.text.pick(1));
  });

  it("выбранный вариант со второй страницы сохраняется в заказ", async () => {
    const sim = new Sim();
    await nikohToText(sim, 1);
    await sim.click(1, uz.text.more);
    await sim.click(1, uz.text.pick(5));
    const id = t.inviteOptions(samples.nikoh)[4].id;
    const u = await sim.user(1);
    expect((u?.state as { data?: { textId?: string } }).data?.textId).toBe(id);
  });
});
