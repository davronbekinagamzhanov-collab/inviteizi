/**
 * v2, часть 5: партнёры. Создание владельцем и менеджером, ссылка join_ (язык → номер → Kaspi → меню),
 * подтверждение/отклонение, ставка 0, предложения менеджера, двойные нажатия, чужой/повторный/истёкший токен,
 * тихие часы и «спящие».
 */
import { describe, expect, it } from "vitest";
import { uz } from "@/texts/bot-uz";
import { ru, staff } from "@/texts/bot-ru";
import { partnerSource } from "@/lib/owner-panel";
import { runCron } from "./cron";
import { normalizeKaspi, normalizePhone, panelData, SLEEP_AFTER_MS } from "./flow/partners";
import { ownerEvening } from "./flow/notify";
import { TG_LIMITS } from "./testing/fake-tg";
import { nikohWithReceipt } from "./testing/paths";
import { ADMIN, ADMIN2, Sim } from "./testing/sim";

const T = staff.pt;
const MANAGER = 700;
const PARTNER = 900;
const CLIENT = 1;

const start = async (s: Sim, id: number, payload = "", lang = uz.langUz) => {
  const had = (await s.repo.getUser(id))?.lang;
  await s.start(id, payload);
  if (!had && s.lastText(id)?.startsWith("Тилни танланг")) await s.click(id, lang);
};
const lastToast = (s: Sim) => s.tg.answers.at(-1)?.text;
const texts = (s: Sim, id: number) => s.tg.to(id).map((m) => m.text);
const qrOf = (s: Sim, id: number) => s.tg.to(id).filter((m) => m.type === "photo").at(-1)!;
const docs = (s: Sim, id: number) => s.tg.to(id).filter((m) => m.type === "document");

async function makeManager(s: Sim) {
  await start(s, ADMIN);
  await s.click(ADMIN, staff.btn.settings);
  await s.click(ADMIN, staff.btn.addManager);
  const token = /start=mgr_([a-z0-9]+)/.exec([...texts(s, ADMIN)].reverse().find((t) => /start=mgr_/.test(t)) ?? "")![1];
  await s.start(MANAGER, `mgr_${token}`);
}

/** Пройти создание партнёра кнопками; вернуть токен join_ */
async function createPartner(s: Sim, who: number, o: { name?: string; phone?: string; rate?: RegExp | string; schedule?: "daily" | "weekly" | "monthly" } = {}) {
  if (who === ADMIN) {
    await start(s, ADMIN);
    await s.click(ADMIN, staff.btn.partners);
    await s.click(ADMIN, T.btn.add);
  } else {
    await s.start(who);
    await s.click(who, staff.btn.newPartner);
  }
  await s.text(who, o.name ?? "Салон Малика");
  await s.text(who, o.phone ?? "+7 701 123 45 67");
  if (typeof o.rate === "string") await s.text(who, o.rate);
  else await s.click(who, o.rate ?? /^1.000 ₸ фикс\.$/);
  await s.click(who, T.schedule[o.schedule ?? "weekly"]);
  await s.click(who, T.create);
  const link = [...texts(s, who)].reverse().find((t) => /start=join_/.test(t)) ?? "";
  return /start=join_([a-z0-9]+)/.exec(link)![1];
}

/** Партнёр открывает ссылку: язык → кнопка номера → Kaspi «тот же номер» */
async function join(s: Sim, token: string, id = PARTNER, lang = uz.langUz) {
  await s.start(id, `join_${token}`);
  await s.click(id, lang);
  // этап 3: номер телефона не спрашиваем; Kaspi — из меню «💳»
  await s.callback(id, "pn:pk", 1);
  await s.text(id, "+7 701 123 45 67");
}

async function paidOrder(s: Sim, id: number, code: string) {
  await s.start(id, partnerSource(code));
  const o = await nikohWithReceipt(s, id);
  await s.callback(ADMIN, `ok:${o.number}`, 1);
  return o;
}

describe("номера", () => {
  it("телефон и Kaspi приводятся к одному виду, мусор — нет", () => {
    expect(normalizePhone("+7 701 123 45 67")).toBe("+77011234567");
    expect(normalizePhone("8 (701) 123-45-67")).toBe("+77011234567");
    expect(normalizePhone("7011234567")).toBe("+77011234567");
    expect(normalizePhone("+998 90 123 45 67")).toBe("+998901234567");
    for (const bad of ["", "12345", "кирил", "+7 701 abc", "0123456789012"]) expect(normalizePhone(bad), bad).toBeNull();
    expect(normalizeKaspi("4400430123456789")).toBe("4400 4301 2345 6789");
    expect(normalizeKaspi("8 701 123 45 67")).toBe("+77011234567");
    expect(normalizeKaspi("4400 4301")).toBeNull();
  });
});

