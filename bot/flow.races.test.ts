import { designName, price } from "./flow/util";
import { describe, expect, it, vi } from "vitest";
import { uz } from "@/texts/bot-uz";
import { ADMIN, Sim } from "./testing/sim";
import { nikohOrder, nikohToReview, nikohWithReceipt } from "./testing/paths";
import { pageMode } from "@/lib/orders";

describe("гонки и сбои (ревью бота I1, I3)", () => {
  it("сбой создания не расходует номер вопроса: та же кнопка повторяет сохранение", async () => {
    const sim = new Sim(); await nikohToReview(sim,1);
    const q=(await sim.user(1))!.state.q;
    const button=sim.findButton(1,uz.review.confirm);
    vi.spyOn(sim.repo,"createOrder").mockRejectedValueOnce(new Error("temporary database error"));
    await sim.callback(1,button.data,button.msg.id);
    expect((await sim.user(1))!.state.q).toBe(q);
    await sim.callback(1,button.data,button.msg.id);
    expect(await sim.repo.listOrdersByUser(1)).toHaveLength(1);
  });

  it.each(["receipt_sent","active"] as const)("устаревшая сводка не меняет данные заказа после %s",async status=>{
    const sim=new Sim(); const order=await nikohOrder(sim,1);
    await sim.click(1,uz.order.edit);
    // Model an edited draft already saved in the user's existing review state.
    const user=(await sim.user(1))!;
    const state=structuredClone(user.state) as {data:{groom:string}};
    state.data.groom="Другое имя";
    await sim.repo.saveStep(1,"review",state);
    const get=sim.repo.getOrder.bind(sim.repo);
    vi.spyOn(sim.repo,"getOrder").mockImplementationOnce(async id=>{
      const stale=await get(id);
      await sim.repo.transition(id,["preview"],status,status==="active"?{paidAt:sim.clock}:{});
      return stale;
    });
    await sim.click(1,uz.review.confirm);
    expect((await get(order.id))?.data.groom).toBe("Азиз");
    expect((await get(order.id))?.status).toBe(status);
  });

  it("истёкшее демо с чеком остаётся receipt_sent; подтверждение восстанавливает ссылку один раз",async()=>{
    const sim=new Sim(); await sim.start(ADMIN); await sim.click(ADMIN,uz.langUz);
    const order=await nikohWithReceipt(sim,1);
    sim.advance(24*60+1);
    expect(pageMode((await sim.repo.getOrder(order.id))!,sim.clock)).toBe("expired");
    expect((await sim.repo.getOrder(order.id))?.status).toBe("receipt_sent");
    await sim.callback(ADMIN,`ok:${order.number}`,1);
    await sim.callback(ADMIN,`ok:${order.number}`,1);
    const full=(await sim.repo.getOrder(order.id))!;
    expect(pageMode(full,sim.clock)).toBe("full"); expect(full.slug).toBe(order.slug);
    expect((await sim.repo.analytics(ADMIN,"all",sim.clock)).revenue).toBe(8000);
  });
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
    const photo = sim.tg.sendPhoto.bind(sim.tg);
    sim.tg.sendPhoto = async (chatId, p, opts) => {
      if (chatId === 1) throw new Error("Forbidden: bot was blocked by the user");
      return photo(chatId, p, opts);
    };
    await sim.click(ADMIN, uz.admin.approve);
    expect((await sim.repo.getOrder(o.id))?.status).toBe("active");
    expect(sim.lastText(ADMIN)).toBe(`${uz.admin.approvedFailed(o.number)}\n💳 №${o.number} · ${price(o.amount)} · ${designName(o.templateId)} · напрямую`);
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
    // QR не ушёл — то же одно сообщение текстом, с кнопкой для гостей
    expect(toClient).toEqual([uz.pay.paidPack("https://inviteizi.vercel.app/aziz-madina")]);
    expect(sim.lastText(ADMIN)).toBe(`${uz.admin.approved(o.number)}\n💳 №${o.number} · ${price(o.amount)} · ${designName(o.templateId)} · напрямую`);
  });
});
