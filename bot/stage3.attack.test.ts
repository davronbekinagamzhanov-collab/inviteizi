import { describe, expect, it } from "vitest";
import { invitationData, pageMode } from "@/lib/orders";
import { isReservedSlug } from "@/lib/slug";
import { partnerSource } from "@/lib/owner-panel";
import { ru } from "@/texts/bot-ru";
import { uz } from "@/texts/bot-uz";
import { redact, toEntry } from "./errors";
import { handleCronRequest, handleWebhookRequest } from "./webhook";
import { nikohOrder, nikohToMusic, nikohToReview, nikohToText, nikohWithReceipt, startUz, pickDesign } from "./testing/paths";
import { ADMIN, Sim } from "./testing/sim";

const prepare = async (s: Sim, id: number, lang = uz.langUz) => { await s.start(id); await s.click(id, lang); };
const VICTIM = 1;
const ATTACKER = 2;

async function paid(s: Sim) {
  const o = await nikohWithReceipt(s, VICTIM);
  await s.callback(ADMIN, `ok:${o.number}`, 1);
  return (await s.repo.getOrder(o.id))!;
}

describe("атакующий: чужие заказы и права", () => {
  it("подделанные callback клиента не меняют чужой заказ и не показывают его данные", async () => {
    const s = new Sim();
    const o = await nikohWithReceipt(s, VICTIM);
    await prepare(s, ATTACKER);
    const before = s.tg.messages.length;
    for (const data of [`ok:${o.number}`, `no:${o.number}`, `nr:${o.number}:money`]) await s.callback(ATTACKER, data, 1);
    expect((await s.repo.getOrder(o.id))!.status).toBe("receipt_sent");
    for (const data of [`pay:${o.number}`, `rcpt:${o.number}`, `edit:${o.number}`, `link:${o.number}`, `rsvp:${o.number}`]) {
      await s.callback(ATTACKER, data, 1);
      const text = s.lastText(ATTACKER);
      expect(text).not.toContain(o.slug);
      expect(text).not.toContain("Азиз");
    }
    const sent = s.tg.messages.slice(before).filter((m) => m.chatId === VICTIM);
    expect(sent).toEqual([]);
  });

  it("админские команды у клиента и партнёра выглядят как неизвестные", async () => {
    const s = new Sim();
    await s.repo.createPartner({ code: "aaaa1111", name: "П", telegramId: ATTACKER, username: null, rate: 1000 });
    const o = await paid(s);
    await prepare(s, ATTACKER);
    for (const [cmd, arg] of [["orders", ""], ["stats", ""], ["find", String(o.number)], ["find", "Азиз"]]) {
      await s.command(ATTACKER, cmd, arg);
      expect(s.lastText(ATTACKER)).toContain(uz.unknown);
      expect(s.lastText(ATTACKER)).not.toContain(o.slug);
    }
  });

  it("партнёр не меняет свои цифры и не видит других", async () => {
    const s = new Sim();
    const mine = await s.repo.createPartner({ code: "aaaa1111", name: "Я", telegramId: ATTACKER, username: null, rate: 1000 });
    const other = await s.repo.createPartner({ code: "bbbb2222", name: "Другой", telegramId: 99, username: null, rate: 1000 });
    await prepare(s, ADMIN);
    await s.start(VICTIM, partnerSource("bbbb2222"));
    const o = await nikohWithReceipt(s, VICTIM);
    await s.callback(ADMIN, `ok:${o.number}`, 1);
    await prepare(s, ATTACKER);
    for (const data of [`dp:ok:${mine.id}:1000`, `dp:ok:${other.id}:1000`, `dp:rate:${mine.id}`, `dp:qr:${other.id}`, `dash:partners:all:${other.id}`]) {
      await s.callback(ATTACKER, data, 1);
      expect(s.lastText(ATTACKER)).toBe(uz.dashboard.denied);
    }
    expect(s.repo.payouts).toEqual([]);
    await s.command(ATTACKER, "hamkor");
    expect(s.lastText(ATTACKER)).toContain("Тўлади: 0");
    expect(s.lastText(ATTACKER)).not.toContain("bbbb2222");
  });

  it("подделка выбора языка, мусорные и слишком длинные callback не роняют бота", async () => {
    const s = new Sim();
    await prepare(s, ATTACKER);
    for (const data of ["lang:xx", "a:abc:def", "a:999:ok", "pay:NaN", "pay:-1", "ok:0", "edit:9999999", "fav:add:../../etc", "fav:choose:netu", "dash:orders:all:999999:p", "dash:zzz:all", "dp:", "dash:", ":", "x".repeat(64)]) {
      await s.callback(ATTACKER, data, 1);
    }
    expect(s.tg.to(ATTACKER).some((m) => m.text === uz.error)).toBe(false);
  });

  it("чужой файл/страница: данные страницы не содержат чек, телефон и данные оплаты", async () => {
    const s = new Sim();
    const o = await paid(s);
    expect(o.receipt).toBeTruthy();
    const json = JSON.stringify(invitationData(o));
    expect(json).not.toContain(o.receipt!.fileId);
    expect(json).not.toMatch(/receipt|kaspi|phone|userId/i);
  });

  it("служебные адреса заняты", () => {
    for (const slug of ["api", "demo", "catalog", "dev", "admin"]) expect(isReservedSlug(slug), slug).toBe(true);
  });

  it("заказ с именем служебного адреса получает другой адрес", async () => {
    const s = new Sim();
    const o = await nikohOrder(s, 3, ["Api", "Demo"]);
    expect(isReservedSlug(o.slug)).toBe(false);
    const a = await nikohOrder(s, 4);
    const b = await nikohOrder(s, 5);
    expect(a.slug).not.toBe(b.slug);
  });
});

