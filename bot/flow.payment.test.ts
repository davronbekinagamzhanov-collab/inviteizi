import { describe, expect, it } from "vitest";
import { uz } from "@/texts/bot-uz";
import { ru } from "@/texts/bot-ru";
import { ADMIN, ADMIN2, Sim } from "./testing/sim";
import { buttonLabels, inlineButtons } from "./testing/fake-tg";
import { nikohOrder, nikohWithReceipt, startRu } from "./testing/paths";

const BASE = "https://inviteizi.vercel.app";

async function admins(sim: Sim) {
  for (const a of [ADMIN, ADMIN2]) {
    await sim.start(a);
    await sim.click(a, uz.langUz);
  }
}

describe("оплата Kaspi и чек", () => {
  it("«Тўлаш» → реквизиты, кнопка копирования номера, статус awaiting_payment", async () => {
    const sim = new Sim();
    const o = await nikohOrder(sim, 1);
    await sim.click(1, /^💳 Тўлаш/);
    const m = sim.last(1);
    expect(m.text).toMatch(/^💳 Kaspi орқали 8.000 ₸ ўтказинг:/);
    expect(m.text).toContain("📱 +7 700 000 00 00");
    expect(m.text).toContain("👤 Давронбек И.");
    expect(m.text).toContain(`#${o.number}`);
    expect(inlineButtons(m)).toEqual(
      expect.arrayContaining([
        { text: uz.pay.copy, copy: "+77000000000" },
        { text: uz.pay.sendReceipt, data: `rcpt:${o.number}` },
      ]),
    );
    expect((await sim.repo.getOrder(o.id))?.status).toBe("awaiting_payment");
    expect((await sim.user(1))?.step).toBe("receipt");
  });

  it("текст вместо чека — подсказка; фото — receipt_sent, клиенту «Текширилмоқда», админам чек с кнопками", async () => {
    const sim = new Sim();
    await admins(sim);
    const o = await nikohOrder(sim, 1);
    await sim.click(1, /^💳 Тўлаш/);
    await sim.text(1, "тўладим");
    expect(sim.tg.to(1).at(-2)?.text).toBe(uz.pay.receiptBad);
    await sim.photo(1, "PHOTO_1");
    const after = await sim.repo.getOrder(o.id);
    expect(after).toMatchObject({ status: "receipt_sent", receipt: { fileId: "PHOTO_1", kind: "photo" } });
    expect(after?.receiptAt).toEqual(sim.clock);
    expect(sim.lastText(1)).toBe(uz.pay.receiptGot);
    for (const a of [ADMIN, ADMIN2]) {
      const card = sim.last(a);
      expect(card.type).toBe("photo");
      expect(card.media).toBe("PHOTO_1");
      expect(card.text).toContain(`#${o.number}`);
      expect(card.text).toContain("Азиз ва Мадина");
      expect(card.text).toContain("@user1");
      expect(card.text).toContain("14.11.2026");
      expect(card.text).toContain(`${BASE}/aziz-madina`);
      expect(buttonLabels(card)).toEqual([uz.admin.approve, uz.admin.reject]);
    }
  });

  it("чек PDF-файлом — админу документ", async () => {
    const sim = new Sim();
    await admins(sim);
    await nikohOrder(sim, 1);
    await sim.click(1, /^💳 Тўлаш/);
    await sim.document(1, "PDF_1", "application/pdf", "kaspi.pdf");
    expect(sim.last(ADMIN)).toMatchObject({ type: "document", media: "PDF_1" });
    const [o] = await sim.repo.listOrdersByUser(1);
    expect(o.receipt).toEqual({ fileId: "PDF_1", kind: "document" });
  });

  it("чужой заказ оплатить нельзя", async () => {
    const sim = new Sim();
    const o = await nikohOrder(sim, 1);
    await sim.start(2);
    await sim.click(2, uz.langUz);
    await sim.callback(2, `pay:${o.number}`, 1);
    expect(sim.lastText(2)).toBe(uz.order.notFound);
    expect((await sim.repo.getOrder(o.id))?.status).toBe("preview");
  });
});