describe("создание", () => {
  it("владелец: подтверждён сразу, ссылка join_ на 7 дней, WhatsApp uz/ru, QR сразу", async () => {
    const s = new Sim();
    const token = await createPartner(s, ADMIN, { schedule: "daily" });
    const [p] = s.repo.partners;
    expect(p).toMatchObject({ name: "Салон Малика", phone: "+77011234567", rate: 1000, schedule: "daily", status: "active", managedBy: null, telegramId: null });
    expect(token).toMatch(/^[a-z0-9]{20}$/);
    const created = s.tg.to(ADMIN).find((m) => m.text.includes(T.created(p.name, "").split("\n")[0]))!;
    const wa = (created.markup as { inline: { text: string; url?: string }[][] }).inline.flat().filter((b) => b.url?.startsWith("https://wa.me/"));
    expect(wa.map((b) => b.text)).toEqual([staff.btn.waUz, staff.btn.waRu]);
    expect(decodeURIComponent(wa[0].url!)).toContain(uz.role.joinShare("").split("\n")[0]);
    expect(qrOf(s, ADMIN).text).toContain(`start=p_${p.code}`);
    expect(s.lastText(ADMIN)).toBe(ru.role.refLink(`https://t.me/inviteizi_test_bot?start=p_${p.code}`));
    // Владельцу о своём партнёре карточку решения не шлём
    expect(texts(s, ADMIN).some((t) => t.startsWith("🤝 Новый партнёр от"))).toBe(false);
    // QR работает сразу: скан засчитывается
    await s.start(CLIENT, partnerSource(p.code));
    expect((await s.user(CLIENT))!.source).toBe(`p_${p.code}`);
  });

  it("ввод с ошибками: длинное имя, плохой телефон, плохая ставка — подсказка и тот же вопрос", async () => {
    const s = new Sim();
    await start(s, ADMIN);
    await s.click(ADMIN, staff.btn.partners);
    await s.click(ADMIN, T.btn.add);
    await s.text(ADMIN, "А".repeat(81));
    expect((await s.user(ADMIN))!.step).toBe("partnerName");
    await s.text(ADMIN, "Дўкон");
    await s.text(ADMIN, "123");
    expect(texts(s, ADMIN)).toContain(T.badPhone);
    await s.text(ADMIN, "87011234567");
    await s.text(ADMIN, "-5");
    expect(texts(s, ADMIN)).toContain(T.badRate);
    await s.text(ADMIN, "1 500");
    expect((await s.user(ADMIN))!.step).toBe("partnerSchedule");
  });

  it("двойное «✅ Создать» создаёт одного партнёра", async () => {
    const s = new Sim();
    await createPartner(s, ADMIN);
    const confirm = [...s.tg.to(ADMIN)].reverse().find((m) => m.text.startsWith("📄 Договор"))!;
    const data = (confirm.markup as { inline: { text: string; data?: string }[][] }).inline.flat().find((b) => b.text === T.create)!.data!;
    await s.callback(ADMIN, data, confirm.id);
    expect(s.repo.partners).toHaveLength(1);
  });

  it("менеджер: партнёр ждёт ✅, владельцу — карточка с тремя кнопками; ставка 0 разрешена", async () => {
    const s = new Sim();
    await makeManager(s);
    await createPartner(s, MANAGER, { rate: "0", schedule: "monthly" });
    const [p] = s.repo.partners;
    expect(p).toMatchObject({ rate: 0, status: "pending", managedBy: MANAGER, schedule: "monthly" });
    expect(texts(s, MANAGER).some((t) => t.includes(T.createdPending))).toBe(true);
    for (const owner of [ADMIN, ADMIN2]) {
      const card = s.tg.to(owner).find((m) => m.text.startsWith("🤝 Новый партнёр от"))!;
      expect(card.text).toBe(T.newFrom("@user700", "Салон Малика", "+7 701 123 45 67", T.noPayout));
      const labels = (card.markup as { inline: { text: string }[][] }).inline.flat().map((b) => b.text);
      expect(labels).toEqual([T.btn.approve, T.btn.editRate, T.btn.reject]);
    }
  });
});

