/**
 * Админка владельца в Mini App (17.11.2026): партнёры, менеджеры, выплаты, промокоды, заказ для клиента.
 * Права — только на сервере по initData: клиент, менеджер и партнёр получают 403 на каждый запрос.
 */
import { describe, expect, it } from "vitest";
import { uz } from "@/texts/bot-uz";
import { staff } from "@/texts/bot-ru";
import type { AppUser } from "@/lib/tg-init-data";
import { partnerSource } from "@/lib/owner-panel";
import { OWNER_ADMIN_ACTIONS, ownerAdmin, ownerAdminStatus } from "./app/owner-admin";
import { panelData } from "./flow/partners";
import { nikohOrder, nikohWithReceipt } from "./testing/paths";
import { ADMIN, Sim } from "./testing/sim";

const CLIENT = 1;
const MANAGER = 700;
const PARTNER = 800;
const user = (id: number): AppUser => ({ id, firstName: null, username: null, languageCode: null });
const admin = (s: Sim, action: (typeof OWNER_ADMIN_ACTIONS)[number], body: Record<string, unknown> = {}) =>
  ownerAdmin(s.deps, user(ADMIN), action, body) as Promise<Record<string, unknown>>;
const token = (link: unknown, kind: string) => new RegExp(`start=${kind}_([a-z0-9]+)`).exec(String(link))![1];

async function withRoles() {
  const s = new Sim();
  s.deps.env.miniAppUrl = "https://inviteizi.test/app";
  await s.start(ADMIN);
  await s.click(ADMIN, uz.langUz);
  // менеджер — по ссылке mgr_ из админки
  const m = await admin(s, "ownerManagerInvite");
  await s.start(MANAGER, `mgr_${token(m.link, "mgr")}`);
  // партнёр — по ссылке join_ из админки
  const p = await admin(s, "ownerPartnerNew", {
    name: "Салон Малика",
    phone: "+7 701 123 45 67",
    rate: "1000",
    schedule: "weekly",
  });
  await s.start(PARTNER, `join_${token(p.link, "join")}`);
  await s.click(PARTNER, uz.langUz);
  // этап 3: номер телефона не спрашиваем; Kaspi — из меню «💳»
  await s.callback(PARTNER, "pn:pk", 1);
  await s.text(PARTNER, "+7 701 123 45 67");
  await s.start(CLIENT);
  await s.click(CLIENT, uz.langUz);
  return { s, partnerId: p.id as number };
}

describe("права: только админ по initData", () => {
  it("клиент, менеджер и партнёр получают 403 на каждый запрос админки; данные не меняются", async () => {
    const { s, partnerId } = await withRoles();
    const own = await nikohOrder(s, CLIENT);
    const before = JSON.stringify(await panelData(s.deps));
    const body = {
      id: partnerId,
      name: "Чужой",
      phone: "+77010000000",
      rate: "50%",
      schedule: "daily",
      amount: 1000,
      version: 0,
      code: "HACK10",
      percent: 10,
      limit: 5,
      orderId: own.id,
    };
    for (const who of [CLIENT, MANAGER, PARTNER])
      for (const action of OWNER_ADMIN_ACTIONS) {
        const r = (await ownerAdmin(s.deps, user(who), action, {
          ...body,
          id: action.includes("Manager") ? MANAGER : partnerId,
        })) as {
          error?: string;
        };
        expect(r, `${who} ${action}`).toEqual({ error: "forbidden" });
        expect(ownerAdminStatus(r.error as "forbidden")).toBe(403);
      }
    expect(JSON.stringify(await panelData(s.deps))).toBe(before);
    expect(await s.repo.getManager(MANAGER)).toMatchObject({ active: true });
  });
});

