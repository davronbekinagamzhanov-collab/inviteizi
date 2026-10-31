import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { checkPagesAllowed } from "./check-pages";

describe("/dev/invitation закрыта на Vercel", () => {
  it("Vercel: закрыта в любом окружении, даже с INVITEIZI_CHECK", () => {
    for (const NODE_ENV of ["production", "development"]) {
      expect(checkPagesAllowed({ NODE_ENV, VERCEL: "1", INVITEIZI_CHECK: "1" })).toBe(false);
      expect(checkPagesAllowed({ NODE_ENV, VERCEL_ENV: "production", INVITEIZI_CHECK: "1" })).toBe(false);
      expect(checkPagesAllowed({ NODE_ENV, VERCEL_ENV: "preview", INVITEIZI_CHECK: "1" })).toBe(false);
    }
  });

  it("локально: разработка открыта, сборка только с INVITEIZI_CHECK=1", () => {
    expect(checkPagesAllowed({ NODE_ENV: "development" })).toBe(true);
    expect(checkPagesAllowed({ NODE_ENV: "production", INVITEIZI_CHECK: "1" })).toBe(true);
    expect(checkPagesAllowed({ NODE_ENV: "production" })).toBe(false);
    expect(checkPagesAllowed({ NODE_ENV: "production", INVITEIZI_CHECK: "true" })).toBe(false);
  });

  it("страница проверяет это и при сборке (до Suspense), и при показе", () => {
    const page = readFileSync("app/dev/invitation/[template]/page.tsx", "utf8");
    const guard = "if (!checkPagesAllowed()) notFound();";
    expect(page.split(guard)).toHaveLength(3);
    expect(page.lastIndexOf(guard)).toBeLessThan(page.indexOf("<Suspense"));
    expect(page.indexOf(guard)).toBeLessThan(page.indexOf("await params"));
  });
});
