import { describe, expect, it, vi } from "vitest";
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
  it("прослушивание сохраняет Telegram cache; выбор сохраняется в заказе", async () => {
    const sim = new Sim({ music: [track("kuy", "nikoh", 1)] });
    await nikohToMusic(sim, 1);
    await sim.click(1, uz.music.fromList);
    await sim.click(1, uz.music.play("kuy"));
    expect(sim.tg.to(1).find(m => m.type === "audio")?.media).toBe("https://cdn.test/music/kuy.mp3");
    expect((await sim.repo.listMusic("nikoh"))[0].telegramFileId).toMatch(/^TGAUDIO_/);
    await sim.click(1, uz.music.choose);
    await sim.click(1, uz.review.confirm);
    expect((await sim.repo.listOrdersByUser(1))[0].music).toEqual({ kind: "list", musicId: "kuy" });
  });

  it("отсутствующий файл: явная ошибка прослушивания, без выбора и cache, можно продолжить без музыки", async () => {
    const sim = new Sim({ music: [track("missing", "nikoh", 1)] });
    await nikohToMusic(sim, 1);
    await sim.click(1, uz.music.fromList);
    vi.spyOn(sim.tg, "sendAudio").mockRejectedValue(new Error("missing audio"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      await sim.click(1, uz.music.play("missing"));
      expect(sim.tg.to(1).some(m => m.text === uz.music.previewFailed)).toBe(true);
      expect((await sim.repo.listMusic("nikoh"))[0].telegramFileId).toBeNull();
      expect((await sim.user(1))!.state.music).toBeUndefined();
      await sim.click(1, uz.back);
      await sim.click(1, uz.music.none);
      await sim.click(1, uz.review.confirm);
      expect((await sim.repo.listOrdersByUser(1))[0].music).toEqual({ kind: "none" });
    } finally { log.mockRestore(); }
  });

  it.each(["missing", "empty", "throws"])("своя музыка без доступной копии (%s) не считается сохранённой", async (failure) => {
    const sim = new Sim();
    await nikohToMusic(sim, 1);
    await sim.click(1, uz.music.own);
    sim.deps.saveMusic = failure === "missing" ? undefined : failure === "empty" ? async () => undefined : async () => { throw new Error("storage unavailable"); };
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      await sim.audio(1, "FILE", 1000);
      expect(sim.tg.to(1).some(m => m.text === uz.music.saveFailed)).toBe(true);
      expect((await sim.user(1))!.state.music).toBeUndefined();
      expect((await sim.repo.listOrdersByUser(1))).toHaveLength(0);
      // A retry with working storage still follows the original path.
      sim.deps.saveMusic = async () => "https://cdn.test/music/own/retry.mp3";
      await sim.audio(1, "FILE", 1000);
      await sim.click(1, uz.review.confirm);
      expect((await sim.repo.listOrdersByUser(1))[0].music).toMatchObject({ kind: "own", url: "https://cdn.test/music/own/retry.mp3" });
    } finally { log.mockRestore(); }
  });
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
