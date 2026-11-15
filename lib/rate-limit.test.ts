import { beforeEach, expect, it } from "vitest";
import { allow, LIMITS, resetRateLimits } from "./rate-limit";

beforeEach(() => resetRateLimits());

it("пропускает до лимита в окне, дальше отказ; после окна снова можно", () => {
  const l = { max: 3, windowMs: 1000 };
  expect([allow("u1", l, 0), allow("u1", l, 10), allow("u1", l, 20), allow("u1", l, 30)]).toEqual([
    true,
    true,
    true,
    false,
  ]);
  expect(allow("u1", l, 1011)).toBe(true);
});

it("пользователи считаются отдельно", () => {
  for (let i = 0; i < LIMITS.musicUpload.max; i++) expect(allow("music:1", LIMITS.musicUpload, i)).toBe(true);
  expect(allow("music:1", LIMITS.musicUpload, 100)).toBe(false);
  expect(allow("music:2", LIMITS.musicUpload, 100)).toBe(true);
});