describe("атакующий: webhook и cron", () => {
  const body = JSON.stringify({ update_id: 1, message: { message_id: 1, date: 1, chat: { id: 1, type: "private" }, from: { id: 1, first_name: "A" }, text: "/start" } });
  it("без секрета и с неверным — 401", async () => {
    const s = new Sim();
    const call = (h: Record<string, string>) => handleWebhookRequest(new Request("https://x.test", { method: "POST", headers: h, body }), { secret: "right-secret", getDeps: () => s.deps });
    expect((await call({})).status).toBe(401);
    expect((await call({ "x-telegram-bot-api-secret-token": "wrong" })).status).toBe(401);
    expect(s.tg.messages).toEqual([]);
    const cron = (h: Record<string, string>) => handleCronRequest(new Request("https://x.test", { method: "POST", headers: h }), { check: async (v) => v === "right", getDeps: () => s.deps });
    expect((await cron({})).status).toBe(401);
    expect((await cron({ "x-cron-secret": "wrong" })).status).toBe(401);
  });
  it("в журнале ошибок нет токенов, телефонов и карт", () => {
    const dirty = "fail bot123456:ABCdefGHIjklMNOpqrSTUvwxYZ123456 +7 701 123 45 67 card 4400 4301 2345 6789 postgres://u:p@h/db https://api.telegram.org/x";
    const clean = redact(dirty);
    for (const leak of ["ABCdef", "701 123", "4400", "postgres", "api.telegram"]) expect(clean).not.toContain(leak);
    const e = Object.assign(new Error(dirty), { stack: dirty });
    const entry = toEntry(e, { kind: "text", text: "секрет клиента +77011234567", chatId: 1, from: { id: 1, firstName: "A" } } as never, "fmt", "ack");
    const all = JSON.stringify(entry);
    expect(all).not.toContain("ABCdef");
    expect(all).not.toContain("77011234567");
    expect(all).not.toContain("секрет клиента");
  });
});

