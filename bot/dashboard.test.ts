import { describe, expect, it } from "vitest";
import { ru } from "@/texts/bot-ru";
import { uz } from "@/texts/bot-uz";
import { activeDesigns, DESIGN_STYLES } from "@/templates/registry";
import { partnerSource } from "@/lib/owner-panel";
import { runCron } from "./cron";
import { newPartnerCode, parseContact } from "./flow/partners";
import { price } from "./flow/util";
import { inlineButtons } from "./testing/fake-tg";
import { nikohToMusic, nikohWithReceipt } from "./testing/paths";
import { ADMIN, ADMIN2, Sim } from "./testing/sim";

const prepare = async (s: Sim, id: number, lang = uz.langUz) => { await s.start(id); await s.click(id, lang); };
const open = async (s: Sim, id = ADMIN) => { await prepare(s, id); await s.command(id, "dashboard"); return s.last(id); };

async function paidOrder(s: Sim, id: number, fromPartner?: string) {
  if (fromPartner) await s.start(id, partnerSource(fromPartner));
  const o = await nikohWithReceipt(s, id);
  await s.callback(ADMIN, `ok:${o.number}`, 1);
  return o;
}

async function addPartner(s: Sim, code: string, fields: { telegramId?: number | null; username?: string | null; rate?: number } = {}) {
  return s.repo.createPartner({ code, name: `Ҳамкор ${code}`, telegramId: fields.telegramId ?? null, username: fields.username ?? null, rate: fields.rate ?? 1000 });
}

describe("права на панель", () => {
  it("клиент: ни команда, ни поддельные кнопки не показывают данные", async () => {
    const s = new Sim(); await prepare(s, 1);
    await addPartner(s, "aaaa1111", { telegramId: 50 });
    await s.command(1, "dashboard");
    expect(s.lastText(1)).toBe(uz.dashboard.denied);
    for (const data of ["dash:general:all", "dash:orders:all:0:p", "dash:partners:all", "dash:partners:all:1", "dp:new", "dp:qr:1", "dp:rate:1", "dp:pay:1:1000", "dp:ok:1:1000"]) {
      await s.callback(1, data, 1);
      expect(s.lastText(1)).toBe(uz.dashboard.denied);
    }
    expect((await s.user(1))!.step).not.toMatch(/^partner/);
    expect(s.repo.payouts).toEqual([]);
  });

  it("в группе панель не открывается даже у админа", async () => {
    const s = new Sim(); await prepare(s, ADMIN);
    await s.callback(ADMIN, "dash:general:all", 1, -100123);
    expect(s.lastText(-100123)).toBe(uz.dashboard.denied);
  });

  it("второй админ видит панель", async () => {
    const s = new Sim();
    expect((await open(s, ADMIN2)).text).toContain(uz.panel.labels.paid);
  });

  it("партнёр не админ: панель закрыта, /hamkor только его цифры", async () => {
    const s = new Sim();
    await addPartner(s, "aaaa1111", { telegramId: 50 });
    await addPartner(s, "bbbb2222", { telegramId: 60 });
    await prepare(s, ADMIN);
    await paidOrder(s, 1, "aaaa1111");
    await paidOrder(s, 2, "bbbb2222");
    await paidOrder(s, 3, "bbbb2222");
    await prepare(s, 50);
    await s.command(50, "dashboard");
    expect(s.lastText(50)).toBe(uz.dashboard.denied);
    await s.command(50, "hamkor");
    const text = s.lastText(50);
    expect(text).toContain("Тўлади: 1");
    expect(text).toContain("start=p_aaaa1111");
    expect(text).not.toContain("bbbb2222");
    expect(text).not.toContain("Клиент");
  });

  it("/hamkor у обычного клиента не показывает цифр", async () => {
    const s = new Sim(); await prepare(s, 1);
    await s.command(1, "hamkor");
    expect(s.lastText(1)).not.toContain("Сканерлади");
  });
});

