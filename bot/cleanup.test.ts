/** Автоочистка файлов (17.11.2026): ссылка закрылась (тадбир + 30 дней) → удалить своё фото и песню, заказ оставить */
import { expect, it } from "vitest";
import { runCron } from "./cron";
import { Sim } from "./testing/sim";
import { getDesign } from "@/templates/registry";

const S = "https://x.supabase.co/storage/v1/object/public";
const P1 = `${S}/photos/client/a.webp`,
  P2 = `${S}/photos/client/shared.webp`,
  M1 = `${S}/music/own/${"a".repeat(32)}.mp3`,
  M2 = `${S}/music/own/${"b".repeat(32)}.mp3`;

async function setup() {
  const s = new Sim();
  const removed = { photos: [] as string[], music: [] as string[] };
  s.deps.removePhotos = async (u) => void removed.photos.push(...u);
  s.deps.removeMusic = async (u) => void removed.music.push(...u);
  const d = getDesign("muhr")!;
  const make = async (date: string, photos: string[], music: string, slugBase: string) => {
    const o = await s.repo.createOrder({
      userId: 1,
      occasion: "nikoh",
      format: d.format,
      templateId: d.id,
      data: { ...d.sample, photos, events: d.sample.events.map((e) => ({ ...e, date })) },
      music: { kind: "own", fileId: "F" + slugBase, url: music, title: "Қўшиқ" },
      amount: 7990,
      slugBase,
      status: "active",
    });
    await s.repo.updateOrder(o.id, { paidAt: s.clock });
    return o;
  };
  return { s, removed, make };
}

it("через 30 дней после тадбира: своя песня и фото удалены, заказ и сумма остались; раньше — ничего", async () => {
  const { s, removed, make } = await setup();
  const o = await make("2026-11-20", [P1], M1, "old");
  s.clock = new Date("2026-12-19T12:00:00Z"); // тадбир + 29 дней
  let r = await runCron(s.deps);
  expect([r.photosRemoved, r.musicRemoved]).toEqual([0, 0]);
  s.clock = new Date("2026-12-21T12:00:00Z"); // тадбир + 31 день
  r = await runCron(s.deps);
  expect([r.photosRemoved, r.musicRemoved]).toEqual([1, 1]);
  expect(removed).toEqual({ photos: [P1], music: [M1] });
  const after = (await s.repo.getOrder(o.id))!;
  expect(after.data.photos).toEqual([]);
  expect(after.music).toMatchObject({ kind: "own", fileId: "Fold" });
  expect(after.music.kind === "own" && after.music.url).toBeFalsy();
  expect([after.status, after.amount]).toEqual(["active", 7990]);
  r = await runCron(s.deps); // повтор — ничего
  expect([r.photosRemoved, r.musicRemoved]).toEqual([0, 0]);
});

it("файл, который нужен другому (ещё живому) заказу, не удаляется", async () => {
  const { s, removed, make } = await setup();
  await make("2026-11-20", [P1, P2], M2, "old");
  await make("2027-03-01", [P2], M2, "new");
  s.clock = new Date("2026-12-21T12:00:00Z");
  await runCron(s.deps);
  expect(removed).toEqual({ photos: [P1], music: [] });
});
