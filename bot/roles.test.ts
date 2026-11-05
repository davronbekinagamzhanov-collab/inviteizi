/**
 * v2, часть 4: роли и панели. Владелец и менеджер — по-русски, партнёр — на своём языке.
 * Одноразовые ссылки (mgr_, o_), чужие и старые кнопки, заказ «для клиента».
 */
import { describe, expect, it } from "vitest";
import { uz } from "@/texts/bot-uz";
import { ru, staff } from "@/texts/bot-ru";
import { partnerSource } from "@/lib/owner-panel";
import { TG_LIMITS } from "./testing/fake-tg";
import { nikohOrder, nikohWithReceipt } from "./testing/paths";
import { ADMIN, Sim } from "./testing/sim";

const MANAGER = 700;
const CLIENT = 1;
const OTHER = 2;

/** /start; язык выбирается только в первый раз */
const start = async (s: Sim, id: number, payload = "", lang = uz.langUz) => {
  const had = (await s.repo.getUser(id))?.lang;
  await s.start(id, payload);
  if (!had && s.lastText(id)?.startsWith("Тилни танланг")) await s.click(id, lang);
};
const buttons = (s: Sim, id: number) => (s.last(id)?.markup && "inline" in s.last(id)!.markup! ? (s.last(id)!.markup as { inline: { text: string }[][] }).inline.flat().map((b) => b.text) : []);
const lastToast = (s: Sim) => s.tg.answers.at(-1)?.text;

/** Владелец: ⚙️ → ➕ Менеджер → токен из ссылки */
async function managerLink(s: Sim) {
  await start(s, ADMIN);
  await s.click(ADMIN, staff.btn.settings);
  await s.click(ADMIN, staff.btn.addManager);
  // Экран меняется в том же сообщении: берём самое новое сообщение со ссылкой
  const text = [...s.tg.to(ADMIN)].reverse().find((m) => /start=mgr_/.test(m.text))?.text ?? "";
  const m = /start=mgr_([a-z0-9]+)/.exec(text);
  expect(m).not.toBeNull();
  return m![1];
}

async function makeManager(s: Sim, id = MANAGER) {
  const token = await managerLink(s);
  await s.start(id, `mgr_${token}`);
  return token;
}

describe("владелец", () => {
  it("/start — панель по-русски даже на узбекском; (N) только если больше нуля", async () => {
    const s = new Sim();
    await start(s, ADMIN);
    expect(s.lastText(ADMIN)).toContain(staff.ownerTitle);
    const b = buttons(s, ADMIN);
    for (const label of [staff.btn.stats, staff.btn.receipts(0), staff.btn.partners, staff.btn.payouts(0), staff.btn.client, staff.btn.export, staff.btn.create, staff.btn.settings]) expect(b).toContain(label);
    expect(b.join(" ")).not.toMatch(/\(\d+\)/);

    await nikohWithReceipt(s, CLIENT);
    await s.start(ADMIN);
    expect(buttons(s, ADMIN)).toContain(staff.btn.receipts(1));
  });

  it("🧾 Чеки: список и чек одного заказа с кнопками решения; ◀️ Назад — домой тем же сообщением", async () => {
    const s = new Sim();
    const o = await nikohWithReceipt(s, CLIENT);
    await start(s, ADMIN);
    await s.click(ADMIN, staff.btn.receipts(1));
    expect(s.lastText(ADMIN)).toContain(staff.receiptsTitle(1));
    const screen = s.last(ADMIN)!.id;
    await s.click(ADMIN, new RegExp(`^🧾 #${o.number}`));
    expect(s.last(ADMIN)!.type).toBe("photo");
    expect(s.lastText(ADMIN)).toContain(`#${o.number}`);
    expect(buttons(s, ADMIN)).toContain(uz.admin.approve);
    await s.callback(ADMIN, "pn:home", screen);
    expect(s.tg.to(ADMIN).find((m) => m.id === screen)!.text).toContain(staff.ownerTitle);
  });

  it("клиент не открывает панель: pn:* и cl:* — только «кнопка устарела»", async () => {
    const s = new Sim();
    const o = await nikohOrder(s, CLIENT);
    const before = s.tg.to(CLIENT).length;
    for (const data of ["pn:home", "pn:stats", "pn:set", "pn:madd", "pn:rc", `pn:rc:${o.number}`, "pn:ms", "pn:pp", `cl:${o.number}`]) {
      await s.callback(CLIENT, data, 1);
      expect(lastToast(s)).toBe(uz.oldButton);
    }
    expect(s.tg.to(CLIENT).length).toBe(before);
  });
});

