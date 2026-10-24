import { describe, expect, it } from "vitest";
import { uz } from "@/texts/bot-uz";
import type { MusicRecord } from "@/lib/domain";
import { Sim } from "./testing/sim";
import { buttonLabels } from "./testing/fake-tg";
import { nikohToMusic } from "./testing/paths";

const track = (id: string, occasion: MusicRecord["occasion"], sort: number): MusicRecord => ({
  id,
  titleUz: id,
  titleRu: id,
  fileUrl: `https://cdn.test/music/${id}.mp3`,
  telegramFileId: null,
  sort,
  occasion,
});

describe("музыка по тадбиру (шаг 3)", () => {
  it("список музыки — только треки тадбира заказа", async () => {
    const sim = new Sim({ music: [track("yor-yor", "nikoh", 1), track("tonggi", "nahorgi", 2), track("toy-bola", "sunnat", 3)] });
    await nikohToMusic(sim, 1);
    await sim.click(1, uz.music.fromList);
    const labels = buttonLabels(sim.last(1));
    expect(labels).toContain(uz.music.play("yor-yor"));
    expect(labels.some((l) => l.includes("tonggi") || l.includes("toy-bola"))).toBe(false);
  });

  it("у тадбира нет музыки → без пустого списка: только «Ўз қўшиғим» и «Мусиқасиз»", async () => {
    const sim = new Sim({ music: [track("tonggi", "nahorgi", 1)] });
    await nikohToMusic(sim, 1);
    const labels = buttonLabels(sim.last(1));
    expect(labels).not.toContain(uz.music.fromList);
    expect(labels).toEqual(expect.arrayContaining([uz.music.own, uz.music.none]));
  });
});
