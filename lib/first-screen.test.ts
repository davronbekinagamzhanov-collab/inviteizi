/** п.20: страницы не тянут шрифты всех дизайнов — каждый шрифт дизайна без preload (грузится, только когда нужен) */
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { expect, it } from "vitest";

it("все localFont в templates — preload: false (иначе любая страница с реестром предзагружала ~12 МБ шрифтов)", () => {
  const files = execSync("grep -rl 'localFont(' templates --include=*.ts --include=*.tsx", { encoding: "utf8" }).trim().split("\n").filter((f) => !f.includes(".test."));
  const missing = files.flatMap((f) => (readFileSync(f, "utf8").match(/localFont\(\{(?! preload: false)/g) ? [f] : []));
  expect(missing).toEqual([]);
});