describe("подтверждение", () => {
  async function pending(s: Sim) {
    await makeManager(s);
    const token = await createPartner(s, MANAGER);
    const p = s.repo.partners[0];
    return { token, p };
  }

  it("до ✅ оплаты считаются, но к выплате 0; после ✅ — начисляется и за прошлые; менеджеру «✅ Подтверждено»", async () => {
    const s = new Sim();
    const { p } = await pending(s);
    await paidOrder(s, CLIENT, p.code);
    expect(s.repo.earnings).toMatchObject([{ partnerId: p.id, amount: 1000 }]);
    await start(s, ADMIN);
    const home = (s.last(ADMIN)!.markup as { inline: { text: string }[][] }).inline.flat().map((b) => b.text);
    expect(home).toContain(staff.btn.payouts(0));
    await s.click(ADMIN, staff.btn.partners);
    await s.click(ADMIN, /^⏳ Салон Малика/);
    expect(s.lastText(ADMIN)).toContain("Ждёт подтверждения: 1 000 ₸");
    await s.click(ADMIN, T.btn.approve);
    expect(lastToast(s)).toBe(T.decided.active);
    expect(s.repo.partners[0].status).toBe("active");
    expect(s.lastText(ADMIN)).toContain("К выплате: 1 000 ₸");
    expect(texts(s, MANAGER)).toContain(T.toManagerApproved("Салон Малика", T.terms("1 000 ₸", T.scheduleLower.weekly)));
  });

  it("двойное ✅ и ✅ после ❌: «уже решено», статус не меняется, менеджеру одно сообщение", async () => {
    const s = new Sim();
    const { p } = await pending(s);
    await s.callback(ADMIN, `pa:no:${p.id}`, s.last(ADMIN)!.id);
    await s.callback(ADMIN, `pa:ok:${p.id}`, s.last(ADMIN)!.id);
    expect(lastToast(s)).toBe(T.already);
    expect(s.repo.partners[0].status).toBe("rejected");
    expect(texts(s, MANAGER).filter((t) => t === T.toManagerRejected("Салон Малика"))).toHaveLength(1);
  });

  it("отклонённый: ссылка не работает, QR больше не начисляет, выплат нет", async () => {
    const s = new Sim();
    const { p, token } = await pending(s);
    await s.callback(ADMIN, `pa:no:${p.id}`, s.last(ADMIN)!.id);
    await s.start(PARTNER, `join_${token}`);
    expect(texts(s, PARTNER)).toContain(uz.role.joinTaken);
    await paidOrder(s, CLIENT, p.code);
    expect(s.repo.earnings).toEqual([]);
    expect(await s.repo.recordPartnerPayout(p.id, 1000, ADMIN)).toBe(false);
  });

  it("✏️ Изменить ставку из карточки — снова карточка с ✅ и новой ставкой", async () => {
    const s = new Sim();
    const { p } = await pending(s);
    await s.callback(ADMIN, `pa:rate:${p.id}`, s.last(ADMIN)!.id);
    await s.text(ADMIN, "500");
    expect(s.repo.partners[0]).toMatchObject({ rate: 500, status: "pending" });
    expect(s.lastText(ADMIN)).toContain(T.terms("500 ₸", T.scheduleLower.weekly));
    await s.click(ADMIN, T.btn.approve);
    expect(s.repo.partners[0].status).toBe("active");
  });

  it("менеджер не может подтвердить, менять ставку, график и выплаты", async () => {
    const s = new Sim();
    const { p } = await pending(s);
    for (const data of [`pa:ok:${p.id}`, `pa:no:${p.id}`, `pa:rate:${p.id}`, `pa:sset:${p.id}:daily`, `pa:pay:${p.id}:1000`, `pa:paid:${p.id}:1000`, `pa:pok:${p.id}`]) {
      await s.callback(MANAGER, data, 1);
      expect(lastToast(s), data).toBe(ru.oldButton);
    }
    expect(s.repo.partners[0]).toMatchObject({ status: "pending", rate: 1000, schedule: "weekly" });
  });

  it("ночью карточка владельцу не уходит — cron пришлёт после 08:00, один раз", async () => {
    const s = new Sim({ now: "2026-11-01T18:00:00Z" }); // 23:00 в Сайраме
    await makeManager(s);
    await createPartner(s, MANAGER);
    expect(texts(s, ADMIN).some((t) => t.startsWith("🤝 Новый партнёр от"))).toBe(false);
    await runCron(s.deps);
    expect(texts(s, ADMIN).some((t) => t.startsWith("🤝 Новый партнёр от"))).toBe(false);
    s.advance(10 * 60); // 09:00
    await runCron(s.deps);
    await runCron(s.deps);
    expect(texts(s, ADMIN).filter((t) => t.startsWith("🤝 Новый партнёр от"))).toHaveLength(1);
  });
});