describe("партнёры", () => {
  it("новый партнёр — только ссылка join_; изменить процент и график; приостановить", async () => {
    const { s, partnerId } = await withRoles();
    // по @username партнёра не создаём: поля нет, лишнее игнорируется
    const r = await admin(s, "ownerPartnerNew", {
      name: "Дилноза",
      phone: "87019998877",
      rate: "15%",
      schedule: "monthly",
      username: "victim",
    });
    expect(r).toMatchObject({ ok: true });
    expect(String(r.link)).toMatch(/start=join_[a-z0-9]+$/);
    expect(String(r.waUz)).toContain("wa.me");
    const created = (await s.repo.getPartner(r.id as number))!;
    expect(created).toMatchObject({ username: null, telegramId: null, ratePercent: 15, schedule: "monthly" });
    expect(await admin(s, "ownerPartnerNew", { name: "X", phone: "1", rate: "abc", schedule: "weekly" })).toEqual({
      error: "bad",
    });

    const list = (await admin(s, "ownerPartners")).partners as { id: number; phone: string; joined: boolean }[];
    expect(list.find((p) => p.id === partnerId)).toMatchObject({ phone: "+7 701 123 45 67", joined: true });
    expect(list.find((p) => p.id === created.id)).toMatchObject({ joined: false });

    expect(await admin(s, "ownerPartnerTerms", { id: partnerId, rate: "20%", schedule: "daily" })).toEqual({
      ok: true,
    });
    expect(await s.repo.getPartner(partnerId)).toMatchObject({ ratePercent: 20, schedule: "daily" });
    expect(await admin(s, "ownerPartnerPause", { id: partnerId })).toEqual({ ok: true });
    const paused = (await admin(s, "ownerPartners")).partners as { id: number; paused: boolean }[];
    expect(paused.find((p) => p.id === partnerId)?.paused).toBe(true);
    // новая ссылка — только тому, кто ещё не подключился
    expect(await admin(s, "ownerPartnerLink", { id: partnerId })).toEqual({ error: "bad" });
    expect(await admin(s, "ownerPartnerLink", { id: created.id })).toMatchObject({ ok: true });
    expect(await admin(s, "ownerPartnerTerms", { id: 99999, rate: "10%", schedule: "daily" })).toEqual({
      error: "notFound",
    });
  });
});

describe("менеджеры", () => {
  it("список, приглашение mgr_, снять роль (кнопка меню — клиентская)", async () => {
    const { s } = await withRoles();
    const list = (await admin(s, "ownerManagers")).managers as { id: number }[];
    expect(list.map((m) => m.id)).toEqual([MANAGER]);
    expect(await admin(s, "ownerManagerRemove", { id: MANAGER })).toEqual({ ok: true });
    expect((await admin(s, "ownerManagers")).managers).toEqual([]);
    expect(s.tg.menuButtons.get(MANAGER)?.url).toBe("https://inviteizi.test/app");
    expect(await admin(s, "ownerManagerRemove", { id: MANAGER })).toEqual({ error: "notFound" });
    expect(staff.btn.addManager).toBeTruthy();
  });
});

describe("выплаты", () => {
  it("к выплате → «Выплачено» один раз (повтор — устарело) → история; партнёру сообщение", async () => {
    const { s, partnerId } = await withRoles();
    const p = (await s.repo.getPartner(partnerId))!;
    // новый клиент пришёл по ссылке партнёра
    await s.start(CLIENT + 1, partnerSource(p.code));
    const o = await nikohWithReceipt(s, CLIENT + 1);
    await s.callback(ADMIN, `ok:${o.number}`, 1);
    const due = (await admin(s, "ownerPayouts")).due as { id: number; amount: number; version: number }[];
    expect(due).toEqual([expect.objectContaining({ id: partnerId, amount: 1000, version: 0 })]);
    const pay = { id: partnerId, amount: 1000, version: 0 };
    expect(await admin(s, "ownerPayoutMark", { ...pay, amount: 900 })).toEqual({ error: "stale" });
    expect(await admin(s, "ownerPayoutMark", pay)).toEqual({ ok: true });
    expect(await admin(s, "ownerPayoutMark", pay)).toEqual({ error: "stale" });
    const after = await admin(s, "ownerPayouts");
    expect(after.due).toEqual([]);
    expect(after.history).toEqual([expect.objectContaining({ name: "Салон Малика", amount: 1000 })]);
    expect(s.tg.to(PARTNER).some((m) => m.text.includes("1 000"))).toBe(true);
  });
});

describe("промокоды и заказ для клиента", () => {
  it("без базы маркетинга промокоды не создаются (понятный ответ, не 500)", async () => {
    const { s } = await withRoles();
    expect(await admin(s, "ownerPromos")).toEqual({ ready: false, enabled: false, promos: [] });
    expect(await admin(s, "ownerPromoCreate", { code: "TOY10", percent: 10, limit: 5 })).toEqual({ error: "disabled" });
  });

  it("владелец заполнил приглашение → ссылка клиенту «ждёт оплату»; клиент забирает и платит сам", async () => {
    const { s } = await withRoles();
    const o = await nikohOrder(s, ADMIN);
    const list = (await admin(s, "ownerClientOrders")).orders as { id: string }[];
    expect(list.map((x) => x.id)).toContain(o.id);
    const r = await admin(s, "ownerClientLink", { orderId: o.id });
    expect(r).toMatchObject({ ok: true, url: expect.stringContaining(o.slug) });
    await s.start(CLIENT, `o_${token(r.bot, "o")}`);
    expect((await s.repo.getOrder(o.id))!.userId).toBe(CLIENT);
    // чужой заказ — нельзя
    const foreign = await nikohOrder(s, CLIENT + 2);
    expect(await admin(s, "ownerClientLink", { orderId: foreign.id })).toEqual({ error: "notFound" });
  });
});
