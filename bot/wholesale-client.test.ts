/**
 * Этап 3: оптовик — скидка видна в меню; «📤 Мижозга юбориш» у ОПЛАЧЕННОГО заказа → одноразовая ссылка клиенту;
 * клиент забирает — заказ, ссылка, «📥» и ответы гостей у клиента. Отказы: не оптовик, чужой, неоплаченный, повтор ссылки.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { resetRateLimits } from "@/lib/rate-limit";
import { uz } from "@/texts/bot-uz";
import { payTexts } from "@/texts/pay";
import { ownerAdmin } from "./app/owner-admin";
import { nikohOrder } from "./testing/paths";
import { ADMIN, Sim } from "./testing/sim";

const WS = 900, CLIENT = 901, OTHER = 902;
const admin = (s: Sim, action: Parameters<typeof ownerAdmin>[2], body: Record<string, unknown> = {}) =>
  ownerAdmin(s.deps, { id: ADMIN, firstName: null, username: null, languageCode: null }, action, body) as Promise<Record<string, unknown>>;

async function paid(s: Sim, id: number) {
  const o = await nikohOrder(s, id);
  await s.click(id, /^💳 Тўлаш/);
  await s.click(id, uz.pay.confirmYes);
  await s.click(id, payTexts.uz.paid);
  await s.text(id, "Давронбек И.");
  const card = s.tg.to(ADMIN).filter((m) => m.text.includes("Давронбек И.")).at(-1)!;
  await s.callback(ADMIN, `ok:${o.number}`, card.id);
  return (await s.repo.getOrder(o.id))!;
}

async function world() {
  const s = new Sim();
  await s.start(ADMIN);
  await s.click(ADMIN, uz.langUz);
  await s.start(WS);
  await s.click(WS, uz.langUz);
  expect(await admin(s, "ownerWholesaleSet", { userId: WS, percent: 20 })).toMatchObject({ ok: true });
  return s;
}

const btns = (m: unknown) => ((m as { inline?: { text: string; data?: string }[][] })?.inline ?? []).flat();

describe("оптовик → клиент", () => {
  beforeEach(() => resetRateLimits());

  it("скидка видна при /start и в «Менинг таклифномаларим»; оплаченный заказ уходит клиенту со ссылкой и ответами", async () => {
    const s = await world();
    await s.start(WS);
    expect(s.lastText(WS)).toContain(uz.wholesale.line(20));
    const o = await paid(s, WS);
    expect(o.amount).toBe(6390); // 7 990 −20 %
    await s.callback(WS, "m:my", 1);
    expect(s.tg.to(WS).some((m) => m.text === uz.wholesale.line(20))).toBe(true);
    const card = s.tg.to(WS).findLast((m) => btns(m.markup).some((b) => b.data === `wcl:${o.number}`))!;
    expect(card).toBeTruthy();
    await s.callback(WS, `wcl:${o.number}`, card.id);
    expect(texts(s, WS)).toContain(uz.wholesale.how);
    const share = s.lastText(WS)!;
    const token = /start=o_([a-z0-9]+)/.exec(share)![1];
    expect(share).toContain(`/${o.slug}`);
    // свой же ссылкой — нет
    await s.start(WS, `o_${token}`);
    expect((await s.repo.getOrder(o.id))!.userId).toBe(WS);
    // клиент забирает
    await s.start(CLIENT, `o_${token}`);
    if (JSON.stringify(s.last(CLIENT)?.markup ?? "").includes(uz.langUz)) await s.click(CLIENT, uz.langUz);
    const moved = (await s.repo.getOrder(o.id))!;
    expect(moved).toMatchObject({ userId: CLIENT, status: "active", amount: 6390 });
    expect(texts(s, CLIENT).some((t) => t.startsWith("🎉"))).toBe(true);
    // повтор ссылки другим — «уже использована»
    await s.start(OTHER, `o_${token}`);
    expect((await s.repo.getOrder(o.id))!.userId).toBe(CLIENT);
    // у оптовика заказа больше нет
    expect((await s.repo.listOrdersByUser(WS)).some((x) => x.id === o.id)).toBe(false);
  }, 30_000);

  it("неоплаченный — «сначала оплатите»; не оптовик и чужой заказ — без ссылки", async () => {
    const s = await world();
    const unpaid = await nikohOrder(s, WS);
    await s.callback(WS, `wcl:${unpaid.number}`, 1);
    expect(s.lastText(WS)).toBe(uz.wholesale.payFirst);
    // обычный клиент — кнопки нет и нажатие ничего не делает
    const mine = await paid(s, CLIENT);
    const before = s.tg.to(CLIENT).length;
    await s.callback(CLIENT, `wcl:${mine.number}`, 1);
    expect(s.tg.to(CLIENT).slice(before).some((m) => /start=o_/.test(m.text))).toBe(false);
    // оптовик — чужой заказ
    await s.callback(WS, `wcl:${mine.number}`, 1);
    expect(s.tg.to(WS).some((m) => /start=o_/.test(m.text))).toBe(false);
    // мусор
    await s.callback(WS, "wcl:abc", 1);
    expect(s.tg.to(WS).some((m) => /start=o_/.test(m.text))).toBe(false);
  }, 30_000);
});

function texts(s: Sim, id: number) {
  return s.tg.to(id).map((m) => m.text);
}

describe("ревью этапа 3: цепочка менеджер → оптовик → клиент (память)", () => {
  it("перевыдать может только тот, кто забрал", async () => {
    const s = new Sim();
    await s.repo.touchUser({ id: 1 });
    const o = await nikohOrder(s, 1);
    expect(await s.repo.issueClientOrder({ orderId: o.id, createdBy: 1, tokenHash: "a", refSource: null })).toBe(true);
    await s.repo.claimClientOrder("a", 2);
    expect(await s.repo.issueClientOrder({ orderId: o.id, createdBy: 3, tokenHash: "b", refSource: "wholesale" })).toBe(false);
    expect(await s.repo.issueClientOrder({ orderId: o.id, createdBy: 2, tokenHash: "c", refSource: "wholesale" })).toBe(true);
  });
});
