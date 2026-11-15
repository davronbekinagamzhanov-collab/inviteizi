/** Код дизайнов вынесен из реестра: страницы получают CSS только открытого дизайна (см. design-modules.ts) */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { designs } from "./registry";
import { REVISED_DESIGNS } from "./design-version";
import { DESIGN_MODULES, LEGACY_MODULES } from "./design-modules";

describe("загрузчики дизайнов", () => {
  it("у каждого дизайна реестра есть загрузчик, лишних нет; прежние версии — ровно переработанные дизайны", () => {
    expect(Object.keys(DESIGN_MODULES).sort()).toEqual(designs.map((d) => d.id).sort());
    expect(Object.keys(LEGACY_MODULES).sort()).toEqual([...REVISED_DESIGNS].sort());
  });

  it("в реестре нет import(): иначе любая серверная страница с реестром тянет CSS и шрифты всех дизайнов", () => {
    expect(readFileSync("templates/registry.ts", "utf8")).not.toMatch(/import\(/);
  });

  it("design-loaders.tsx сгенерирован из design-modules.ts (node scripts/gen-design-loaders.mjs)", () => {
    const modules = readFileSync("templates/design-modules.ts", "utf8");
    const views = readFileSync("templates/design-loaders.tsx", "utf8");
    const pairs = (src: string) =>
      [...src.matchAll(/"?([a-z0-9-]+)"?:\s*(?:dynamic\(\s*)?\(\)\s*=>\s*import\("([^"]+)"\)/g)].map(
        (m) => `${m[1]}=${m[2]}`,
      );
    expect(pairs(views)).toEqual(pairs(modules));
    expect(pairs(views)).toHaveLength(designs.length + REVISED_DESIGNS.length);
  });
});
