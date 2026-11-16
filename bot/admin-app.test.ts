/**
 * Админское Mini App владельца (16.11.2026): кнопка меню по ролям, бесплатная выдача с причиной,
 * подтверждение чека из админки. Права — только по проверенному initData пользователя (на сервере).
 */
import { describe, expect, it } from "vitest";
import { uz } from "@/texts/bot-uz";
import { staff } from "@/texts/bot-ru";
import type { AppUser } from "@/lib/tg-init-data";
import * as app from "./app/service";
import { ownerPanel } from "./app/owner";
import { ownerAct } from "./app/owner-actions";
import { panelData } from "./flow/partners";
import { MENU_TEXT } from "./flow/menu-button";
import { nikohOrder, nikohWithReceipt } from "./testing/paths";
import { ADMIN, Sim } from "./testing/sim";

const CLIENT = 1;
const MANAGER = 700;
const user = (id: number): AppUser => ({ id, firstName: null, username: null, languageCode: null });
const withApp = () => {
  const s = new Sim();
  s.deps.env.miniAppUrl = "https://inviteizi.test/app";
  return s;
};

describe("кнопка меню у поля ввода — по роли", () => {
  it("владелец — «InviteIZI · Админ» на /app/owner; клиент — клиентское приложение", async () => {
    const s = withApp();
    await s.start(ADMIN);
    await s.click(ADMIN, uz.langUz);
    expect(s.tg.menuButtons.get(ADMIN)).toEqual({ text: MENU_TEXT.owner, url: "https://inviteizi.test/app/owner" });
    await s.start(CLIENT);
    await s.click(CLIENT, uz.langUz);
    expect(s.tg.menuButtons.get(CLIENT)).toEqual({ text: uz.menuButton, url: "https://inviteizi.test/app" });
  });

  it("менеджер — панель при назначении; после снятия — клиентская кнопка", async () => {
    const s = withApp();
    await s.start(ADMIN);
    await s.click(ADMIN, uz.langUz);
    await s.click(ADMIN, staff.btn.settings);
    await s.click(ADMIN, staff.btn.addManager);
    const text = [...s.tg.to(ADMIN)].reverse().find((m) => /start=mgr_/.test(m.text))!.text;
    await s.start(MANAGER, `mgr_${/start=mgr_([a-z0-9]+)/.exec(text)![1]}`);
    expect(s.tg.menuButtons.get(MANAGER)).toEqual({ text: MENU_TEXT.staff, url: "https://inviteizi.test/app/panel" });
    await s.callback(ADMIN, `pn:mrm:${MANAGER}`, s.last(ADMIN).id);
    expect(s.tg.menuButtons.get(MANAGER)?.url).toBe("https://inviteizi.test/app");
  });
});

describe("бесплатная выдача владельцем", () => {
  it("клиент не может: 403, заказ не меняется", async () => {
    const s = withApp();
    const o = await nikohOrder(s, CLIENT);
    expect(await app.staffFreeIssue(s.deps, user(CLIENT), o.id, "gift")).toEqual({ error: "forbidden" });
    expect((await s.repo.getOrder(o.id))!.status).toBe(o.status);
    expect((await app.openSession(s.deps, user(CLIENT))).staff).toBe(false);
  });

  it("владелец: без причины нельзя; с причиной — ссылка готова, сумма 0, причина в заказе, в продажах не считается", async () => {
    const s = withApp();
    const o = await nikohOrder(s, ADMIN);
    expect((await app.openSession(s.deps, user(ADMIN))).staff).toBe(true);
    expect(await app.staffFreeIssue(s.deps, user(ADMIN), o.id, "free")).toEqual({ error: "reason" });
    const r = await app.staffFreeIssue(s.deps, user(ADMIN), o.id, "gift");
    expect(r).toMatchObject({ ok: true });
    const done = (await s.repo.getOrder(o.id))!;
    expect(done).toMatchObject({ status: "active", amount: 0 });
    expect(done.data.staffGrant).toMatchObject({ reason: "gift", by: ADMIN });
    expect(s.tg.to(ADMIN).some((m) => m.text.includes(`/${done.slug}`))).toBe(true);
    // повтор — заказ уже закрыт
    expect(await app.staffFreeIssue(s.deps, user(ADMIN), o.id, "gift")).toEqual({ error: "closed" });
    const panel = await ownerPanel(s.deps, ADMIN, "d");
    expect(panel).toMatchObject({ cards: { paid: 0, revenue: 0 }, free: { gift: 1, sample: 0, cash: 0, replace: 0 } });
    expect((await panelData(s.deps)).earnings).toEqual([]);
  });

  it("чужой заказ владелец бесплатно не выдаёт", async () => {
    const s = withApp();
    const o = await nikohOrder(s, CLIENT);
    expect(await app.staffFreeIssue(s.deps, user(ADMIN), o.id, "sample")).toEqual({ error: "notFound" });
  });
});

describe("действия админки — тем же кодом, что кнопки бота", () => {
  it("✅ чека из панели: заказ оплачен, клиент получил ссылку; клиенту действие запрещено", async () => {
    const s = withApp();
    const o = await nikohWithReceipt(s, CLIENT);
    const panel = await ownerPanel(s.deps, ADMIN, "d");
    expect("receipts" in panel && panel.receipts.map((r) => r.number)).toEqual([o.number]);
    expect(await ownerAct(s.deps, user(CLIENT), `ok:${o.number}`)).toEqual({ error: "forbidden" });
    expect((await s.repo.getOrder(o.id))!.status).toBe("receipt_sent");
    expect(await ownerAct(s.deps, user(ADMIN), `ok:${o.number}`)).toEqual({ ok: true });
    expect((await s.repo.getOrder(o.id))!.status).toBe("active");
    expect(s.tg.to(CLIENT).some((m) => m.text.includes(`/${o.slug}`))).toBe(true);
  });

  it("❌ с причиной; неизвестные действия и команды не выполняются", async () => {
    const s = withApp();
    const o = await nikohWithReceipt(s, CLIENT);
    expect(await ownerAct(s.deps, user(ADMIN), `nr:${o.number}:money`)).toEqual({ ok: true });
    expect((await s.repo.getOrder(o.id))!.status).toBe("rejected");
    for (const bad of ["pn:mrm:700", "po:1:1000:1", "/start", "/promo_create X 100 1", "ok:1;drop", 5])
      expect(await ownerAct(s.deps, user(ADMIN), bad)).toEqual({ error: "bad" });
  });
});