describe("одно сообщение", () => {
  it("все разделы и периоды меняют одно сообщение, картинок и потока нет", async () => {
    const s = new Sim();
    await prepare(s, ADMIN);
    await paidOrder(s, 1);
    await s.command(ADMIN, "dashboard");
    const screen = s.last(ADMIN);
    const count = s.tg.to(ADMIN).length;
    for (const view of ["general", "revenue", "orders", "designs", "partners", "music"] as const) {
      for (const period of ["today", "week", "month", "all"] as const) {
        await s.callback(ADMIN, `dash:${view}:${period}`, screen.id);
        expect(screen.text).toContain(uz.panel.views[view]);
        expect(screen.text).toContain(uz.panel.periods[period]);
      }
    }
    expect(s.tg.to(ADMIN).length).toBe(count);
    expect(s.tg.to(ADMIN).some((m) => m.text?.includes("undefined"))).toBe(false);
  });

  it("русский язык тоже показывает разделы", async () => {
    const s = new Sim();
    await prepare(s, ADMIN, ru.langRu);
    await s.command(ADMIN, "dashboard");
    expect(s.lastText(ADMIN)).toContain(ru.panel.labels.created);
  });
});

describe("расчёты", () => {
  it("созданные и оплаченные не смешиваются, выручка только с подтверждённых", async () => {
    const s = new Sim();
    await prepare(s, ADMIN);
    await paidOrder(s, 1);
    await nikohWithReceipt(s, 2);
    await nikohToMusic(s, 3);
    await s.command(ADMIN, "dashboard");
    const text = s.lastText(ADMIN);
    expect(text).toContain(`${uz.panel.labels.created}: 2`);
    expect(text).toContain(`${uz.panel.labels.paid}: 1`);
    expect(text).toMatch(new RegExp(`${uz.panel.labels.revenue}: 8.000 ₸`));
    expect(text).toMatch(new RegExp(`${uz.panel.labels.average}: 8.000 ₸`));
    expect(text).toContain(`${uz.panel.labels.waiting}: 1`);
  });

  it("период: граница суток по Алматы, оплата считается по дате оплаты", async () => {
    const s = new Sim({ now: "2026-11-01T07:00:00Z" });
    await prepare(s, ADMIN);
    const o = await nikohWithReceipt(s, 1);
    s.clock = new Date("2026-11-08T18:59:00Z"); // 8 ноября 23:59 в Алматы
    await s.callback(ADMIN, `ok:${o.number}`, 1);
    s.clock = new Date("2026-11-08T19:01:00Z"); // уже 9 ноября
    await s.command(ADMIN, "dashboard");
    const screen = s.last(ADMIN);
    await s.callback(ADMIN, "dash:general:today", screen.id);
    expect(screen.text).toContain(`${uz.panel.labels.paid}: 0`);
    await s.callback(ADMIN, "dash:general:week", screen.id);
    expect(screen.text).toContain(`${uz.panel.labels.paid}: 1`);
    expect(screen.text).toContain(`${uz.panel.labels.created}: 0`);
    await s.callback(ADMIN, "dash:general:all", screen.id);
    expect(screen.text).toContain(`${uz.panel.labels.created}: 1`);
  });

  it("доход: все тарифы и тадбиры с нулями", async () => {
    const s = new Sim();
    await prepare(s, ADMIN);
    await paidOrder(s, 1);
    await s.command(ADMIN, "dashboard");
    const screen = s.last(ADMIN);
    await s.callback(ADMIN, "dash:revenue:all", screen.id);
    for (const name of Object.values(uz.format.names)) expect(screen.text).toContain(name);
    for (const name of [uz.category.nikoh, uz.category.nahorgi, uz.category.sunnat, uz.category.yubiley]) expect(screen.text).toContain(name);
    expect(screen.text).toContain(`${uz.format.names.animated} (${price(8000)}): 1 · ${price(8000)}`);
    expect(screen.text).toMatch(/: 0 · 0 ₸/);
  });

  it("заказы: постранично, время Алматы, фильтр оплаченных", async () => {
    const s = new Sim({ now: "2026-11-01T19:30:00Z" }); // 2 ноября 00:30 в Алматы
    await prepare(s, ADMIN);
    const first = await paidOrder(s, 1);
    for (let id = 2; id <= 10; id++) await nikohWithReceipt(s, id);
    await s.command(ADMIN, "dashboard");
    const screen = s.last(ADMIN);
    await s.callback(ADMIN, "dash:orders:all", screen.id);
    expect(screen.text).toContain("02.11 00:30");
    expect(inlineButtons(screen).map((b) => b.text)).toContain("1/2");
    const next = inlineButtons(screen).find((b) => b.text === "▶") as { data: string };
    await s.callback(ADMIN, next.data, screen.id);
    expect(screen.text).toContain(`#${first.number} `);
    await s.callback(ADMIN, "dash:orders:all:0:p", screen.id);
    expect(screen.text).toContain(`#${first.number} · @user1 ·`);
    expect(screen.text).not.toContain("@user10");
  });

  it("музыка: из списка, своя, без музыки", async () => {
    const s = new Sim();
    await prepare(s, ADMIN);
    await paidOrder(s, 1);
    await s.command(ADMIN, "dashboard");
    const screen = s.last(ADMIN);
    await s.callback(ADMIN, "dash:music:all", screen.id);
    const m = await s.repo.panelSnapshot();
    const kind = m.orders[0].musicKind;
    const label = { list: uz.panel.musicList, own: uz.panel.musicOwn, none: uz.panel.musicNone }[kind];
    expect(screen.text).toContain(`${label}: 1`);
  });
});