describe("подтверждение админом", () => {
  it("не-админ жмёт «Тасдиқлаш» → отказ, статус не меняется", async () => {
    const sim = new Sim();
    await admins(sim);
    const o = await nikohWithReceipt(sim, 1);
    const mark = sim.mark();
    await sim.callback(1, `ok:${o.number}`, sim.last(ADMIN).id);
    expect(sim.tg.answers.at(-1)).toMatchObject({ text: uz.admin.notAdmin, alert: true });
    expect((await sim.repo.getOrder(o.id))?.status).toBe("receipt_sent");
    expect(sim.textsSince(1, mark)).toEqual([]);
    await sim.callback(1, `nr:${o.number}:money`, sim.last(ADMIN).id);
    expect((await sim.repo.getOrder(o.id))?.status).toBe("receipt_sent");
  });

  it("«Тасдиқлаш» → active, клиенту ссылка, QR-картинка, текст для гостей и кнопка «Меҳмонларга юбориш»", async () => {
    const sim = new Sim();
    await admins(sim);
    const o = await nikohWithReceipt(sim, 1);
    const card = sim.last(ADMIN);
    const mark = sim.mark();
    await sim.click(ADMIN, uz.admin.approve);
    const paid = await sim.repo.getOrder(o.id);
    expect(paid?.status).toBe("active");
    expect(paid?.paidAt).toEqual(sim.clock);
    expect(paid?.expiresAt?.toISOString()).toBe("2026-12-14T18:59:59.000Z"); // 14.11 23:59:59 (+05) + 30 дней
    const url = `${BASE}/aziz-madina`;
    const toClient = sim.tg.to(1).filter((m) => m.id >= mark);
    expect(toClient.map((m) => m.type)).toEqual(["text", "photo", "text", "text", "text"]);
    expect(toClient[4].text).toBe(uz.pay.thanks);
    expect(toClient[0].text).toBe(uz.pay.paid(url));
    const png = toClient[1].media as Uint8Array;
    expect(Array.from(png.slice(1, 4))).toEqual([0x50, 0x4e, 0x47]); // «PNG»
    expect(toClient[2].text).toBe(uz.pay.shareIntro);
    expect(toClient[3].text).toContain("Азиз ва Мадинанинг никоҳ тўйига");
    expect(toClient[3].text).toContain(url);
    const share = inlineButtons(toClient[3])[0] as { text: string; url: string };
    expect(share.text).toBe(uz.pay.shareButton);
    expect(share.url.startsWith(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=`)).toBe(true);
    expect(card.markup).toBeUndefined(); // кнопки у карточки убраны
    expect(sim.lastText(ADMIN)).toBe(uz.admin.approved(o.number));
  });

  it("двойное «Тасдиқлаш» (тот же или второй админ) → клиенту одно сообщение", async () => {
    const sim = new Sim();
    await admins(sim);
    const o = await nikohWithReceipt(sim, 1);
    const mark = sim.mark();
    const card1 = sim.findButton(ADMIN, uz.admin.approve);
    const card2 = sim.findButton(ADMIN2, uz.admin.approve);
    await sim.callback(ADMIN, card1.data, card1.msg.id);
    await sim.callback(ADMIN, card1.data, card1.msg.id);
    await sim.callback(ADMIN2, card2.data, card2.msg.id, ADMIN2);
    expect(sim.tg.to(1).filter((m) => m.id >= mark && m.text === uz.pay.paid(`${BASE}/aziz-madina`))).toHaveLength(1);
    expect(sim.tg.answers.filter((a) => a.text === uz.admin.already)).toHaveLength(2);
    expect((await sim.repo.getOrder(o.id))?.status).toBe("active");
  });

  it("«Рад этиш» с причиной → клиент отправляет чек заново → снова админу", async () => {
    const sim = new Sim();
    await admins(sim);
    const o = await nikohWithReceipt(sim, 1);
    await sim.click(ADMIN, uz.admin.reject);
    expect(buttonLabels(sim.findButton(ADMIN, uz.admin.reasons.money).msg)).toEqual([
      uz.admin.reasons.money,
      uz.admin.reasons.sum,
      uz.admin.reasons.other,
    ]);
    expect((await sim.repo.getOrder(o.id))?.status).toBe("receipt_sent"); // пока причину не выбрали
    await sim.click(ADMIN, uz.admin.reasons.money);
    expect(await sim.repo.getOrder(o.id)).toMatchObject({ status: "rejected", rejectReason: "Пул келмади" });
    expect(sim.lastText(1)).toBe(uz.pay.rejected(o.number, "Пул келмади"));
    expect(sim.lastText(ADMIN)).toBe(uz.admin.rejectedDone(o.number, "Пул келмади"));

    await sim.click(1, uz.pay.resend);
    expect(sim.lastText(1)).toBe(uz.pay.receiptAsk);
    await sim.photo(1, "PHOTO_2");
    expect(await sim.repo.getOrder(o.id)).toMatchObject({ status: "receipt_sent", receipt: { fileId: "PHOTO_2" }, rejectReason: null });
    const cards = sim.tg.to(ADMIN).filter((m) => m.type === "photo");
    expect(cards.map((m) => m.media)).toEqual([`RECEIPT_1`, "PHOTO_2"]);
    expect(buttonLabels(cards[1])).toEqual([uz.admin.approve, uz.admin.reject]);
    await sim.click(ADMIN, uz.admin.approve);
    expect((await sim.repo.getOrder(o.id))?.status).toBe("active");
  });

  it("причина отказа клиенту — на его языке", async () => {
    const sim = new Sim();
    await admins(sim);
    await startRu(sim, 2);
    await sim.click(2, ru.category.nikoh);
    await sim.click(2, /Анимированное/);
    await sim.click(2, ru.catalog.buy);
    await sim.text(2, "Азиз");
    await sim.text(2, "Мадина");
    await sim.click(2, "Наших детей");
    await sim.text(2, "Каримовлар оиласи");
    await sim.click(2, ru.form.sideNo);
    await sim.click(2, "14");
    await sim.click(2, "18:00");
    await sim.text(2, "Тўйхона");
    await sim.text(2, "Манзил");
    await sim.text(2, ru.event.skip);
    await sim.click(2, ru.event.noMore);
    await sim.click(2, ru.text.pick(1));
    await sim.click(2, ru.music.none);
    await sim.click(2, ru.rsvp.no);
    await sim.click(2, ru.review.confirm);
    await sim.click(2, /^💳 Оплатить/);
    await sim.photo(2, "P");
    await sim.click(ADMIN, uz.admin.reject);
    await sim.click(ADMIN, uz.admin.reasons.sum);
    const [o] = await sim.repo.listOrdersByUser(2);
    expect(sim.lastText(2)).toBe(ru.pay.rejected(o.number, "Неверная сумма"));
    expect(buttonLabels(sim.last(2))).toContain(ru.pay.resend);
  });
});

describe("мои приглашения, правка, ссылка", () => {
  it("пусто — подсказка", async () => {
    const sim = new Sim();
    await sim.start(1);
    await sim.click(1, uz.langUz);
    await sim.text(1, uz.menu.my);
    expect(sim.lastText(1)).toBe(uz.my.empty);
  });

  it("список: ссылка, статус, кнопки; оплаченный — без «Тўлаш»", async () => {
    const sim = new Sim();
    await admins(sim);
    const paid = await nikohWithReceipt(sim, 1);
    await sim.click(ADMIN, uz.admin.approve);
    await nikohOrder(sim, 1, ["Жасур", "Нилуфар"]);
    const mark = sim.mark();
    await sim.command(1, "my");
    const items = sim.tg.to(1).filter((m) => m.id >= mark);
    expect(items).toHaveLength(2);
    const [fresh, old] = items;
    expect(fresh.text).toContain(`${BASE}/jasur-nilufar`);
    expect(fresh.text).toContain(uz.my.statuses.preview);
    expect(buttonLabels(fresh).some((l) => l.startsWith("💳"))).toBe(true);
    expect(old.text).toContain(`#${paid.number}`);
    expect(old.text).toContain(uz.my.statuses.active);
    expect(buttonLabels(old).some((l) => l.startsWith("💳"))).toBe(false);
    expect(buttonLabels(old)).toEqual([uz.my.link, uz.contact]); // заказ закрыт: правки только через владельца
    expect(inlineButtons(old).find((b) => b.text === uz.contact)).toEqual({ text: uz.contact, url: "https://t.me/inviteizi_owner" });
  });

  it("правка неоплаченного: смена дизайна сохраняет формат и согласованную сумму, slug тот же", async () => {
    const sim = new Sim();
    const o = await nikohOrder(sim, 1);
    await sim.click(1, uz.order.edit);
    await sim.click(1, uz.review.editDesign);
    await sim.click(1, "▶");
    await sim.click(1, uz.catalog.buy);
    expect(sim.lastText(1)).toContain("Дизайн: №61 Ганч пештоқ");
    await sim.click(1, uz.review.confirm);
    expect(await sim.repo.getOrder(o.id)).toMatchObject({ slug: "aziz-madina", format: "animated", amount: 8_000, templateId: "ganch-peshtoq" });
    expect(buttonLabels(sim.last(1)).some((l) => /^💳 Тўлаш — 8.000 ₸$/.test(l))).toBe(true);
  });

  it("правка тадбира из сводки: время", async () => {
    const sim = new Sim();
    const o = await nikohOrder(sim, 1);
    await sim.click(1, uz.order.edit);
    await sim.click(1, uz.review.editEvent(1, "Никоҳ базми"));
    expect(sim.lastText(1)).toBe(uz.review.eventMenu("Никоҳ базми"));
    await sim.click(1, uz.review.evTime);
    await sim.click(1, "19:00");
    expect(sim.lastText(1)).toContain("14.11.2026, 19:00");
    await sim.click(1, uz.review.confirm);
    expect((await sim.repo.getOrder(o.id))?.data.events[0].time).toBe("19:00");
  });


});

describe("команды админа", () => {
  it("/orders, /stats, /find — только админу", async () => {
    const sim = new Sim();
    await admins(sim);
    const o = await nikohWithReceipt(sim, 1);
    const mark = sim.mark();
    await sim.command(ADMIN, "orders");
    const out = sim.textsSince(ADMIN, mark);
    expect(out[0]).toBe(uz.admin.ordersWaiting);
    expect(out[1]).toContain(`#${o.number} · Азиз ва Мадина`);
    expect(buttonLabels(sim.findButton(ADMIN, uz.admin.approve).msg)).toEqual([uz.admin.approve, uz.admin.reject]);

    await sim.command(ADMIN, "stats");
    expect(sim.lastText(ADMIN)).toContain("📊");
    expect(sim.lastText(ADMIN)).toContain("бугун 1");

    await sim.command(ADMIN, "find", "мадина");
    expect(sim.lastText(ADMIN)).toContain(`#${o.number}`);
    await sim.command(ADMIN, "find", "йўқ-нарса");
    expect(sim.lastText(ADMIN)).toBe(uz.admin.findNone);

    await sim.command(1, "orders");
    expect(sim.lastText(1)).toContain(uz.unknown);
    await sim.command(1, "stats");
    expect(sim.lastText(1)).toContain(uz.unknown);
  });

  it("после выдачи ссылки заказ закрыт: «Ўзгартириш» нет, поддельная кнопка правки — отказ и «Боғланиш»", async () => {
    const sim = new Sim();
    await admins(sim);
    const o = await nikohWithReceipt(sim, 1);
    await sim.click(ADMIN, uz.admin.approve);
    await sim.callback(1, `edit:${o.number}`, 1);
    expect(sim.lastText(1)).toBe(uz.order.closed);
    expect(inlineButtons(sim.last(1))).toEqual([{ text: uz.contact, url: "https://t.me/inviteizi_owner" }]);
    expect((await sim.user(1))?.step).toBe("idle");
    expect((await sim.repo.getOrder(o.id))?.data.groom).toBe("Азиз");
  });

  it("пока чек на проверке — правки нет, повторный чек не создаёт заказ", async () => {
    const sim = new Sim();
    await admins(sim);
    const o = await nikohWithReceipt(sim, 1);
    await sim.callback(1, `edit:${o.number}`, 1);
    expect(sim.lastText(1)).toBe(uz.pay.waiting);
    await sim.photo(1, "RECEIPT_2");
    expect(await sim.repo.listOrdersByUser(1)).toHaveLength(1);
    expect((await sim.repo.getOrder(o.id))?.status).toBe("receipt_sent");
  });

  it("смены ссылки клиентом больше нет: старая кнопка не срабатывает", async () => {
    const sim = new Sim();
    const o = await nikohOrder(sim, 1);
    await sim.callback(1, `slug:${o.number}`, 1);
    expect((await sim.repo.getOrder(o.id))?.slug).toBe("aziz-madina");
    expect(sim.tg.answers.at(-1)?.text).toBe(uz.oldButton);
  });

  it("«🔗 Ҳавола» у оплаченного — ссылка, QR и текст для гостей заново", async () => {
    const sim = new Sim();
    await admins(sim);
    await nikohWithReceipt(sim, 1);
    await sim.click(ADMIN, uz.admin.approve);
    await sim.text(1, uz.menu.my);
    const mark = sim.mark();
    await sim.click(1, uz.my.link);
    const toClient = sim.tg.to(1).filter((m) => m.id >= mark);
    expect(toClient.map((m) => m.type)).toEqual(["text", "photo", "text", "text"]);
    expect(toClient[0].text).toBe(uz.pay.paid(`${BASE}/aziz-madina`));
  });

  it("после оплаты — спасибо и одна кнопка «🆕 Янги таклифнома»: новый заказ с нуля", async () => {
    const sim = new Sim();
    await admins(sim);
    await nikohWithReceipt(sim, 1);
    await sim.click(ADMIN, uz.admin.approve);
    const last = sim.last(1);
    expect(last.text).toBe(uz.pay.thanks);
    expect(buttonLabels(last)).toEqual([uz.pay.newOrder]);
    await sim.click(1, uz.pay.newOrder);
    expect(sim.lastText(1)).toBe(uz.category.ask);
    const u = await sim.user(1);
    expect(u?.step).toBe("cat");
    expect((u?.state as { data?: unknown; orderId?: string }).data).toBeUndefined();
    expect((u?.state as { orderId?: string }).orderId).toBeUndefined();
  });
});