describe("предложение менеджера", () => {
  it("ставка и график меняются только после ✅ владельца, для новых заказов", async () => {
    const s = new Sim();
    await makeManager(s);
    await createPartner(s, MANAGER);
    const p = s.repo.partners[0];
    await s.callback(ADMIN, `pa:ok:${p.id}`, s.last(ADMIN)!.id);
    await paidOrder(s, CLIENT, p.code);
    await s.start(MANAGER);
    await s.click(MANAGER, staff.btn.myPartners);
    await s.click(MANAGER, /Салон Малика/);
    await s.click(MANAGER, T.btn.propose);
    await s.text(MANAGER, "1500");
    await s.click(MANAGER, T.schedule.daily);
    expect(s.repo.partners[0]).toMatchObject({ rate: 1000, schedule: "weekly", proposedRate: 1500, proposedSchedule: "daily" });
    const card = [...s.tg.to(ADMIN)].reverse().find((m) => m.text.includes("предлагает"))!;
    expect(card.text).toBe(T.proposal("@user700", "Салон Малика", "1 000 ₸ → 1 500 ₸", "раз в неделю (пн) → каждый день"));
    await s.click(ADMIN, T.btn.approve);
    await s.callback(ADMIN, `pa:pok:${p.id}`, s.last(ADMIN)!.id);
    expect(lastToast(s)).toBe(T.already);
    expect(s.repo.partners[0]).toMatchObject({ rate: 1500, schedule: "daily", proposedRate: null });
    await paidOrder(s, 2, p.code);
    expect(s.repo.earnings.map((e) => e.amount)).toEqual([1000, 1500]);
    expect(texts(s, MANAGER)).toContain(T.toManagerProposalOk("Салон Малика", T.terms("1 500 ₸", T.scheduleLower.daily)));
  });
});

describe("ссылка join_", () => {
  it("этап 3: одно приветствие (ставка, график, 3 шага, выбор языка) → то же сообщение на его языке с меню; Kaspi — сам из меню", async () => {
    const s = new Sim();
    const token = await createPartner(s, ADMIN);
    const before = s.tg.to(PARTNER).length;
    await s.start(PARTNER, `join_${token}`);
    // ровно одно сообщение: приветствие с выбором языка
    expect(s.tg.to(PARTNER).length - before).toBe(1);
    const hello = s.last(PARTNER)!;
    expect(hello.text).toContain("Салон Малика");
    expect(hello.text).toContain("Тилни танланг · Выберите язык");
    expect(hello.text).toMatch(/1\. .*\n2\. .*\n3\. /);
    await s.click(PARTNER, ru.langRu);
    // то же сообщение стало русским приветствием с меню — новых сообщений нет
    expect(s.tg.to(PARTNER).length - before).toBe(1);
    const welcome = s.last(PARTNER)!;
    expect(welcome.text).toContain("Добро пожаловать, Салон Малика!");
    expect(welcome.text).not.toContain("Выберите язык");
    expect(JSON.stringify(welcome.markup)).toContain(ru.role.btnKaspi);
    expect((await s.user(PARTNER))!).toMatchObject({ lang: "ru", step: "idle" });
    expect(texts(s, ADMIN)).toContain(T.joined("Салон Малика", `@user${PARTNER}`));
    // Kaspi — сам из меню; неверный номер — подсказка
    await s.callback(PARTNER, "pn:pk", 1);
    expect(s.lastText(PARTNER)).toBe(ru.role.askKaspi);
    await s.text(PARTNER, "1234");
    expect(texts(s, PARTNER)).toContain(ru.role.badKaspi);
    await s.text(PARTNER, "+7 701 123 45 67");
    expect(s.repo.partners[0]).toMatchObject({ telegramId: PARTNER, username: `user${PARTNER}`, kaspi: "+77011234567" });
    expect(texts(s, PARTNER).some((t) => t.startsWith("✅ Kaspi: +7 701 123 45 67"))).toBe(true);
    expect(s.lastText(PARTNER)).toContain("💰 Заработано всего: 0 ₸");
    // join_ не записывается как источник клиента
    expect((await s.user(PARTNER))!.source).toBeNull();
  });

  it("повторная ссылка, чужая ссылка, неверная и истёкшая", async () => {
    const s = new Sim();
    const token = await createPartner(s, ADMIN);
    await join(s, token);
    // Тот же партнёр снова: меню, ссылка не тратится заново
    await s.start(PARTNER, `join_${token}`);
    expect(s.lastText(PARTNER)).toContain("Салон Малика");
    // Другой человек по уже использованной ссылке
    await start(s, 901, `join_${token}`);
    expect(texts(s, 901)).toContain(uz.role.joinUsed);
    expect(s.repo.partners[0].telegramId).toBe(PARTNER);
    await start(s, 902, "join_zzzzzzzzzzzzzzzzzzzz");
    expect(texts(s, 902)).toContain(uz.role.joinNone);
    const token2 = await createPartner(s, ADMIN, { name: "Дўкон" });
    s.advance(7 * 24 * 60 + 1);
    await start(s, 903, `join_${token2}`);
    expect(texts(s, 903)).toContain(uz.role.joinExpired);
  });

  it("новая ссылка с карточки: пока партнёр не подключился; уже подключённого не перепривязать", async () => {
    const s = new Sim();
    const token = await createPartner(s, ADMIN);
    const p = s.repo.partners[0];
    await s.callback(ADMIN, `pa:link:${p.id}`, s.last(ADMIN)!.id);
    const fresh = /start=join_([a-z0-9]+)/.exec(s.lastText(ADMIN))![1];
    expect(fresh).not.toBe(token);
    await join(s, token);
    await start(s, 904, `join_${fresh}`);
    expect(texts(s, 904)).toContain(uz.role.joinTaken);
    expect(s.repo.partners[0].telegramId).toBe(PARTNER);
  });

  it("владелец и менеджер по ссылке партнёра — не становятся партнёром, ссылка цела", async () => {
    const s = new Sim();
    await makeManager(s);
    const token = await createPartner(s, ADMIN);
    for (const id of [ADMIN, MANAGER]) {
      await s.start(id, `join_${token}`);
      expect(texts(s, id)).toContain(T.joinStaff);
    }
    await join(s, token);
    expect(s.repo.partners[0].telegramId).toBe(PARTNER);
  });

  it("ставка 0 — «только счёт»; неподтверждённый партнёр видит «ждёт подтверждения»", async () => {
    const s = new Sim();
    await makeManager(s);
    const token = await createPartner(s, MANAGER, { rate: "0" });
    await join(s, token);
    expect(s.lastText(PARTNER)).toContain("⏳ Тасдиқ кутилмоқда");
    await s.click(PARTNER, uz.role.btnPayouts);
    expect(s.lastText(PARTNER)).toContain(uz.role.countOnly);
  });

  it("день выплаты и сумма на подтверждении в «💰 Тўловларим»", async () => {
    const s = new Sim();
    await makeManager(s);
    const token = await createPartner(s, MANAGER, { schedule: "monthly" });
    await join(s, token);
    await paidOrder(s, CLIENT, s.repo.partners[0].code);
    await s.start(PARTNER);
    await s.click(PARTNER, uz.role.btnPayouts);
    expect(s.lastText(PARTNER)).toContain(uz.role.onHold("1 000 ₸"));
    expect(s.lastText(PARTNER)).toContain(uz.role.payDay(uz.role.schedule.monthly));
  });
});

