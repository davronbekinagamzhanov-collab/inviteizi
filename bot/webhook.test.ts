import { describe, expect, it, vi } from "vitest";
import { uz } from "@/texts/bot-uz";
import { handleCronRequest, handleWebhookRequest } from "./webhook";
import { Sim } from "./testing/sim";
import { nikohOrder } from "./testing/paths";

const SECRET = "s3cr3t-webhook";

function startUpdate(id: number, text = "/start insta") {
  return {
    update_id: 1,
    message: { message_id: 1, date: 0, chat: { id, type: "private", first_name: "Азиз" }, from: { id, is_bot: false, first_name: "Азиз" }, text },
  };
}

function req(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://inviteizi.vercel.app/api/bot", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("webhook /api/bot", () => {
  it("без секрета или с неверным — 401, бот ничего не делает", async () => {
    const sim = new Sim();
    const opts = { secret: SECRET, getDeps: () => sim.deps };
    expect((await handleWebhookRequest(req(startUpdate(1)), opts)).status).toBe(401);
    expect((await handleWebhookRequest(req(startUpdate(1), { "x-telegram-bot-api-secret-token": "wrong" }), opts)).status).toBe(401);
    expect(sim.tg.messages).toEqual([]);
  });

  it("верный секрет — 200 и обработка: /start insta → выбор языка, source сохранён", async () => {
    const sim = new Sim();
    const res = await handleWebhookRequest(req(startUpdate(7), { "x-telegram-bot-api-secret-token": SECRET }), {
      secret: SECRET,
      getDeps: () => sim.deps,
    });
    expect(res.status).toBe(200);
    expect(sim.lastText(7)).toBe(uz.chooseLang);
    expect((await sim.user(7))?.source).toBe("insta");
  });

  it("битый JSON — 400; группа — 200 без ответа", async () => {
    const sim = new Sim();
    const opts = { secret: SECRET, getDeps: () => sim.deps };
    const h = { "x-telegram-bot-api-secret-token": SECRET };
    expect((await handleWebhookRequest(req("{oops", h), opts)).status).toBe(400);
    const group = { update_id: 2, message: { message_id: 1, date: 0, chat: { id: -1, type: "group", title: "g" }, from: { id: 3, is_bot: false, first_name: "x" }, text: "hi" } };
    expect((await handleWebhookRequest(req(group, h), opts)).status).toBe(200);
    expect(sim.tg.messages).toEqual([]);
  });

  it("ошибка в логике — всё равно 200 (Telegram не будет слать повторно)", async () => {
    const sim = new Sim();
    sim.tg.sendMessage = async () => {
      throw new Error("Telegram упал");
    };
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await handleWebhookRequest(req(startUpdate(1), { "x-telegram-bot-api-secret-token": SECRET }), {
      secret: SECRET,
      getDeps: () => sim.deps,
    });
    expect(res.status).toBe(200);
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});

describe("cron /api/cron", () => {
  it("без x-cron-secret или с неверным — 401", async () => {
    const sim = new Sim();
    const check = vi.fn(async (s: string) => s === "good");
    const opts = { check, getDeps: () => sim.deps };
    expect((await handleCronRequest(req({}), opts)).status).toBe(401);
    expect(check).not.toHaveBeenCalled();
    expect((await handleCronRequest(req({}, { "x-cron-secret": "bad" }), opts)).status).toBe(401);
  });

  it("верный секрет — запускает задания и отдаёт итог", async () => {
    const sim = new Sim();
    await nikohOrder(sim, 1);
    sim.advance(181);
    const res = await handleCronRequest(req({}, { "x-cron-secret": "good" }), {
      check: async (s) => s === "good",
      getDeps: () => sim.deps,
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, clientReminded: 1, adminReminded: 0, archived: 0 });
  });
});
