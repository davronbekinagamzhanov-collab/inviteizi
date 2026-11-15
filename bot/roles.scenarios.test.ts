/**
 * Сценарии по ролям от начала до конца (без настоящего Telegram, на тестовой обвязке Sim):
 * клиент, владелец, менеджер (Алишер), партнёр — основные действия и что роли не видят чужого.
 * Проверяются и бот (кнопки/команды), и API Mini App (bot/app/*) с подменой номера заказа и id.
 */
import { describe, expect, it } from "vitest";
import { uz } from "@/texts/bot-uz";
import { ru, staff } from "@/texts/bot-ru";
import { partnerSource } from "@/lib/owner-panel";
import type { AppUser } from "@/lib/tg-init-data";
import * as app from "./app/service";
import { ownerExport, ownerPanel } from "./app/owner";
import { partnerPoster, rolePanel } from "./app/roles-panel";
import { panelData } from "./flow/partners";
import { nikohOrder, nikohWithReceipt } from "./testing/paths";
import { ADMIN, Sim } from "./testing/sim";

const T = staff.pt;
const ALISHER = 700; // менеджер
const PARTNER = 900;
const CLIENT = 1;
const OTHER = 2;

const user = (id: number, username: string | null = null): AppUser => ({
  id,
  firstName: null,
  username,
  languageCode: null,
});
const texts = (s: Sim, id: number) => s.tg.to(id).map((m) => m.text);
const lastToast = (s: Sim) => s.tg.answers.at(-1)?.text;

const start = async (s: Sim, id: number, payload = "", lang = uz.langUz) => {
  const had = (await s.repo.getUser(id))?.lang;
  await s.start(id, payload);
  if (!had && s.lastText(id)?.startsWith("Тилни танланг")) await s.click(id, lang);
};

async function makeManager(s: Sim) {
  await start(s, ADMIN);
  await s.click(ADMIN, staff.btn.settings);
  await s.click(ADMIN, staff.btn.addManager);
  const token = /start=mgr_([a-z0-9]+)/.exec(
    [...texts(s, ADMIN)].reverse().find((t) => /start=mgr_/.test(t)) ?? "",
  )![1];
  await s.start(ALISHER, `mgr_${token}`);
}

async function createPartner(s: Sim, who: number, name: string) {
  if (who === ADMIN) {
    await start(s, ADMIN);
    await s.click(ADMIN, staff.btn.partners);
    await s.click(ADMIN, T.btn.add);
  } else {
    await s.start(who);
    await s.click(who, staff.btn.newPartner);
  }
  await s.text(who, name);
  await s.text(who, "+7 701 123 45 67");
  await s.click(who, /^1.000 ₸ фикс\.$/);
  await s.click(who, T.schedule.weekly);
  await s.click(who, T.create);
  const link = [...texts(s, who)].reverse().find((t) => /start=join_/.test(t)) ?? "";
  return /start=join_([a-z0-9]+)/.exec(link)![1];
}

async function join(s: Sim, token: string, id = PARTNER) {
  await s.start(id, `join_${token}`);
  await s.click(id, uz.langUz);
  await s.contact(id, "77011234567");
  await s.text(id, "+7 701 123 45 67");
}