describe("сеть менеджера", () => {
  it("менеджер видит только своих партнёров; телефон и Telegram — свои", async () => {
    const s = new Sim();
    await makeManager(s);
    await createPartner(s, ADMIN, { name: "Партнёр владельца", phone: "+7 702 000 00 00" });
    await createPartner(s, MANAGER, { name: "Мой салон" });
    await s.start(MANAGER);
    await s.click(MANAGER, staff.btn.myPartners);
    expect(s.lastText(MANAGER)).toContain("Мой салон");
    expect(s.lastText(MANAGER)).not.toContain("Партнёр владельца");
    await s.callback(MANAGER, `pa:v:1`, 1);
    expect(lastToast(s)).toBe(ru.oldButton);
    await s.callback(MANAGER, `pa:qr:1`, 1);
    expect(lastToast(s)).toBe(ru.oldButton);
    await s.click(MANAGER, /Мой салон/);
    expect(s.lastText(MANAGER)).toContain("+7 701 123 45 67");
  });

  it("клиент и партнёр не открывают pa:-кнопки", async () => {
    const s = new Sim();
    const token = await createPartner(s, ADMIN);
    await join(s, token);
    await start(s, CLIENT);
    for (const id of [CLIENT, PARTNER]) {
      for (const data of ["pa:l", "pa:new", "pa:v:1", "pa:ok:1", "pa:paid:1:1000", "pa:link:1"]) {
        await s.callback(id, data, 1);
        expect(lastToast(s), `${id} ${data}`).toBe(uz.oldButton);
      }
    }
    expect((await s.user(CLIENT))!.step).not.toMatch(/^(partner|join)/);
  });
});

describe("выплаты с карточки", () => {
  it("💸 Выплатил → подтверждение с Kaspi → одна выплата даже при двойном нажатии", async () => {
    const s = new Sim();
    const token = await createPartner(s, ADMIN);
    await join(s, token);
    const p = s.repo.partners[0];
    await paidOrder(s, CLIENT, p.code);
    await start(s, ADMIN);
    await s.click(ADMIN, staff.btn.payouts(1));
    await s.click(ADMIN, /Салон Малика · 1.000 ₸/);
    await s.click(ADMIN, T.btn.pay("1 000 ₸"));
    expect(s.lastText(ADMIN)).toBe(T.payConfirm("Салон Малика", "1 000 ₸", "+7 701 123 45 67"));
    const screen = s.last(ADMIN)!.id;
    await s.click(ADMIN, T.btn.payYes);
    await s.callback(ADMIN, `pa:paid:${p.id}:1000:0`, screen);
    expect(s.repo.payouts).toHaveLength(1);
    expect(s.lastText(ADMIN)).toBe(T.payStale);
  });
});