describe("тестировщик: странный ввод", () => {
  it("эмодзи, длинные имена, латиница, стикер и голосовое вместо имени", async () => {
    const s = new Sim();
    await nikohToText(s, 6).catch(() => {});
    const t = new Sim();
    await startUz(t, 1);
    await t.click(1, uz.category.nikoh);
    await pickDesign(t, 1, "animated");
    await t.sticker(1);
    expect((await t.user(1))!.step).toBe("groom");
    await t.voice(1);
    expect((await t.user(1))!.step).toBe("groom");
    await t.photo(1);
    expect((await t.user(1))!.step).toBe("groom");
    await t.text(1, "   ");
    expect((await t.user(1))!.step).toBe("groom");
    await t.text(1, "я".repeat(500));
    expect((await t.user(1))!.step).toBe("groom");
    await t.text(1, "😀");
    const step = (await t.user(1))!.step;
    expect(step, "имя только из эмодзи не должно приниматься").toBe("groom");
    await t.text(1, "Aziz");
    expect((await t.user(1))!.step).toBe("bride");
    expect(t.tg.to(1).some((m) => m.text === uz.error)).toBe(false);
  });

  it("имя латиницей даёт рабочий адрес, эмодзи не ломают адрес", async () => {
    const s = new Sim();
    const a = await nikohOrder(s, 1, ["Aziz", "Madina"]);
    expect(a.slug).toMatch(/^[a-z0-9-]{1,60}$/);
    const b = await nikohOrder(s, 2, ["Ё", "Я"]);
    expect(b.slug).toMatch(/^[a-z0-9-]{1,60}$/);
    const c = await nikohOrder(s, 3, ["Жаҳонгирмирзо".repeat(3), "Гулчеҳрахон".repeat(3)]);
    expect(c.slug).toMatch(/^[a-z0-9-]{1,60}$/);
  });

  it("свой текст: HTML остаётся текстом, бот шлёт без разметки", async () => {
    const s = new Sim();
    await nikohToReview(s, 1, ["<b>Азиз</b>", "<script>x</script>"]);
    expect(s.lastText(1)).toContain("<b>Азиз</b>");
    expect(s.tg.to(1).some((m) => m.text === uz.error)).toBe(false);
  });

  it("старая кнопка анкеты и повтор того же update ничего не делают", async () => {
    const s = new Sim();
    await nikohToMusic(s, 1);
    const screen = s.findButton(1, uz.music.none);
    await s.click(1, uz.music.none);
    const step = (await s.user(1))!.step;
    await s.callback(1, screen.data, screen.msg.id);
    expect((await s.user(1))!.step).toBe(step);
    const n = s.tg.to(1).length;
    const u = { kind: "text", text: "повтор", updateId: 777, messageId: 9, chatId: 1, from: s.from(1) } as const;
    await s.send(u);
    const once = s.tg.to(1).length;
    await s.send(u);
    expect(s.tg.to(1).length).toBe(once);
    expect(once).toBeGreaterThanOrEqual(n);
  });

  it("чек: PDF, не чек, повтор чека, отказ и новая отправка, двойное подтверждение", async () => {
    const s = new Sim();
    await prepare(s, ADMIN);
    const o = await nikohOrder(s, 1);
    await s.callback(1, `pay:${o.number}`, 1);
    await s.sticker(1);
    expect((await s.repo.getOrder(o.id))!.status).not.toBe("receipt_sent");
    await s.document(1, "ZIP", "application/zip", "a.zip");
    expect((await s.repo.getOrder(o.id))!.status).not.toBe("receipt_sent");
    await s.document(1, "PDF1", "application/pdf", "chek.pdf");
    expect((await s.repo.getOrder(o.id))!.status).toBe("receipt_sent");
    await s.photo(1, "SECOND");
    expect((await s.repo.getOrder(o.id))!.receipt?.fileId).toBe("PDF1");
    await s.callback(ADMIN, `nr:${o.number}:money`, 1);
    expect((await s.repo.getOrder(o.id))!.status).toBe("rejected");
    await s.callback(1, `pay:${o.number}`, 1);
    await s.photo(1, "THIRD");
    expect((await s.repo.getOrder(o.id))!.status).toBe("receipt_sent");
    await s.callback(ADMIN, `ok:${o.number}`, 1);
    await s.callback(ADMIN, `ok:${o.number}`, 1);
    await s.callback(ADMIN, `nr:${o.number}:money`, 1);
    const after = (await s.repo.getOrder(o.id))!;
    expect(after.status).toBe("active");
    expect(s.tg.to(1).filter((m) => m.text === uz.pay.paid(`https://inviteizi.vercel.app/${o.slug}`)).length).toBeLessThanOrEqual(1);
  });

  it("страница: личная НАМУНА 24 часа, оплаченная полная, просроченная заглушка", async () => {
    const s = new Sim();
    const o = await nikohOrder(s, 1);
    expect(pageMode(o, s.clock)).toBe("demo");
    expect(pageMode(o, new Date(+o.createdAt + 25 * 3600_000))).toBe("expired");
    const p = { ...o, status: "active" as const };
    expect(pageMode(p, s.clock)).toBe("full");
    expect(pageMode(p, new Date("2099-01-01"))).toBe("expired");
  });

  it("время 25:99 и текст вместо времени не принимаются, дата далеко вперёд кнопками недоступна", async () => {
    const s = new Sim();
    await startUz(s, 1);
    await s.click(1, uz.category.nikoh);
    await pickDesign(s, 1, "animated");
    await s.text(1, "Азиз");
    await s.text(1, "Мадина");
    while ((await s.user(1))!.step !== "evDate") {
      const step = (await s.user(1))!.step;
      if (step === "relation") await s.click(1, Object.values(uz.form.relationsNikoh)[0]);
      else if (step === "hosts") await s.text(1, "Каримовлар оиласи");
      else if (step === "sideAsk") await s.click(1, uz.form.sideNo);
      else throw new Error(step);
    }
    await s.text(1, "2099-01-01");
    expect((await s.user(1))!.step).toBe("evDate");
    await s.click(1, "14");
    const a = (await s.user(1))!.step;
    if (a === "evSameDay") await s.click(1, uz.event.sameDayYes);
    const custom = s.tg.to(1).at(-1)!;
    const other = (custom.markup && "inline" in custom.markup ? custom.markup.inline.flat() : []).find((b) => "data" in b && /custom|other/.test(b.data)) as { data: string } | undefined;
    if (other) await s.callback(1, other.data, custom.id);
    const before = (await s.user(1))!.step;
    for (const bad of ["25:99", "00:61", "abc", "😀", "18:0"]) {
      await s.text(1, bad);
      expect((await s.user(1))!.step, bad).toBe(before);
    }
    expect(s.tg.to(1).some((m) => m.text === uz.error)).toBe(false);
  });

  it("после оплаты «Янги таклифнома» начинает с нуля и старый заказ не меняется", async () => {
    const s = new Sim();
    const o = await paid(s);
    await s.callback(VICTIM, "new", 1);
    expect((await s.user(VICTIM))!.step).toBe("cat");
    expect((await s.user(VICTIM))!.state.orderId).toBeUndefined();
    await s.callback(VICTIM, `edit:${o.number}`, 1);
    expect((await s.repo.getOrder(o.id))!.status).toBe("active");
    expect((await s.user(VICTIM))!.step).not.toBe("review");
  });

  it("смена языка посреди анкеты сохраняет шаг", async () => {
    const s = new Sim();
    await nikohToMusic(s, 1);
    await s.command(1, "lang");
    await s.callback(1, "lang:ru", s.last(1).id);
    expect((await s.user(1))!.step).toBe("music");
    expect(s.lastText(1)).toBe(ru.music.ask);
  });
});
