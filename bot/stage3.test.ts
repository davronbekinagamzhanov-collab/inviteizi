import { staff } from "@/texts/bot-ru";
import { price } from "./flow/util";
import { describe, expect, it } from "vitest";
import { handleRsvpRequest, cleanName, RSVP_IP_HOUR_LIMIT, RSVP_ORDER_LIMIT } from "@/lib/rsvp";
import { invitationData, pageMode } from "@/lib/orders";
import { partnerSource } from "@/lib/owner-panel";
import { botLink } from "@/lib/brand";
import { PRICES } from "@/templates/registry";
import { ru } from "@/texts/bot-ru";
import { uz } from "@/texts/bot-uz";
import { runCron } from "./cron";
import { inlineButtons } from "./testing/fake-tg";
import { nikohOrder, nikohToMusic, nikohWithReceipt } from "./testing/paths";
import { ADMIN, ADMIN2, Sim } from "./testing/sim";

const prepare = async (s: Sim, id: number, lang = uz.langUz) => { await s.start(id); await s.click(id, lang); };
const approve = async (s: Sim, number: number) => s.callback(ADMIN, `ok:${number}`, 1);

function rsvpRequest(body: Record<string, unknown>, ip = "1.1.1.1", origin = "https://x.test") {
  return new Request("https://x.test/api/rsvp", { method: "POST", headers: { origin, "content-type": "application/json", "x-forwarded-for": ip }, body: JSON.stringify(body) });
}

async function rsvpOrder(s: Sim, id: number) {
  await nikohToMusic(s, id);
  await s.click(id, uz.music.none);
  await s.click(id, uz.rsvp.edit);
  expect(s.lastText(id)).toBe(uz.rsvp.ask);
  await s.click(id, uz.rsvp.yes);
  await s.click(id, uz.review.confirm);
  const [o] = await s.repo.listOrdersByUser(id);
  return o;
}

const post = (s: Sim, req: Request) => handleRsvpRequest(req, { repo: s.repo, secret: "s", isOpen: (o) => pageMode(o, s.clock) === "full" });
const answer = (slug: string, over: Record<string, unknown> = {}) => ({ slug, visitorKey: "guest-key-000000001", name: "Ойбек", guests: 3, attending: true, ...over });

