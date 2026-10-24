import { describe, expect, it } from "vitest";
import { uz } from "@/texts/bot-uz";
import { ADMIN, Sim } from "./testing/sim";
import { nikohToReview, nikohWithReceipt } from "./testing/paths";

describe("гонки и сбои (ревью бота I1, I3)", () => {
  it("двойное «Ҳаммаси тўғри» одновременно → один заказ", async () => {
    const sim = new Sim();
    await nikohToReview(sim, 1);
    const { msg, data } = sim.findButton(1, uz.review.confirm);
    // Telegram доставляет два webhook параллельно
    await Promise.all([sim.callback(1, data, msg.id), sim.callback(1, data, msg.id)]);
    expect(await sim.repo.listOrdersByUser(1)).toHaveLength(1);
  });

  it("клиенту не удалось отправить ссылку → админу сообщение о сбое, а не «отправлено»", async () => {
    const sim = new Sim();
    await sim.start(ADMIN);
    await sim.click(ADMIN, uz.langUz);
    const o = await nikohWithReceipt(sim, 1);
    // клиент заблокировал бота: любая отправка ему падает
    const send = sim.tg.sendMessage.bind(sim.tg);
    sim.tg.sendMessage = async (chatId, text, opts) => {
      if (chatId === 1) throw new Error("Forbidden: bot was blocked by the user");
      return send(chatId, text, opts);
    };
    await sim.click(ADMIN, uz.admin.approve);
    expect((await sim.repo.getOrder(o.id))?.status).toBe("active");
    expect(sim.lastText(ADMIN)).toBe(uz.admin.approvedFailed(o.number));
  });

  it("сбой только на QR-картинке → остальное клиенту всё равно отправлено, админу «отправлено»", async () => {
    const sim = new Sim();
    await sim.start(ADMIN);
    await sim.click(ADMIN, uz.langUz);
    const o = await nikohWithReceipt(sim, 1);
    const mark = sim.mark();
    sim.tg.sendPhoto = async () => {
      throw new Error("Bad Request: wrong file");
    };
    await sim.click(ADMIN, uz.admin.approve);
    const toClient = sim.textsSince(1, mark);
    expect(toClient[0]).toBe(uz.pay.paid("https://inviteizi.vercel.app/aziz-madina"));
    expect(toClient.some((t) => t.includes("Азиз ва Мадинанинг никоҳ тўйига"))).toBe(true);
    expect(sim.lastText(ADMIN)).toBe(uz.admin.approved(o.number));
  });
});
