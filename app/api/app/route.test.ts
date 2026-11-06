import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signInitData } from "@/lib/tg-init-data";
import { INIT_HEADER } from "@/lib/app-auth";

// Сервис не должен вызываться: все запросы тут отбиваются раньше
vi.mock("@/bot/deps", () => ({ createBotDeps: () => { throw new Error("deps must not be created"); } }));

const TOKEN = "123456:TEST-token";
const user = JSON.stringify({ id: 42, first_name: "Апа" });
const signed = (token = TOKEN) => signInitData({ auth_date: String(Math.floor(Date.now() / 1000) - 30), user }, token);
const req = (path: string, init: RequestInit = {}) => new Request(`http://localhost${path}`, { method: "POST", ...init });

describe("API приложения: вход", () => {
  const saved = { ...process.env };
  beforeEach(() => {
    process.env.TELEGRAM_BOT_TOKEN = TOKEN;
    delete process.env.MINI_APP_ENABLED;
  });
  afterEach(() => {
    process.env = { ...saved };
  });

  it("без initData, с поддельным и с чужим токеном — 401", async () => {
    const { POST } = await import("./route");
    const { POST: UPLOAD } = await import("./upload/route");
    const forged = signed().replace(encodeURIComponent('"id":42'), encodeURIComponent('"id":7'));
    for (const header of [undefined, "", "hash=00", forged, signed("999:other")]) {
      const headers = header === undefined ? undefined : { [INIT_HEADER]: header };
      expect((await POST(req("/api/app", { headers, body: '{"action":"session"}' }))).status).toBe(401);
      expect((await UPLOAD(req("/api/app/upload?kind=photo", { headers, body: "x" }))).status).toBe(401);
    }
  });

  it("MINI_APP_ENABLED=false — 404 даже с верной подписью", async () => {
    process.env.MINI_APP_ENABLED = "false";
    const { POST } = await import("./route");
    const { POST: UPLOAD } = await import("./upload/route");
    expect((await POST(req("/api/app", { headers: { [INIT_HEADER]: signed() }, body: '{"action":"session"}' }))).status).toBe(404);
    expect((await UPLOAD(req("/api/app/upload?kind=photo", { headers: { [INIT_HEADER]: signed() }, body: "x" }))).status).toBe(404);
  });

  it("верная подпись, но кривое тело — 400/413, до базы не доходит", async () => {
    const { POST } = await import("./route");
    const headers = { [INIT_HEADER]: signed() };
    expect((await POST(req("/api/app", { headers, body: "{oops" }))).status).toBe(400);
    expect((await POST(req("/api/app", { headers, body: JSON.stringify({ action: "draft", pad: "я".repeat(40_000) }) }))).status).toBe(413);
  });
});
