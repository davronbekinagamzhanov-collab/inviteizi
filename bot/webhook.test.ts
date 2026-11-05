import { describe, expect, it, vi } from "vitest";
import { uz } from "@/texts/bot-uz";
import { handleCronRequest, handleWebhookRequest } from "./webhook";
import { Sim } from "./testing/sim";
import { nikohOrder, startUz, pickDesign } from "./testing/paths";

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

  it("временная ошибка — 503, Telegram может повторить доставку", async () => {
    const sim = new Sim();
    sim.tg.sendMessage = async () => {
      throw new Error("Telegram упал");
    };
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await handleWebhookRequest(req(startUpdate(1), { "x-telegram-bot-api-secret-token": SECRET }), {
      secret: SECRET,
      getDeps: () => sim.deps,
    });
    expect(res.status).toBe(503);
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
  it("сбой базы до обработки не подтверждает потерянное обновление",async()=>{
    const sim=new Sim(); vi.spyOn(sim.repo,"touchUser").mockRejectedValueOnce(new Error("database unavailable"));
    const opts={secret:SECRET,getDeps:()=>sim.deps},h={"x-telegram-bot-api-secret-token":SECRET};
    expect((await handleWebhookRequest(req(startUpdate(1),h),opts)).status).toBe(503);
    expect((await handleWebhookRequest(req(startUpdate(1),h),opts)).status).toBe(200);
    expect(sim.lastText(1)).toBe(uz.chooseLang);
  });
  it("потеря ответа COMMIT: повтор текста не становится ответом следующего поля",async()=>{
    const sim=new Sim(); await startUz(sim,1); await sim.click(1,uz.category.nikoh); await pickDesign(sim, 1, "animated");
    const save=sim.repo.saveStep.bind(sim.repo);
    vi.spyOn(sim.repo,"saveStep").mockImplementationOnce(async(...args)=>{await save(...args);throw new Error("lost commit acknowledgement");});
    const opts={secret:SECRET,getDeps:()=>sim.deps},h={"x-telegram-bot-api-secret-token":SECRET};
    const body={...startUpdate(1,"Азиз"),update_id:100};
    expect((await handleWebhookRequest(req(body,h),opts)).status).toBe(503);
    expect((await handleWebhookRequest(req(body,h),opts)).status).toBe(200);
    const user=(await sim.user(1))!;
    expect(user.step).toBe("bride");
    expect((user.state as {data:{bride?:string}}).data.bride).toBeUndefined();
  });
  it("null и некорректная структура — 400 без исключения",async()=>{
    const sim=new Sim();const opts={secret:SECRET,getDeps:()=>sim.deps},h={"x-telegram-bot-api-secret-token":SECRET};
    expect((await handleWebhookRequest(req(null,h),opts)).status).toBe(400);
    expect((await handleWebhookRequest(req({update_id:1,message:{}},h),opts)).status).toBe(400);
  });
  it("ошибки не выводят токены, URL файлов или Telegram ID в журнал",async()=>{
    const sim=new Sim();await sim.start(1);await sim.click(1,uz.langUz);
    vi.spyOn(sim.repo,"stats").mockRejectedValueOnce(new Error("https://api.telegram.org/file/bot111:PRIVATE_TOKEN/123456789/file"));
    const log=vi.spyOn(console,"error").mockImplementation(()=>{});
    try {
      // A direct route error uses the same protected error boundary as network/database failures.
      vi.spyOn(sim.repo,"canAnalyze").mockRejectedValueOnce(new Error("PRIVATE_TOKEN 123456789"));
      await sim.command(1,"stats");
      expect(JSON.stringify(log.mock.calls)).not.toContain("PRIVATE_TOKEN");
      expect(JSON.stringify(log.mock.calls)).not.toContain("123456789");
    } finally { log.mockRestore(); }
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