describe("дизайны", () => {
  it("у каждого активного дизайна есть стиль", () => {
    for (const d of activeDesigns()) expect(DESIGN_STYLES).toContain(d.style);
  });

  it("тип → стиль → топ дизайнов с окном демо", async () => {
    const s = new Sim();
    await prepare(s, ADMIN);
    const o = await paidOrder(s, 1);
    const d = activeDesigns().find((x) => x.id === o.templateId)!;
    await s.command(ADMIN, "dashboard");
    const screen = s.last(ADMIN);
    await s.callback(ADMIN, "dash:designs:all", screen.id);
    expect(screen.text).toContain(`${uz.format.names[d.format]}: 1`);
    await s.callback(ADMIN, `dash:designs:all:${d.format}`, screen.id);
    expect(screen.text).toContain(`${uz.panel.styles[d.style]} — 1`);
    await s.callback(ADMIN, `dash:designs:all:${d.format}:${d.style}`, screen.id);
    expect(screen.text).toMatch(new RegExp(`1\\. №${d.number} .* — 1`));
    const demo = inlineButtons(screen).find((b) => "webApp" in b) as { webApp: string };
    expect(demo.webApp).toContain(`/demo/${d.id}`);
  });
});

describe("партнёры", () => {
  const code = "aaaa1111";

  it("добавление: имя, контакт, ставка по умолчанию, ссылка и QR", async () => {
    const s = new Sim();
    await open(s);
    await s.callback(ADMIN, "dp:new", s.last(ADMIN).id);
    expect(s.lastText(ADMIN)).toBe(uz.panel.partner.askName);
    await s.text(ADMIN, "Ойбек");
    await s.text(ADMIN, "кирил");
    expect(s.tg.to(ADMIN).some((m) => m.text === uz.panel.partner.badContact)).toBe(true);
    await s.text(ADMIN, "@oybek_uz");
    await s.click(ADMIN, /1.000 ₸/);
    const [p] = s.repo.partners;
    expect(p).toMatchObject({ name: "Ойбек", username: "oybek_uz", telegramId: null, rate: 1000 });
    expect(s.last(ADMIN).text).toContain(`https://t.me/inviteizi_test_bot?start=p_${p.code}`);
    expect((await s.user(ADMIN))!.step).toBe("idle");
  });

  it("смена ставки действует только на будущие оплаты", async () => {
    const s = new Sim();
    await open(s);
    await s.callback(ADMIN, "dp:new", s.last(ADMIN).id);
    await s.text(ADMIN, "Ойбек");
    await s.text(ADMIN, "123456789");
    await s.text(ADMIN, "много");
    expect(s.tg.to(ADMIN).some((m) => m.text === uz.panel.partner.badRate)).toBe(true);
    await s.text(ADMIN, "1500");
    const [p] = s.repo.partners;
    expect(p).toMatchObject({ telegramId: 123456789, rate: 1500 });
    await paidOrder(s, 1, p.code);
    await s.callback(ADMIN, `dp:rate:${p.id}`, 1);
    await s.text(ADMIN, "2000");
    await paidOrder(s, 2, p.code);
    expect(s.repo.earnings.map((e) => e.amount)).toEqual([1500, 2000]);
  });

  it("повторный /start с другим кодом не меняет первый источник", async () => {
    const s = new Sim();
    await addPartner(s, code, { telegramId: 50 });
    await addPartner(s, "bbbb2222", { telegramId: 60 });
    await prepare(s, ADMIN);
    await s.start(1, partnerSource(code));
    await s.start(1, "p_bbbb2222");
    await s.start(1);
    expect((await s.user(1))!.source).toBe(`p_${code}`);
    await paidOrder(s, 1);
    expect(s.repo.earnings).toMatchObject([{ partnerId: 1, amount: 1000 }]);
  });

  it("пришёл без кода, потом открыл ссылку партнёра: не засчитывается", async () => {
    const s = new Sim();
    await addPartner(s, code, { telegramId: 50 });
    await prepare(s, ADMIN);
    await s.start(1);
    await paidOrder(s, 1, code);
    expect(s.repo.earnings).toEqual([]);
  });

  it("сообщение партнёру только после подтверждения оплаты, один раз", async () => {
    const s = new Sim();
    await addPartner(s, code, { telegramId: 50 });
    await prepare(s, ADMIN);
    await prepare(s, 50);
    await s.start(1, partnerSource(code));
    const o = await nikohWithReceipt(s, 1);
    const isNotice = (m: { text?: string }) => m.text?.startsWith("Сизнинг кодингиз орқали янги буюртма тўланди ✅ +1");
    expect(s.tg.to(50).some(isNotice)).toBe(false);
    await s.callback(ADMIN, `ok:${o.number}`, 1);
    await s.callback(ADMIN, `ok:${o.number}`, 1);
    expect(s.tg.to(50).filter(isNotice)).toHaveLength(1);
    expect(s.repo.earnings).toMatchObject([{ delivered: true, amount: 1000 }]);
  });

  it("партнёр не нажимал /start: тихо пропускаем и показываем отметку", async () => {
    const s = new Sim();
    const p = await addPartner(s, code, { username: "nobody_here" });
    await prepare(s, ADMIN);
    await paidOrder(s, 1, code);
    expect(s.repo.earnings).toMatchObject([{ delivered: false }]);
    await s.command(ADMIN, "dashboard");
    const screen = s.last(ADMIN);
    await s.callback(ADMIN, `dash:partners:all:${p.id}`, screen.id);
    expect(screen.text).toContain(uz.panel.partner.undelivered(1));
  });

  it("партнёр найден по username после /start", async () => {
    const s = new Sim();
    await addPartner(s, code, { username: "USER50" });
    await prepare(s, ADMIN);
    await prepare(s, 50);
    await paidOrder(s, 1, code);
    expect(s.tg.to(50).some((m) => m.text?.includes("✅ +1"))).toBe(true);
    await s.command(50, "hamkor");
    expect(s.lastText(50)).toContain("Тўлади: 1");
    expect(s.repo.partners[0].telegramId).toBe(50);
  });

  it("сам партнёр по своей ссылке: начисления нет", async () => {
    const s = new Sim();
    await addPartner(s, code, { telegramId: 1 });
    await prepare(s, ADMIN);
    await paidOrder(s, 1, code);
    expect(s.repo.earnings).toEqual([]);
  });

  it("сбой партнёрской части не мешает оплате; cron начисляет позже", async () => {
    const s = new Sim();
    await addPartner(s, code, { telegramId: 50 });
    await prepare(s, ADMIN);
    const real = s.repo.creditPartnerOrder.bind(s.repo);
    s.repo.creditPartnerOrder = async () => { throw new Error("temporary"); };
    const log = console.error; console.error = () => {};
    let order;
    try {
      order = await paidOrder(s, 1, code);
    } finally { console.error = log; }
    expect((await s.repo.getOrder(order.id))!.status).toBe("active");
    expect(s.repo.earnings).toEqual([]);
    s.repo.creditPartnerOrder = real;
    await runCron(s.deps);
    expect(s.repo.earnings).toHaveLength(1);
  });

  it("счётчики и выплата: повторное нажатие не выплачивает дважды", async () => {
    const s = new Sim();
    const p = await addPartner(s, code, { telegramId: 50, rate: 1000 });
    await prepare(s, ADMIN);
    await paidOrder(s, 1, code);
    await paidOrder(s, 2, code);
    await s.start(3, partnerSource(code));
    await s.command(ADMIN, "dashboard");
    const screen = s.last(ADMIN);
    await s.callback(ADMIN, `dash:partners:all:${p.id}`, screen.id);
    for (const part of [`${uz.panel.partner.scanned}: 3`, `${uz.panel.partner.started}: 2`, `${uz.panel.partner.paid}: 2`]) expect(screen.text).toContain(part);
    await s.callback(ADMIN, `dp:pay:${p.id}:2000`, 1);
    expect(s.repo.payouts).toEqual([]);
    await s.callback(ADMIN, `dp:ok:${p.id}:2000`, 1);
    await s.callback(ADMIN, `dp:ok:${p.id}:2000`, 1);
    expect(s.repo.payouts).toHaveLength(1);
    expect(s.lastText(ADMIN)).toBe(uz.panel.partner.payStale);
  });

  it("поддельная сумма выплаты не проходит", async () => {
    const s = new Sim();
    const p = await addPartner(s, code, { telegramId: 50 });
    await prepare(s, ADMIN);
    await paidOrder(s, 1, code);
    await s.callback(ADMIN, `dp:ok:${p.id}:999999`, 1);
    expect(s.repo.payouts).toEqual([]);
  });

  it("период фильтрует счётчики, но не долг", async () => {
    const s = new Sim();
    const p = await addPartner(s, code, { telegramId: 50 });
    await prepare(s, ADMIN);
    await paidOrder(s, 1, code);
    s.advance(60 * 24 * 40);
    await s.command(ADMIN, "dashboard");
    const screen = s.last(ADMIN);
    await s.callback(ADMIN, `dash:partners:today:${p.id}`, screen.id);
    expect(screen.text).toContain(`${uz.panel.partner.paid}: 0`);
    expect(inlineButtons(screen).some((b) => "data" in b && b.data === `dp:pay:${p.id}:1000`)).toBe(true);
  });

  it("до миграции панель работает, раздел партнёров объясняет причину", async () => {
    const s = new Sim();
    s.repo.partnersReady = false;
    const screen = await open(s);
    await s.callback(ADMIN, "dash:partners:all", screen.id);
    expect(screen.text).toContain(uz.panel.partner.notReady);
  });

  it("кнопка «назад» при добавлении партнёра не ломает диалог", async () => {
    const s = new Sim();
    await open(s);
    await s.callback(ADMIN, "dp:new", s.last(ADMIN).id);
    await s.click(ADMIN, uz.back);
    expect(s.tg.to(ADMIN).some((m) => m.text === uz.error)).toBe(false);
    expect(s.repo.partners).toEqual([]);
  });

  it("коды и контакты", () => {
    expect(newPartnerCode()).toMatch(/^[a-z0-9]{8}$/);
    expect(newPartnerCode()).not.toBe(newPartnerCode());
    expect(parseContact("https://t.me/oybek_uz")).toEqual({ telegramId: null, username: "oybek_uz" });
    expect(parseContact("987654321")).toEqual({ telegramId: 987654321, username: null });
    expect(parseContact("имя")).toBeNull();
  });
});

describe("избранное", () => {
  it("сохраняется после /start, повторное добавление без дублей", async () => {
    const s = new Sim(); await prepare(s, 1);
    await s.callback(1, "fav:add:doppicha", 1); await s.callback(1, "fav:add:doppicha", 1);
    await s.start(1); await s.command(1, "favorites");
    expect(await s.repo.listFavorites(1)).toEqual(["doppicha"]);
    expect(await s.repo.listFavorites(2)).toEqual([]);
    await s.callback(1, "fav:remove:doppicha", 1); await s.callback(1, "fav:remove:doppicha", 1);
    expect(await s.repo.listFavorites(1)).toEqual([]);
  });
});