describe("«спящие»", () => {
  it("14 дней без сканов — одно сообщение тому, кто привёл; после нового скана и нового сна — снова", async () => {
    const s = new Sim();
    await makeManager(s);
    await createPartner(s, MANAGER);
    const p = s.repo.partners[0];
    s.advance(13 * 24 * 60);
    await runCron(s.deps);
    expect(texts(s, MANAGER)).not.toContain(T.sleeping("Салон Малика"));
    s.advance(24 * 60 + 1);
    await runCron(s.deps);
    await runCron(s.deps);
    expect(texts(s, MANAGER).filter((t) => t === T.sleeping("Салон Малика"))).toHaveLength(1);
    expect(texts(s, ADMIN)).not.toContain(T.sleeping("Салон Малика"));
    s.advance(60);
    await s.start(CLIENT, partnerSource(p.code));
    s.advance(SLEEP_AFTER_MS / 60_000 + 1);
    await runCron(s.deps);
    expect(texts(s, MANAGER).filter((t) => t === T.sleeping("Салон Малика"))).toHaveLength(2);
  });

  it("партнёр владельца — владельцам; ночью — не пишем, отклонённых — не трогаем", async () => {
    const s = new Sim();
    await createPartner(s, ADMIN, { name: "Уличный QR", rate: /^0 ₸$/ });
    s.advance(14 * 24 * 60 + 11 * 60); // 23:00
    await runCron(s.deps);
    expect(texts(s, ADMIN)).not.toContain(T.sleeping("Уличный QR"));
    s.advance(10 * 60);
    await runCron(s.deps);
    expect(texts(s, ADMIN)).toContain(T.sleeping("Уличный QR"));
  });
});

describe("лимиты Telegram на новые тексты", () => {
  it("сообщения ≤ 4096, всплывашки ≤ 200, кнопки ≤ 64", () => {
    const long = "Ж".repeat(80);
    const msgs = [
      T.created(long, `https://t.me/inviteizi_test_bot?start=join_${"a".repeat(20)}`) + `\n\n${T.createdPending}`,
      T.card({ name: long, status: T.status.pending, phone: "+7 701 123 45 67", tg: "@" + "u".repeat(32), kaspi: "4400 4301 2345 6789", terms: T.terms("1 000 000 ₸", T.scheduleLower.monthly), manager: "@" + "m".repeat(32), proposal: T.terms("1 000 000 ₸", T.scheduleLower.daily) }),
      T.newFrom("@" + "m".repeat(32), long, "+7 701 123 45 67", T.terms("1 000 000 ₸", T.scheduleLower.monthly)),
      T.proposal("@" + "m".repeat(32), long, "1 000 000 ₸ → 1 000 000 ₸", "раз в месяц (1-го) → каждый день"),
      ...[uz, ru].flatMap((tx) => [tx.role.joinHello, tx.role.askKaspi, tx.role.joinShare(`https://t.me/x?start=join_${"a".repeat(20)}`), tx.role.partnerMenu({ name: long, earned: "1 000 000 ₸", due: "1 000 000 ₸", next: "30 сентябр, чоршанба", today: 999, pending: true, noKaspi: true }), tx.role.joinWelcome({ name: long, rate: "1 000 000 ₸", schedule: "ҳар ойнинг 1-куни", ask: true }), tx.role.howText]),
    ];
    for (const m of msgs) expect(m.length, m).toBeLessThanOrEqual(TG_LIMITS.message);
    for (const a of [T.already, T.decided.active, T.decided.rejected, ru.oldButton]) expect(a.length).toBeLessThanOrEqual(TG_LIMITS.alert);
    const labels = [...Object.values(T.btn).map((b) => (typeof b === "function" ? b("1 000 000 ₸") : b)), ...[uz, ru].flatMap((tx) => [tx.role.btnLink, tx.role.btnPayouts, tx.role.btnDetail, tx.role.btnHow, tx.role.btnKaspi]), ...Object.values(T.schedule)];
    for (const l of labels) expect(l.length, l).toBeLessThanOrEqual(TG_LIMITS.button);
    for (const data of ["pa:paid:2147483647:1000000:9999", "pa:sset:2147483647:monthly", "pa:l:0:999"]) expect(Buffer.byteLength(data)).toBeLessThanOrEqual(TG_LIMITS.callbackData);
  });
});