describe("менеджер", () => {
  it("одноразовая ссылка: стал менеджером, панель по-русски, владельцу коротко; второй раз — «уже использована»", async () => {
    const s = new Sim();
    const token = await makeManager(s);
    expect(s.tg.to(MANAGER).map((m) => m.text)).toContain(staff.managerWelcome);
    expect(s.lastText(MANAGER)).toContain(staff.managerTitle);
    for (const label of [staff.btn.myStats, staff.btn.myPartners, staff.btn.newPartner, staff.btn.earnings, staff.btn.client, staff.btn.create]) expect(buttons(s, MANAGER)).toContain(label);
    expect((await s.repo.getUser(MANAGER))!.lang).toBe("ru");
    expect(s.tg.to(ADMIN).some((m) => m.text.startsWith("✅") && m.text.includes("теперь менеджер"))).toBe(true);
    // ссылка не стала «источником» клиента
    expect((await s.repo.getUser(MANAGER))!.source).toBeNull();

    await s.start(OTHER, `mgr_${token}`);
    expect(s.tg.to(OTHER).map((m) => m.text)).toContain(staff.inviteUsed);
    expect(await s.repo.getManager(OTHER)).toBeNull();
  });

  it("ссылка живёт 72 часа; владелец по ней не тратит её; повтор менеджером не тратит чужую", async () => {
    const s = new Sim();
    const token = await managerLink(s);
    await s.start(ADMIN, `mgr_${token}`);
    expect(s.tg.to(ADMIN).map((m) => m.text)).toContain(staff.ownerIsOwner);
    s.advance(72 * 60 + 1);
    await s.start(OTHER, `mgr_${token}`);
    expect(s.tg.to(OTHER).map((m) => m.text)).toContain(staff.inviteExpired);
    await s.start(OTHER, "mgr_zzzzzzzzzzzzzzzzzzzz");
    expect(s.tg.to(OTHER).map((m) => m.text)).toContain(staff.inviteNone);
    expect(await s.repo.getManager(OTHER)).toBeNull();

    const fresh = await makeManager(s);
    const second = await managerLink(s);
    await s.start(MANAGER, `mgr_${second}`);
    await s.start(OTHER, `mgr_${second}`);
    expect(await s.repo.getManager(OTHER)).not.toBeNull();
    expect(fresh).not.toBe(second);
  });

  it("владелец снимает одной кнопкой; кнопки менеджера больше не работают, свои заказы менеджера — вне продаж", async () => {
    const s = new Sim();
    await makeManager(s);
    expect(await s.repo.staffIds()).toContain(MANAGER);
    await s.start(ADMIN);
    await s.click(ADMIN, staff.btn.settings);
    await s.click(ADMIN, /^❌ Снять/);
    expect(lastToast(s)).toBe(staff.managerRemoved);
    expect(await s.repo.getManager(MANAGER)).toBeNull();
    await s.callback(MANAGER, "pn:ms", 1);
    expect(lastToast(s)).toBe(ru.oldButton);
  });

  it("менеджер не видит разделы владельца и не меняет ставку", async () => {
    const s = new Sim();
    await makeManager(s);
    const p = await s.repo.createPartner({ code: "own11111", name: "Владельца", telegramId: 900, username: null, rate: 1000 });
    for (const data of ["pn:stats", "pn:po", "pn:set", "pn:madd", "pn:rc", "pn:pt", `pn:mrm:${MANAGER}`, `pn:mq:${p.id}`]) {
      await s.callback(MANAGER, data, 1);
      expect(lastToast(s)).toBe(ru.oldButton);
    }
    await s.callback(MANAGER, `dp:rate:${p.id}`, 1);
    await s.callback(MANAGER, `dp:ok:${p.id}:1000`, 1);
    expect(s.repo.payouts).toEqual([]);
    expect(s.lastText(MANAGER)).toBe(ru.dashboard.denied);
  });

  it("➕ Новый партнёр менеджера — в его сети; ставка 0 разрешена", async () => {
    const s = new Sim();
    await makeManager(s);
    await s.click(MANAGER, staff.btn.newPartner);
    await s.text(MANAGER, "Салон Малика");
    await s.text(MANAGER, "+7 701 123 45 67");
    await s.text(MANAGER, "0");
    await s.click(MANAGER, staff.pt.schedule.monthly);
    await s.click(MANAGER, staff.pt.create);
    const [p] = s.repo.partners;
    expect(p).toMatchObject({ name: "Салон Малика", rate: 0, managedBy: MANAGER, status: "pending" });
    await s.start(MANAGER);
    await s.click(MANAGER, staff.btn.myPartners);
    expect(s.lastText(MANAGER)).toContain("Салон Малика");
  });
});