describe("клиент", () => {
  it("от /start до ссылки: заказ → чек → подтверждение владельцем → полная ссылка; в «Менинг таклифномаларим» только свои", async () => {
    const s = new Sim();
    await start(s, CLIENT);
    const o = await nikohWithReceipt(s, CLIENT);
    expect(o.status).toBe("receipt_sent");
    await s.callback(ADMIN, `ok:${o.number}`, 1);
    expect((await s.repo.getOrder(o.id))!.status).toBe("active");
    expect(texts(s, CLIENT).some((t) => t.includes(`/${o.slug}`))).toBe(true);

    await nikohOrder(s, OTHER, ["Бобур", "Лола"]);
    const mine = await app.listOrders(s.deps, user(CLIENT));
    expect("orders" in mine ? mine.orders.map((x) => x.id) : mine).toEqual([o.id]);
  });

  it("чужой заказ по номеру и id: ни бот, ни Mini App не открывают, не меняют и не оплачивают", async () => {
    const s = new Sim();
    const theirs = await nikohOrder(s, OTHER, ["Бобур", "Лола"]);
    await start(s, CLIENT);
    const before = await s.repo.getOrder(theirs.id);
    for (const data of [
      `edit:${theirs.number}`,
      `link:${theirs.number}`,
      `rsvp:${theirs.number}`,
      `pay:${theirs.number}`,
      `rcpt:${theirs.number}`,
    ]) {
      await s.callback(CLIENT, data, 1);
    }
    expect(texts(s, CLIENT).some((t) => t.includes(theirs.slug))).toBe(false);
    expect(await s.repo.getOrder(theirs.id)).toEqual(before);
    expect(await app.editOrder(s.deps, user(CLIENT), theirs.id)).toEqual({ error: "notFound" });
    expect(await app.confirmPay(s.deps, user(CLIENT), theirs.id, true)).toMatchObject({ error: "notFound" });
    expect(await app.cancelOrder(s.deps, user(CLIENT), theirs.id)).toMatchObject({ error: "notFound" });
    expect(await s.repo.getOrder(theirs.id)).toEqual(before);
  });

  it("цену, формат и скрытый дизайн из браузера не подменить: сумма — по формату на сервере", async () => {
    const s = new Sim();
    const o = await nikohOrder(s, CLIENT);
    const hidden = await app.submitDraft(s.deps, user(CLIENT), {
      templateId: "oq-ot",
      form: { groom: "Азиз", bride: "Мадина" },
    } as app.AppDraft);
    expect(hidden).toEqual({ error: "design" });
    expect((await s.repo.getOrder(o.id))!.amount).toBe(o.amount);
  });

  it("кнопки и панели владельца, менеджера и партнёра клиенту недоступны", async () => {
    const s = new Sim();
    const o = await nikohWithReceipt(s, OTHER);
    await start(s, CLIENT);
    for (const data of [
      `ok:${o.number}`,
      `no:${o.number}`,
      `nr:${o.number}:money`,
      "st:d:money",
      "sm:d:money",
      "ex:m0",
      "pa:l",
      "pa:v:1",
      "po:1:1000:1",
      "mp:1:2026-11:1000",
      "pn:po",
    ]) {
      await s.callback(CLIENT, data, 1);
    }
    expect((await s.repo.getOrder(o.id))!.status).toBe("receipt_sent");
    expect(await ownerPanel(s.deps, CLIENT, "d")).toEqual({ error: "forbidden" });
    expect(await ownerExport(s.deps, CLIENT, "m")).toEqual({ error: "forbidden" });
    expect(await rolePanel(s.deps, user(CLIENT), "d")).toEqual({ error: "forbidden" });
    expect(await partnerPoster(s.deps, user(CLIENT), "uz")).toEqual({ error: "forbidden" });
  });
});

describe("владелец", () => {
  it("чек → ✅ → ссылка клиенту; чек → ❌ с причиной → клиент может прислать новый; повтор ✅ ничего не меняет", async () => {
    const s = new Sim();
    const a = await nikohWithReceipt(s, CLIENT);
    await s.callback(ADMIN, `ok:${a.number}`, 1);
    await s.callback(ADMIN, `ok:${a.number}`, 1);
    const paid = (await s.repo.getOrder(a.id))!;
    expect(paid.status).toBe("active");

    const b = await nikohWithReceipt(s, OTHER, ["Бобур", "Лола"]);
    await s.callback(ADMIN, `no:${b.number}`, s.last(ADMIN).id);
    await s.callback(ADMIN, `nr:${b.number}:money`, s.last(ADMIN).id);
    expect((await s.repo.getOrder(b.id))!.status).toBe("rejected");
    expect((await s.repo.getOrder(a.id))!.paidAt).toEqual(paid.paidAt);
  });

  it("панель Mini App владельца открывается только владельцу; оплаты владельца в выручку не попадают", async () => {
    const s = new Sim();
    const o = await nikohWithReceipt(s, CLIENT);
    await s.callback(ADMIN, `ok:${o.number}`, 1);
    const panel = await ownerPanel(s.deps, ADMIN, "d");
    expect("error" in panel).toBe(false);
    expect(JSON.stringify(panel)).toContain(String(o.amount));
    expect(await rolePanel(s.deps, user(ADMIN), "d")).toEqual({ error: "forbidden" });
  });
});

