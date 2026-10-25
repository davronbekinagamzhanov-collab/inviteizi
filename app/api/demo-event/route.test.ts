import { afterEach, it, expect, vi } from "vitest";
import { POST } from "./route";
import { demoToken } from "@/lib/demo-tracking";
const { record } = vi.hoisted(() => ({record:vi.fn().mockResolvedValue(undefined)}));
vi.mock("@/bot/repo-pg",()=>({PgRepo:class { recordEvent=record; }}));
afterEach(()=>{ vi.unstubAllEnvs(); record.mockClear(); });
const req = (body: unknown, headers: Record<string,string> = {}) => new Request("https://inviteizi.vercel.app/api/demo-event",{method:"POST",headers:{origin:"https://inviteizi.vercel.app","content-type":"application/json",...headers},body:JSON.stringify(body)});
it("preview crawlers, foreign origins and forged markers do not record views",async()=>{
  expect((await POST(req({token:"forged"}))).status).toBe(400);
  expect((await POST(req({token:"forged"},{"user-agent":"TelegramBot"}))).status).toBe(400);
  expect((await POST(req({token:"forged"},{origin:"https://attacker.test"}))).status).toBe(400);
  expect((await POST(req({token:"x".repeat(1500)}))).status).toBe(400);
  expect(record).not.toHaveBeenCalled();
});
it("valid opaque marker records only the authorized design and deterministic daily key",async()=>{
  vi.stubEnv("ANALYTICS_SIGNING_SECRET","test-secret-".repeat(4));
  const token=demoToken(1,"oq-ot",new Date());
  expect((await POST(req({token}))).status).toBe(204);
  expect(record).toHaveBeenCalledWith(1,"demo_opened","oq-ot",expect.stringMatching(/^oq-ot:\d{4}-\d{2}-\d{2}$/));
});
