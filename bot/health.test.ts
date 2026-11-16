/** Проверка здоровья файлов и базы (cron, 17.11.2026): два сбоя подряд → сообщение, не чаще раза в час, «✅» после */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const blob = vi.hoisted(() => ({ puts: [] as string[] }));
vi.mock("@vercel/blob", () => ({
  put: vi.fn(async (pathname: string) => {
    blob.puts.push(pathname);
    return { url: `https://store1.public.blob.vercel-storage.com/${pathname}` };
  }),
  del: vi.fn(async () => undefined),
  head: vi.fn(async () => ({})),
}));

import { Sim } from "./testing/sim";
import { checkDatabase, checkFiles, memoryDbStore, type HealthIo } from "./health";
import { handleCronRequest } from "./webhook";
import { staff } from "@/texts/bot-ru";

const OWNER = 900;
const MIN = 60_000;
const N = staff.n;

/** Ответы: песня и тестовый файл Blob */
function io(state: { song: number; blob: number }): HealthIo & { urls: string[] } {
  const urls: string[] = [];
  return {
    urls,
    recipients: () => [OWNER],
    fetch: (async (u: string) => {
      urls.push(String(u));
      const status = String(u).includes("/audio/") ? state.song : state.blob;
      return new Response(status === 0 ? null : "x", { status: status || 500 });
    }) as typeof fetch,
  };
}
const texts = (sim: Sim) => sim.tg.to(OWNER).map((m) => m.text);

beforeEach(() => {
  blob.puts.length = 0;
  vi.stubEnv("BLOB_READ_WRITE_TOKEN", "vercel_blob_rw_Store1_secret");
});
afterEach(() => vi.unstubAllEnvs());

describe("файлы", () => {
  it("один сбой — тишина; два подряд — «⚠️ Файлы не открываются (код)», час молчим, потом снова; после — «✅»", async () => {
    const sim = new Sim();
    const st = { song: 206, blob: 402 };
    const h = io(st);
    await checkFiles(sim.deps, h);
    expect(texts(sim)).toEqual([]);
    sim.clock = new Date(+sim.clock + 10 * MIN);
    expect((await checkFiles(sim.deps, h)).sent).toBe(1);
    expect(texts(sim)).toEqual([N.filesDown("фото/своя песня 402")]);
    for (let i = 0; i < 5; i++) {
      sim.clock = new Date(+sim.clock + 10 * MIN);
      await checkFiles(sim.deps, h);
    }
    expect(texts(sim)).toHaveLength(1); // меньше часа — без повторов
    sim.clock = new Date(+sim.clock + 10 * MIN);
    await checkFiles(sim.deps, h);
    expect(texts(sim)).toHaveLength(2); // прошёл час — напомнили
    st.blob = 200;
    sim.clock = new Date(+sim.clock + 10 * MIN);
    await checkFiles(sim.deps, h);
    expect(texts(sim).at(-1)).toBe(N.filesUp);
    sim.clock = new Date(+sim.clock + 10 * MIN);
    await checkFiles(sim.deps, h);
    expect(texts(sim)).toHaveLength(3); // «✅» один раз
  });

  it("случайный единичный сбой — ни «⚠️», ни «✅»", async () => {
    const sim = new Sim();
    const st = { song: 0, blob: 200 };
    const h = io(st);
    await checkFiles(sim.deps, h);
    st.song = 200;
    sim.clock = new Date(+sim.clock + 10 * MIN);
    await checkFiles(sim.deps, h);
    sim.clock = new Date(+sim.clock + 10 * MIN);
    await checkFiles(sim.deps, h);
    expect(texts(sim)).toEqual([]);
  });

  it("песня с сайта не открылась — в сообщении «музыка» и код", async () => {
    const sim = new Sim();
    const h = io({ song: 404, blob: 200 });
    await checkFiles(sim.deps, h);
    sim.clock = new Date(+sim.clock + 10 * MIN);
    await checkFiles(sim.deps, h);
    expect(texts(sim)).toEqual([N.filesDown("музыка 404")]);
    expect(h.urls.some((u) => u.startsWith("https://inviteizi.vercel.app/audio/"))).toBe(true);
  });

  it("тестового файла в Blob ещё нет (404) — кладём один раз и проверяем снова", async () => {
    const sim = new Sim();
    const st = { song: 200, blob: 404 };
    const h = io(st);
    h.fetch = (async (u: string) => {
      h.urls.push(String(u));
      if (String(u).includes("/audio/")) return new Response("x", { status: 206 });
      return new Response("x", { status: blob.puts.length ? 206 : 404 });
    }) as typeof fetch;
    expect((await checkFiles(sim.deps, h)).problems).toEqual([]);
    expect(blob.puts).toEqual(["health/ping.txt"]);
  });

  it("Blob не подключён — проблема называется прямо", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
    const sim = new Sim();
    expect((await checkFiles(sim.deps, io({ song: 200, blob: 200 }))).problems).toEqual([
      "фото/своя песня: хранилище Blob не подключено",
    ]);
  });
});

describe("база", () => {
  it("не отвечает — «⚠️» раз в час; ожила — «✅» один раз", async () => {
    const sim = new Sim();
    const h = io({ song: 200, blob: 200 });
    const store = memoryDbStore();
    await store.clear();
    sim.repo.pingFails = true;
    expect(await checkDatabase(sim.deps, h, store)).toBe(false);
    expect(texts(sim)).toEqual([N.dbDown("ECONNREFUSED")]);
    sim.clock = new Date(+sim.clock + 30 * MIN);
    await checkDatabase(sim.deps, h, store);
    expect(texts(sim)).toHaveLength(1);
    sim.clock = new Date(+sim.clock + 31 * MIN);
    await checkDatabase(sim.deps, h, store);
    expect(texts(sim)).toHaveLength(2);
    sim.repo.pingFails = false;
    expect(await checkDatabase(sim.deps, h, store)).toBe(true);
    expect(texts(sim).at(-1)).toBe(N.dbUp);
    await checkDatabase(sim.deps, h, store);
    expect(texts(sim)).toHaveLength(3);
  });

  it("cron: база не отвечает → 503, остальные задания не запускаются", async () => {
    const sim = new Sim();
    await memoryDbStore().clear();
    sim.deps.health = io({ song: 200, blob: 200 });
    sim.repo.pingFails = true;
    const spy = vi.spyOn(sim.repo, "listOrdersByStatus");
    const res = await handleCronRequest(
      new Request("https://x/api/cron", { method: "POST", headers: { "x-cron-secret": "s" } }),
      {
        check: async () => true,
        getDeps: () => sim.deps,
      },
    );
    expect(res.status).toBe(503);
    expect(spy).not.toHaveBeenCalled();
  });
});