describe("партнёр", () => {
  it("/start — меню партнёра на его языке, без клиентского каталога; выплаты одним экраном", async () => {
    const s = new Sim();
    await s.repo.createPartner({ code: "malika11", name: "Салон Малика", telegramId: 900, username: null, rate: 1000 });
    await start(s, 900);
    expect(s.lastText(900)).toContain(uz.role.partnerHome("Салон Малика", false));
    const b = buttons(s, 900);
    for (const label of [uz.role.stats, uz.role.qr, uz.role.payouts, uz.contact, uz.role.self]) expect(b).toContain(label);
    expect(b).not.toContain(uz.menu.create);
    const home = s.last(900)!.id;
    await s.click(900, uz.role.payouts);
    expect(s.tg.to(900).find((m) => m.id === home)!.text).toContain(uz.role.payoutsText({ earned: "0 ₸", paidOut: "0 ₸", due: "0 ₸" }).split("\n")[0]);
    await s.callback(900, "pn:home", home);
    expect(s.tg.to(900).find((m) => m.id === home)!.text).toContain("Салон Малика");
  });

  it("русский партнёр видит меню по-русски; кнопки владельца ему недоступны", async () => {
    const s = new Sim();
    await s.repo.createPartner({ code: "malika22", name: "Малика", telegramId: 901, username: null, rate: 1000 });
    await start(s, 901, "", ru.langRu);
    expect(s.lastText(901)).toContain(ru.role.partnerHome("Малика", false));
    await s.callback(901, "pn:po", 1);
    expect(lastToast(s)).toBe(ru.oldButton);
  });
});