describe("QR и постер (часть 6)", () => {
  it("QR с кнопками постера; постер — PDF и PNG; партнёр получает на своём языке, чужой — нет", async () => {
    const s = new Sim();
    const token = await createPartner(s, ADMIN);
    const p = s.repo.partners[0];
    const qr = qrOf(s, ADMIN);
    expect(qr.text).toBe(ru.role.qrCaption(p.name, `https://t.me/inviteizi_test_bot?start=p_${p.code}`));
    await s.click(ADMIN, ru.role.posterUz);
    const [pdf, png] = docs(s, ADMIN).slice(-2);
    expect([pdf.type, pdf.fileName, png.fileName]).toEqual(["document", `inviteizi-${p.code}-uz.pdf`, `inviteizi-${p.code}-uz.png`]);
    expect(Buffer.from(pdf.media as Uint8Array).subarray(0, 8).toString("latin1")).toBe("%PDF-1.4");
    expect(pdf.text).toBe(ru.role.posterReady(p.name));

    await join(s, token);
    await s.start(PARTNER);
    await s.click(PARTNER, uz.role.btnLink);
    expect(qrOf(s, PARTNER).text).toBe(uz.role.qrCaption(p.name, `https://t.me/inviteizi_test_bot?start=p_${p.code}`));
    expect(s.lastText(PARTNER)).toBe(uz.role.refLink(`https://t.me/inviteizi_test_bot?start=p_${p.code}`));
    await s.click(PARTNER, uz.role.posterRu);
    expect(docs(s, PARTNER).at(-1)!.fileName).toBe(`inviteizi-${p.code}-ru.png`);

    await start(s, CLIENT);
    await start(s, 901);
    const before = s.tg.messages.length;
    for (const id of [CLIENT, 901]) {
      await s.callback(id, `pq:${p.id}:uz`, 1);
      expect(lastToast(s)).toBe(uz.oldButton);
    }
    expect(s.tg.messages.length).toBe(before);
  }, 30_000);

  it("менеджер — постер только своих партнёров", async () => {
    const s = new Sim();
    await makeManager(s);
    await createPartner(s, ADMIN, { name: "Партнёр владельца" });
    await createPartner(s, MANAGER, { name: "Мой салон" });
    await s.callback(MANAGER, "pq:1:ru", 1);
    expect(lastToast(s)).toBe(ru.oldButton);
    await s.click(MANAGER, ru.role.posterRu);
    expect(docs(s, MANAGER).at(-1)!.fileName).toMatch(/-ru\.png$/);
  }, 30_000);
});

describe("Ссылка партнёра текстом (fix/app-polish)", () => {
  it("рядом с QR и постером — ссылка с кнопкой «📋 Скопировать» и подсказкой про WhatsApp; заказ по ссылке засчитан партнёру", async () => {
    const s = new Sim();
    const token = await createPartner(s, ADMIN);
    const p = s.repo.partners[0];
    const link = `https://t.me/inviteizi_test_bot?start=p_${p.code}`;
    const msg = s.last(ADMIN)!;
    expect(msg.text).toBe(ru.role.refLink(link));
    expect(msg.text).toContain("WhatsApp");
    expect((msg.markup as { inline: { text: string; copy?: string }[][] }).inline.flat()).toEqual([{ text: ru.role.copyLink, copy: link }]);
    await s.click(ADMIN, ru.role.posterUz);
    expect(s.last(ADMIN)!.text).toBe(ru.role.refLink(link));

    await join(s, token);
    await s.start(PARTNER);
    await s.click(PARTNER, uz.role.btnLink);
    const pm = s.last(PARTNER)!;
    expect(pm.text).toBe(uz.role.refLink(link));
    expect((pm.markup as { inline: { text: string; copy?: string }[][] }).inline.flat()).toEqual([{ text: uz.role.copyLink, copy: link }]);
    for (const t of [ru, uz]) {
      expect(t.role.refLink(link).length).toBeLessThanOrEqual(TG_LIMITS.message);
      expect(t.role.copyLink.length).toBeLessThanOrEqual(TG_LIMITS.button);
    }

    // Клиент пришёл по ссылке (из WhatsApp — тот же /start p_<код>) → оплаченный заказ засчитан партнёру
    const o = await paidOrder(s, CLIENT, p.code);
    expect((await s.user(CLIENT))!.source).toBe(partnerSource(p.code));
    expect(o.number).toBeGreaterThan(0);
    await s.start(PARTNER);
    // «📋 Батафсил»: по дням — 1 тўлов, без имён и номеров заказов
    await s.click(PARTNER, uz.role.btnDetail);
    expect(s.lastText(PARTNER)).toContain("1 тўлов");
    expect(s.lastText(PARTNER)).not.toMatch(/user\d|Клиент\d|№\d/);
  }, 30_000);
});

describe("партнёр — не новый клиент (ревьюер, п. 16)", () => {
  it("отчёт 20:00 и статистика: 1 клиент по QR + партнёр по join_ = 1 новый клиент", async () => {
    const s = new Sim();
    const token = await createPartner(s, ADMIN);
    const p = s.repo.partners[0];
    await join(s, token);
    await start(s, CLIENT, partnerSource(p.code));
    const snap = await panelData(s.deps);
    expect(snap.users.map((u) => u.id)).toEqual([CLIENT]);
    expect(ownerEvening(snap, [], s.deps.now())).toContain(staff.n.scans(1, 1));
    const a = await s.repo.analytics(ADMIN, "today", s.deps.now());
    expect(a.newUsers).toBe(1);
  });
});

