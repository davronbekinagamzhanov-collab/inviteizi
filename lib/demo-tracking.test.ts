import { afterEach, it, expect, vi } from "vitest";
import { demoToken, verifyDemoToken } from "./demo-tracking";
afterEach(() => vi.unstubAllEnvs());
it("opaque demo tokens reject tampering and expire after 24 hours", () => {
  vi.stubEnv("ANALYTICS_SIGNING_SECRET","a".repeat(40));
  const now = new Date("2026-10-25T12:00:00Z");
  const token = demoToken(123456789,"oq-ot",now)!;
  expect(token).not.toContain("123456789");
  expect(verifyDemoToken(token,now)).toMatchObject({userId:123456789,template:"oq-ot"});
  expect(verifyDemoToken(`X${token.slice(1)}`,now)).toBeNull();
  expect(verifyDemoToken(token,new Date(+now+86400000))).toBeNull();
});
it("tracking stays disabled when secret is absent", () => {
  vi.stubEnv("ANALYTICS_SIGNING_SECRET","");
  expect(demoToken(1,"oq-ot",new Date())).toBeUndefined();
  expect(verifyDemoToken("anything",new Date())).toBeNull();
});
it("old and newly minted markers share the same actual-day dedupe key across midnight", () => {
  vi.stubEnv("ANALYTICS_SIGNING_SECRET","a".repeat(40));
  const before = new Date("2026-10-25T18:59:00Z");
  const after = new Date("2026-10-25T19:01:00Z");
  const old = demoToken(1,"oq-ot",before)!;
  const fresh = demoToken(1,"oq-ot",after)!;
  expect(verifyDemoToken(old,after)?.key).toBe("oq-ot:2026-10-26");
  expect(verifyDemoToken(old,after)?.key).toBe(verifyDemoToken(fresh,after)?.key);
});
