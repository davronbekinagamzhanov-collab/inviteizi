import { describe, expect, it } from "vitest";
import { coverUrl } from "./flow/util";
import { Sim } from "./testing/sim";

describe("фото каталога в боте", () => {
  it("адрес обложки с ?v= — Telegram берёт новую картинку, а не старую из кэша", () => {
    const s = new Sim();
    expect(coverUrl({ deps: s.deps }, "muhr")).toMatch(/\/covers\/muhr\.jpg\?v=[0-9a-f]{10}$/);
  });
});