describe("Казахский постер (дополнение к части 6)", () => {
  it("кнопка kk только при KAZAKH_ENABLED; без флага pq:…:kk не срабатывает", async () => {
    const off = new Sim();
    await createPartner(off, ADMIN);
    expect(JSON.stringify(qrOf(off, ADMIN).markup)).not.toContain(":kk");
    const before = off.tg.messages.length;
    await off.callback(ADMIN, `pq:${off.repo.partners[0].id}:kk`, 1);
    expect(off.tg.messages.length).toBe(before);

    const on = new Sim();
    on.deps.env = { ...on.deps.env, kazakhEnabled: true };
    await createPartner(on, ADMIN);
    const p = on.repo.partners[0];
    await on.click(ADMIN, ru.role.posterKk);
    expect(docs(on, ADMIN).at(-1)!.fileName).toBe(`inviteizi-${p.code}-kk.png`);
  }, 30_000);
});

describe("ставка в процентах («договор», ночная доводка п.4)", () => {
  it("15% от 8 000 / 6 000 / 5 000 → 1 200 / 900 / 750 ₸; договор с примерами; разбор ввода", async () => {
    const { earningFor } = await import("@/lib/owner-panel");
    const { parseRate, rateExamples } = await import("./flow/partners");
    const p = { rate: 0, ratePercent: 15 };
    expect([8000, 6000, 5000].map((a) => earningFor(p, a))).toEqual([1200, 900, 750]);
    expect(earningFor({ rate: 0, ratePercent: 12 }, 6543)).toBe(785); // округление до целых тенге
    expect(earningFor({ rate: 700, ratePercent: null }, 8000)).toBe(700);
    expect(rateExamples(15)).toBe("7 990 → 1 199 ₸ · 4 990 → 749 ₸ · 2 990 → 449 ₸");
    expect(parseRate("15%")).toEqual({ rate: 0, pct: 15 });
    expect(parseRate("12")).toEqual({ rate: 0, pct: 12 });
    expect(parseRate("1 000 ₸")).toEqual({ rate: 1000, pct: null });
    expect(parseRate("0")).toEqual({ rate: 0, pct: null });
    expect(parseRate("150%")).toBeNull();
    expect(parseRate("абв")).toBeNull();

    const s = new Sim();
    await createPartner(s, ADMIN, { rate: /^⭐ 15%$/ });
    const contract = [...s.tg.to(ADMIN)].reverse().find((m) => m.text.startsWith("📄 Договор"))!.text;
    expect(contract).toContain("15% от оплаты (7 990 → 1 199 ₸ · 4 990 → 749 ₸ · 2 990 → 449 ₸)");
    expect(contract).toContain("👤 Привёл: владелец");
    expect(s.repo.partners[0]).toMatchObject({ ratePercent: 15 });
  });

  it("начисление — процент от фактически оплаченной суммы; смена ставки — только для новых заказов", async () => {
    const s = new Sim();
    await createPartner(s, ADMIN, { rate: /^⭐ 15%$/ });
    const p = s.repo.partners[0];
    await start(s, CLIENT, partnerSource(p.code));
    const a = await nikohWithReceipt(s, CLIENT);
    await s.callback(ADMIN, `ok:${a.number}`, 1);
    expect(s.repo.earnings.at(-1)!.amount).toBe(Math.round(a.amount * 0.15));
    await s.repo.setPartnerRate(p.id, 0, 20);
    expect(s.repo.earnings[0].amount).toBe(Math.round(a.amount * 0.15));
    await start(s, 2, partnerSource(p.code));
    const b = await nikohWithReceipt(s, 2, ["Сардор", "Нилуфар"]);
    await s.callback(ADMIN, `ok:${b.number}`, 1);
    expect(s.repo.earnings.at(-1)!.amount).toBe(Math.round(b.amount * 0.2));
  });

  it("ставка 0% — только счёт, без выплат; менеджер с 15% ждёт ✅ владельца", async () => {
    const s = new Sim();
    await createPartner(s, ADMIN, { name: "Уличный QR", rate: "0%" });
    expect(s.repo.partners[0]).toMatchObject({ ratePercent: 0 });
    await makeManager(s);
    await createPartner(s, MANAGER, { name: "Салон 15", rate: /^⭐ 15%$/ });
    expect(s.repo.partners[1]).toMatchObject({ ratePercent: 15, status: "pending", managedBy: MANAGER });
    expect(texts(s, ADMIN).some((t) => t.includes("15% от оплаты"))).toBe(true);
  });
});