describe("заказ для клиента", () => {
  async function shareFromOwner(s: Sim) {
    const o = await nikohOrder(s, ADMIN);
    await s.click(ADMIN, staff.btn.toClient);
    const text = s.lastText(ADMIN);
    const token = /start=o_([a-z0-9]+)/.exec(text)?.[1];
    expect(token).toBeTruthy();
    return { o, token: token!, text };
  }

  it("📤 Отправить клиенту: одно сообщение с НАМУНА, суммой, реквизитами и ссылкой в бота + WhatsApp", async () => {
    const s = new Sim();
    const { o, text } = await shareFromOwner(s);
    expect(text).toContain(`/${o.slug}`);
    expect(text).toContain("НАМУНА");
    expect(text).toContain("чекни шу ботга юборинг");
    const b = s.last(ADMIN)!.markup as { inline: { text: string; url?: string }[][] };
    expect(b.inline.flat().map((x) => x.text)).toEqual([staff.btn.waUz, staff.btn.waRu]);
    expect(b.inline.flat().every((x) => x.url?.startsWith("https://wa.me/?text="))).toBe(true);
  });

  it("клиент забирает по ссылке: заказ его, дальше обычная оплата; повтор — тот же заказ; чужой — «уже использована»", async () => {
    const s = new Sim();
    const { o, token } = await shareFromOwner(s);
    await s.start(CLIENT, `o_${token}`);
    await s.click(CLIENT, uz.langUz);
    expect(s.lastText(CLIENT)).toContain("🎉");
    expect((await s.repo.getOrder(o.id))!.userId).toBe(CLIENT);
    expect((await s.repo.getUser(CLIENT))!.source).toBeNull();
    await s.click(CLIENT, /^💳 Тўлаш/);
    await s.photo(CLIENT, "RECEIPT_C");
    expect((await s.repo.getOrder(o.id))!.status).toBe("receipt_sent");

    await s.start(CLIENT, `o_${token}`);
    await s.start(OTHER, `o_${token}`);
    await s.click(OTHER, uz.langUz);
    expect(s.tg.to(OTHER).map((m) => m.text)).toContain(uz.role.claimUsed);
    expect((await s.repo.getOrder(o.id))!.userId).toBe(CLIENT);
  });

  it("сам продавец по своей ссылке не забирает заказ; повторная выдача отменяет старую ссылку", async () => {
    const s = new Sim();
    const { token } = await shareFromOwner(s);
    await s.start(ADMIN, `o_${token}`);
    expect(s.lastText(ADMIN)).toBe(staff.clientOwnLink);
    await s.click(ADMIN, staff.btn.toClient);
    const newer = /start=o_([a-z0-9]+)/.exec(s.lastText(ADMIN))![1];
    await start(s, CLIENT, `o_${token}`);
    expect(s.tg.to(CLIENT).map((m) => m.text)).toContain(uz.role.claimNone);
    await s.start(CLIENT, `o_${newer}`);
    expect(s.lastText(CLIENT)).toContain("🎉");
  });

  it("заказ менеджера для клиента партнёру не начисляется (продажа менеджера)", async () => {
    const s = new Sim();
    await makeManager(s);
    const partner = await s.repo.createPartner({ code: "pppp1111", name: "П", telegramId: 900, username: null, rate: 1000 });
    await start(s, CLIENT, partnerSource(partner.code));
    await s.command(MANAGER, "lang");
    const o = await nikohOrder(s, MANAGER);
    await s.click(MANAGER, staff.btn.toClient);
    const token = /start=o_([a-z0-9]+)/.exec(s.lastText(MANAGER))![1];
    await s.start(CLIENT, `o_${token}`);
    await s.click(CLIENT, /^💳 Тўлаш/);
    await s.photo(CLIENT, "RECEIPT_M");
    await s.callback(ADMIN, `ok:${o.number}`, 1);
    expect((await s.repo.getOrder(o.id))!.status).toBe("active");
    expect(s.repo.earnings).toEqual([]);
    expect(await s.repo.clientOrderRef(o.id)).toEqual({ ref: expect.stringMatching(/^m_[a-z0-9]+$/) });
  });

  it("оплаченный или чужой заказ отдать нельзя", async () => {
    const s = new Sim();
    const o = await nikohWithReceipt(s, ADMIN);
    await s.callback(ADMIN, `cl:${o.number}`, 1);
    expect(s.lastText(ADMIN)).toBe(staff.clientNotPayable);
    const other = await nikohOrder(s, CLIENT);
    await s.callback(ADMIN, `cl:${other.number}`, 1);
    expect(lastToast(s)).toBe(uz.oldButton);
  });
});

describe("лимиты Telegram для новых текстов", () => {
  it("панели, кнопки и сообщения в пределах лимитов", () => {
    const long = "Муҳаммадали Абдураҳмонов Салон «Малика» ва шериклари";
    const texts = [
      staff.clientHow, staff.st.exHint, staff.managerLink(`https://t.me/inviteizi_bot?start=mgr_${"a".repeat(20)}`),
      staff.st.earnRule("500 ₸", "15 000 ₸", 30),
      ...[uz, ru].flatMap((tx) => [
        tx.role.partnerHome(long, false), tx.role.claimed("https://inviteizi.vercel.app/" + "a".repeat(60), "10 000 ₸"),
        tx.role.clientShare({ url: "https://inviteizi.vercel.app/" + "a".repeat(60), amount: "10 000 ₸", phone: "+7 700 000 00 00", name: long, bot: `https://t.me/inviteizi_bot?start=o_${"a".repeat(20)}` }),
        tx.role.payoutsText({ earned: "1 000 000 ₸", paidOut: "1 000 000 ₸", due: "1 000 000 ₸" }),
      ]),
    ];
    for (const t of texts) expect(t.length).toBeLessThanOrEqual(TG_LIMITS.message);
    for (const t of [staff.managerRemoved, staff.btn.toClient, uz.oldButton, ru.oldButton]) expect(t.length).toBeLessThanOrEqual(TG_LIMITS.alert);
    const data = ["pn:home", "pn:mrm:9007199254740991", "pn:mq:9007199254740991", "pn:rc:99999999", "cl:99999999", "dash:partners:all:9007199254740991"];
    for (const d of data) expect(Buffer.byteLength(d)).toBeLessThanOrEqual(64);
    expect(Buffer.byteLength(`mgr_${"a".repeat(20)}`)).toBeLessThanOrEqual(64);
  });
});
