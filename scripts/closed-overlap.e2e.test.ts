/**
 * Автотест наложений закрытого экрана (scripts/check-closed-overlap.mjs) в наборе vitest.
 * Нужен запущенный production-сервер, поэтому включается переменной:
 *   npm run build && INVITEIZI_CHECK=1 npx next start -p 3130
 *   OVERLAP_BASE=http://localhost:3130 npx vitest run scripts/closed-overlap.e2e.test.ts
 * (или npm run test:overlap). Без OVERLAP_BASE тест пропускается.
 */
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const base = process.env.OVERLAP_BASE;

describe.skipIf(!base)("закрытый экран: надписи и печать не налезают друг на друга", () => {
  it("все дизайны в продаже × 6 размеров окна × уз/ру × обычные и длинные имена", () => {
    const report = path.join(tmpdir(), "inviteizi-closed-overlap-vitest.json");
    const r = spawnSync(process.execPath, ["scripts/check-closed-overlap.mjs", `--base=${base}`], {
      encoding: "utf8",
      env: { ...process.env, CHECK_OVERLAP_REPORT: report },
      timeout: 3 * 60 * 60 * 1000,
    });
    const results = JSON.parse(readFileSync(report, "utf8")) as { id: string; size: string; hits: string[] }[];
    expect(results.filter((x) => x.hits.length)).toEqual([]);
    expect(r.status).toBe(0);
  }, 3 * 60 * 60 * 1000);
});