describe("RSVP", () => {
  it("вопрос в анкете; Ҳа — флаг в заказе и адрес ответа на странице; Йўқ — без формы", async () => {
    const s = new Sim();
    const o = await rsvpOrder(s, 1);
    expect(o.data.rsvp).toBe(true);
    expect(invitationData(o).rsvpSlug).toBe(o.slug);
    const off = await nikohOrder(s, 2);
    expect(off.data.rsvp).toBe(false);
    expect(invitationData(off).rsvpSlug).toBeUndefined();
  });

  it("«Назад» с вопроса возвращает к сводке, правка в сводке меняет ответ", async () => {
    const s = new Sim();
    await nikohToMusic(s, 1);
    await s.click(1, uz.music.none);
    await s.click(1, uz.rsvp.edit);
    await s.click(1, uz.back);
    expect((await s.user(1))!.step).toBe("review");
    await s.click(1, uz.rsvp.edit);
    await s.click(1, uz.rsvp.no);
    expect(s.lastText(1)).toContain(uz.rsvp.reviewOff);
    await s.click(1, uz.rsvp.edit);
    await s.click(1, uz.rsvp.yes);
    expect(s.lastText(1)).toContain(uz.rsvp.reviewOn);
  });

  it("смена музыки из сводки не задаёт вопрос заново", async () => {
    const s = new Sim();
    await nikohToMusic(s, 1);
    await s.click(1, uz.music.none);
    await s.click(1, uz.rsvp.edit);
    await s.click(1, uz.rsvp.yes);
    await s.click(1, uz.review.editMusic);
    await s.click(1, uz.music.none);
    expect((await s.user(1))!.step).toBe("review");
  });

  it("гость отвечает, повтор с устройства заменяет ответ; хозяин видит список, чужой нет", async () => {
    const s = new Sim();
    await prepare(s, ADMIN);
    const o = await rsvpOrder(s, 1);
    expect((await post(s, rsvpRequest(answer(o.slug)))).status).toBe(404);
    await s.callback(1, `pay:${o.number}`, 1);
    await s.photo(1, "receipt");
    await approve(s, o.number);
    expect((await post(s, rsvpRequest(answer(o.slug)))).status).toBe(204);
    expect((await post(s, rsvpRequest(answer(o.slug, { guests: 5 })))).status).toBe(204);
    expect((await post(s, rsvpRequest(answer(o.slug, { visitorKey: "guest-key-000000002", name: "Анвар", attending: false, guests: 7 })))).status).toBe(204);
    await s.command(1, "my");
    const item = s.tg.to(1).findLast((m) => inlineButtons(m).some((b) => "data" in b && b.data === `rsvp:${o.number}`));
    expect(item).toBeTruthy();
    await s.callback(1, `rsvp:${o.number}`, 1);
    const text = s.lastText(1);
    expect(text).toContain("Ойбек — 5");
    expect(text).toContain("❌ Анвар");
    expect(text).toContain("Келади: 5 киши");
    await prepare(s, 2);
    await s.callback(2, `rsvp:${o.number}`, 1);
    expect(s.lastText(2)).toBe(uz.order.notFound);
  });

  it("спам: чужой сайт, ловушка, мусор, огромная строка, лимит IP и лимит заказа", async () => {
    const s = new Sim();
    await prepare(s, ADMIN);
    const o = await rsvpOrder(s, 1);
    await s.callback(1, `pay:${o.number}`, 1);
    await s.photo(1, "receipt");
    await approve(s, o.number);
    expect((await post(s, rsvpRequest(answer(o.slug), "1.1.1.1", "https://evil.test"))).status).toBe(400);
    expect((await post(s, rsvpRequest(answer(o.slug, { website: "http://spam" })))).status).toBe(204);
    expect(s.repo.rsvp).toEqual([]);
    for (const bad of [{ name: "" }, { name: "123" }, { name: "я".repeat(61) }, { guests: 0 }, { guests: 21 }, { guests: 1.5 }, { attending: "да" }, { visitorKey: "x" }, { slug: "../etc" }]) {
      expect((await post(s, rsvpRequest(answer(o.slug, bad)))).status).toBe(400);
    }
    expect((await post(s, rsvpRequest(answer(o.slug, { name: "я".repeat(2000) })))).status).toBe(400);
    for (let i = 0; i < RSVP_IP_HOUR_LIMIT; i++) expect((await post(s, rsvpRequest(answer(o.slug, { visitorKey: `guest-key-a${String(i).padStart(10, "0")}` })))).status).toBe(204);
    expect((await post(s, rsvpRequest(answer(o.slug, { visitorKey: "guest-key-overflow-1" })))).status).toBe(429);
    for (let i = s.repo.rsvp.length; i < RSVP_ORDER_LIMIT; i++) s.repo.rsvp.push({ ...s.repo.rsvp[0], visitorKey: `fill-${i}-00000000000`, ipHash: `other${i}` });
    expect((await post(s, rsvpRequest(answer(o.slug, { visitorKey: "guest-key-overflow-2" }), "9.9.9.9"))).status).toBe(429);
    // Большой список не должен нарушить лимит сообщения
    await s.callback(1, `rsvp:${o.number}`, 1);
    expect(s.lastText(1)).toContain("яна");
  });

  it("заказ без согласия на ответы и чужой адрес не принимают ответ одинаково", async () => {
    const s = new Sim();
    await prepare(s, ADMIN);
    const o = await nikohWithReceipt(s, 1);
    await approve(s, o.number);
    expect((await post(s, rsvpRequest(answer(o.slug)))).status).toBe(404);
    expect((await post(s, rsvpRequest(answer("netu-takogo")))).status).toBe(404);
  });

  it("имя: HTML остаётся текстом, невидимые символы убираются", () => {
    expect(cleanName("  Ой‮бек\u0000  ")).toBe("Ой бек");
    expect(cleanName("<script>alert(1)</script>")).toBe("<script>alert(1)</script>");
    expect(cleanName(42)).toBeNull();
  });
});

describe("Нарх ўзгармайди и тексты", () => {
  it("в каталоге и в сводке — цена дизайна, цифры из PRICES", async () => {
    expect(PRICES).toEqual({ animated: 8000, scroll: 6000, simple: 5000 });
    for (const [tx, lang] of [[uz, uz.langUz], [ru, ru.langRu]] as const) {
      const s = new Sim();
      await prepare(s, 1, lang);
      await s.text(1, tx.menu.create);
      await s.click(1, tx.category.nikoh);
      expect(s.lastText(1)).toMatch(/8.000 ₸/);
    }
    const s = new Sim();
    await nikohToMusic(s, 1);
    await s.click(1, uz.music.none);
    await s.click(1, uz.rsvp.edit);
    await s.click(1, uz.rsvp.no);
    expect(s.lastText(1)).toMatch(/· 8.000 ₸/);
  });

  it("текст музыки называет настоящую кнопку", () => {
    for (const tx of [uz, ru]) {
      expect(tx.music.ask).toContain(tx.music.own.replace(/^\S+\s/, ""));
      expect(tx.music.ask.length).toBeLessThan(1024);
    }
  });

  it("меню клиента содержит избранное на обоих языках, команда работает у клиента", async () => {
    expect(uz.profile.commands.favorites).toBe("Танланган дизайнлар");
    expect(ru.profile.commands.favorites).toBe("Избранные дизайны");
    const s = new Sim();
    await prepare(s, 1);
    await s.command(1, "favorites");
    expect(s.lastText(1)).toBe(uz.dashboard.favoriteEmpty);
  });

  it("ссылки бота со страницы", () => {
    expect(botLink("badge")).toBe("https://t.me/inviteizi_uz_bot?start=badge");
    expect(botLink("footer")).toBe("https://t.me/inviteizi_uz_bot?start=footer");
  });
});

