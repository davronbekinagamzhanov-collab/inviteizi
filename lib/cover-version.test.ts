import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { withVersion } from "./cover-version";
import { activeDesigns, coverOf, thumbOf } from "@/templates/registry";

const hash = (bytes: Buffer | string) => createHash("sha256").update(bytes).digest("hex").slice(0, 10);

describe("обложки: версия в адресе (кэш /covers — год)", () => {
  it("адрес каждой обложки в продаже содержит ?v=<хеш файла>", () => {
    for (const d of activeDesigns()) {
      for (const src of [thumbOf(d.cover), coverOf(d.cover)]) {
        const [file, v] = src.split("?v=");
        expect(v, src).toBe(hash(readFileSync(`public${file}`)));
      }
    }
  });

  it("файл изменился → адрес изменился", () => {
    const a = withVersion("/covers/x.webp", { "/covers/x.webp": hash("старая картинка") });
    const b = withVersion("/covers/x.webp", { "/covers/x.webp": hash("новая картинка") });
    expect(a).toMatch(/\?v=[0-9a-f]{10}$/);
    expect(b).not.toBe(a);
    expect(withVersion("/covers/x.webp?v=old", { "/covers/x.webp": "abc" })).toBe("/covers/x.webp?v=abc");
  });

  it("templates/cover-versions.json совпадает с файлами (сборка пересчитывает сама)", () => {
    expect(() => execFileSync("node", ["scripts/cover-versions.mjs", "--check"], { stdio: "pipe" })).not.toThrow();
  });
});