describe("менеджер (Алишер)", () => {
  it("одноразовая ссылка → панель менеджера; свой партнёр ждёт ✅ владельца; чужие разделы закрыты", async () => {
    const s = new Sim();
    await makeManager(s);
    expect(s.lastText(ALISHER)).toContain(staff.managerTitle);
    await createPartner(s, ADMIN, "Партнёр владельца");
    await createPartner(s, ALISHER, "Салон Алишера");
    await s.start(ALISHER);
    await s.click(ALISHER, staff.btn.myPartners);
    expect(s.lastText(ALISHER)).toContain("Салон Алишера");
    expect(s.lastText(ALISHER)).not.toContain("Партнёр владельца");
    const owners = (await panelData(s.deps)).partners.find((p) => p.name === "Партнёр владельца")!;
    for (const data of [`pa:v:${owners.id}`, `pa:qr:${owners.id}`, "st:d:money", "ex:m0", `po:${owners.id}:1000:1`]) {
      await s.callback(ALISHER, data, 1);
      expect(lastToast(s) ?? ru.oldButton, data).toBe(ru.oldButton);
    }
    const panel = await rolePanel(s.deps, user(ALISHER), "d");
    expect("error" in panel).toBe(false);
    expect(JSON.stringify(panel)).toContain("Салон Алишера");
    expect(JSON.stringify(panel)).not.toContain("Партнёр владельца");
    expect(await ownerPanel(s.deps, ALISHER, "d")).toEqual({ error: "forbidden" });
  });
});

describe("партнёр", () => {
  it("join_ → меню партнёра; клиент по его ссылке платит → начисление видно только этому партнёру", async () => {
    const s = new Sim();
    const token = await createPartner(s, ADMIN, "Салон Малика");
    await join(s, token);
    expect(s.lastText(PARTNER)).toContain("Салон Малика");
    const p = (await panelData(s.deps)).partners.find((x) => x.name === "Салон Малика")!;
    await s.callback(ADMIN, `pa:ok:${p.id}`, s.last(ADMIN).id);
    await s.start(CLIENT, partnerSource(p.code));
    const o = await nikohWithReceipt(s, CLIENT);
    await s.callback(ADMIN, `ok:${o.number}`, 1);

    const panel = await rolePanel(s.deps, user(PARTNER), "m");
    expect("error" in panel).toBe(false);
    expect(panel).toMatchObject({ role: "partner", name: "Салон Малика", pending: false });
    const cards = (panel as { cards: { paid: number; earned: number } }).cards;
    expect(cards.paid).toBe(1);
    expect(cards.earned).toBe(1000);
    // клиентских имён и ссылок партнёр не видит
    expect(JSON.stringify(panel)).not.toContain(o.slug);
    expect(JSON.stringify(panel)).not.toContain("Азиз");
  });

  it("партнёр не открывает панели владельца и менеджера, кнопки решений и чужие заказы", async () => {
    const s = new Sim();
    const token = await createPartner(s, ADMIN, "Салон Малика");
    await join(s, token);
    const o = await nikohWithReceipt(s, CLIENT);
    for (const data of [`ok:${o.number}`, `edit:${o.number}`, "st:d:money", "sm:d:money", "pa:l", "ex:m0"]) {
      await s.callback(PARTNER, data, 1);
    }
    expect((await s.repo.getOrder(o.id))!.status).toBe("receipt_sent");
    expect(await ownerPanel(s.deps, PARTNER, "d")).toEqual({ error: "forbidden" });
    expect(await app.editOrder(s.deps, user(PARTNER), o.id)).toEqual({ error: "notFound" });
  });
});