describe("владелец и админы вне статистики", () => {
  it("админ проходит весь путь, подтверждает свой чек, но цифры остаются нулями", async () => {
    const s = new Sim();
    const o = await nikohWithReceipt(s, ADMIN);
    await approve(s, o.number);
    expect((await s.repo.getOrder(o.id))!.status).toBe("active");
    expect(s.tg.to(ADMIN).some((m) => m.text?.includes(`/${o.slug}`))).toBe(true);
    await s.callback(ADMIN, "fav:add:oq-ot", 1);
    await s.command(ADMIN, "dashboard");
    const screen = s.last(ADMIN);
    expect(screen.text).toContain(staff.st.none);
    await s.callback(ADMIN, "st:y:fn", screen.id);
    expect(screen.text).toContain(staff.st.none);
    await s.callback(ADMIN, "dash:orders:all", screen.id);
    expect(screen.text).toContain(uz.panel.empty);
    await s.callback(ADMIN, "dash:music:all", screen.id);
    expect(screen.text).toContain(`${uz.panel.musicNone}: 0`);
    await s.callback(ADMIN, "dash:designs:all", screen.id);
    expect(screen.text).not.toMatch(/: 1\b/);
    const stats = await s.repo.stats(s.clock);
    expect(stats.orders.total).toBe(0);
    expect(stats.revenue.total).toBe(0);
    const analytics = await s.repo.analytics(ADMIN, "all", s.clock);
    expect(analytics.revenue).toBe(0);
    expect(analytics.orders).toBe(0);
  });

  it("второй админ тоже; обычный клиент считается", async () => {
    const s = new Sim();
    const a = await nikohWithReceipt(s, ADMIN2);
    await approve(s, a.number);
    const b = await nikohWithReceipt(s, 1);
    await approve(s, b.number);
    await s.start(ADMIN);
    await s.click(ADMIN, uz.langUz);
    await s.command(ADMIN, "dashboard");
    expect(s.lastText(ADMIN)).toContain(staff.st.paid(1, price(b.amount)));
    await s.callback(ADMIN, "st:d:fn", s.last(ADMIN).id);
    expect(s.lastText(ADMIN)).toContain(staff.st.fnSamples(1, "100%"));
    expect((await s.repo.stats(s.clock)).orders.total).toBe(1);
  });

  it("партнёр: заказ админа по его ссылке не начисляется, не сообщается и не считается", async () => {
    const s = new Sim();
    const p = await s.repo.createPartner({ code: "aaaa1111", name: "П", telegramId: 50, username: null, rate: 1000 });
    await prepare(s, 50);
    await s.start(ADMIN, partnerSource("aaaa1111"));
    const o = await nikohWithReceipt(s, ADMIN);
    await approve(s, o.number);
    await runCron(s.deps);
    expect(s.repo.earnings).toEqual([]);
    expect(s.tg.to(50).some((m) => m.text?.includes("✅ +"))).toBe(false);
    await s.command(50, "hamkor");
    expect(s.lastText(50)).toContain("QR сканерлади: 0");
    expect(s.lastText(50)).not.toContain("Буюртма бошлади");
    expect(p.id).toBe(1);
  });

  it("старое начисление с заказа админа не показывается и не мешает выплате", async () => {
    const s = new Sim();
    const p = await s.repo.createPartner({ code: "aaaa1111", name: "П", telegramId: 50, username: null, rate: 1000 });
    await prepare(s, ADMIN);
    const staffOrder = await nikohWithReceipt(s, ADMIN);
    await approve(s, staffOrder.number);
    s.repo.earnings.push({ orderId: staffOrder.id, partnerId: p.id, amount: 1000, delivered: true, createdAt: s.clock });
    await s.start(1, partnerSource("aaaa1111"));
    const o = await nikohWithReceipt(s, 1);
    await approve(s, o.number);
    await s.callback(ADMIN, `dp:ok:${p.id}:2000`, 1);
    expect(s.repo.payouts).toEqual([]);
    await s.callback(ADMIN, `dp:ok:${p.id}:1000`, 1);
    expect(s.repo.payouts).toHaveLength(1);
  });
});
