/**
 * Общий набор тестов поведения Repo. Запускают обе реализации:
 *  - bot/repo-memory.test.ts — всегда;
 *  - bot/repo-pg.test.ts (БЭКЕНД) — при DATABASE_URL / DB_SERVER_PASSWORD.
 *
 * Тесты не рассчитывают на пустую базу: всё создаётся с user_id из диапазона
 * CONTRACT_USER_BASE (9 000 000 000+) и проверяется только среди своих записей.
 * Удаление тестовых записей в pg — забота того, кто запускает (afterAll по user_id >= CONTRACT_USER_BASE).
 */
import { describe, expect, it } from "vitest";
import type { Repo } from "./repo";
import type { InvitationData, NewOrder } from "@/lib/domain";

export const CONTRACT_USER_BASE = 9_000_000_000;

/** Уникальная метка запуска — чтобы параллельные/повторные прогоны не мешали друг другу */
function runTag() {
  return Math.random().toString(36).slice(2, 8);
}

function nikohData(groom: string, bride: string): InvitationData {
  return {
    occasion: "nikoh",
    groom,
    bride,
    relation: "farzand",
    hosts: "Каримовлар оиласи",
    events: [
      {
        kind: "nikohBazm",
        date: "2026-12-12",
        time: "18:00",
        venueName: "«Наврўз» тўйхонаси",
        address: "Сайрам, Амир Темур кўчаси 45",
      },
    ],
  };
}

export function repoContract(makeRepo: () => Promise<Repo>) {
  describe("Repo (общий контракт)", () => {
    let seq = 0;
    const tag = runTag();
    /** Новый id пользователя в тестовом диапазоне */
    const uid = () => CONTRACT_USER_BASE + Math.floor(Math.random() * 1_000_000) * 100 + ++seq;

    async function newOrder(repo: Repo, userId: number, over: Partial<NewOrder> = {}) {
      await repo.touchUser({ id: userId, username: `u${userId}`, firstName: "Тест" });
      return repo.createOrder({
        userId,
        occasion: "nikoh",
        format: "animated",
        templateId: "ganch-peshtoq",
        data: nikohData("Азиз", "Мадина"),
        music: { kind: "none" },
        amount: 10_000,
        slugBase: `t-${tag}-aziz-madina`,
        ...over,
      });
    }

    // ── Пользователи ──
    it("getUser возвращает null для незнакомого", async () => {
      const repo = await makeRepo();
      expect(await repo.getUser(uid())).toBeNull();
    });

    it("touchUser создаёт пользователя: lang null, step start, source из /start", async () => {
      const repo = await makeRepo();
      const id = uid();
      const u = await repo.touchUser({ id, username: "aziz", firstName: "Азиз", source: "insta" });
      expect(u).toMatchObject({ id, username: "aziz", firstName: "Азиз", lang: null, step: "start", source: "insta" });
      expect(u.state).toEqual({});
      expect((await repo.getUser(id))?.source).toBe("insta");
    });

    it("touchUser не перезаписывает source, но обновляет username", async () => {
      const repo = await makeRepo();
      const id = uid();
      await repo.touchUser({ id, username: "old", source: "insta" });
      const u = await repo.touchUser({ id, username: "new", source: "qr_99" });
      expect(u.source).toBe("insta");
      expect(u.username).toBe("new");
    });

    it("setLang и saveStep сохраняются", async () => {
      const repo = await makeRepo();
      const id = uid();
      await repo.touchUser({ id });
      await repo.setLang(id, "ru");
      await repo.saveStep(id, "groom", { occasion: "nikoh", n: 1, list: ["a"] });
      const u = await repo.getUser(id);
      expect(u?.lang).toBe("ru");
      expect(u?.step).toBe("groom");
      expect(u?.state).toEqual({ occasion: "nikoh", n: 1, list: ["a"] });
    });

    it("claimStep: занимает ответ один раз, остальное состояние не трогает", async () => {
      const repo = await makeRepo();
      const id = uid();
      await repo.touchUser({ id });
      await repo.saveStep(id, "review", { q: 7, templateId: "sapfir" });
      const [a, b] = await Promise.all([repo.claimStep(id, 7, 8), repo.claimStep(id, 7, 8)]);
      expect([a, b].filter(Boolean)).toHaveLength(1);
      expect((await repo.getUser(id))?.state).toEqual({ q: 8, templateId: "sapfir" });
      expect(await repo.claimStep(id, 7, 8)).toBe(false);
    });

    // ── Заказы ──
    it("createOrder: номер по порядку, статус draft по умолчанию, slug = slugBase", async () => {
      const repo = await makeRepo();
      const u = uid();
      const a = await newOrder(repo, u, { slugBase: `t-${tag}-first` });
      const b = await newOrder(repo, u, { slugBase: `t-${tag}-second` });
      expect(a.status).toBe("draft");
      expect(a.slug).toBe(`t-${tag}-first`);
      expect(b.number).toBeGreaterThan(a.number);
      expect(a.data.groom).toBe("Азиз");
      expect(a.data.events[0].time).toBe("18:00");
      expect(a.music).toEqual({ kind: "none" });
      expect(a.receipt).toBeNull();
      expect(a.paidAt).toBeNull();
    });

    it("createOrder: занятый slug получает -2, потом -3", async () => {
      const repo = await makeRepo();
      const u = uid();
      const base = `t-${tag}-busy`;
      const a = await newOrder(repo, u, { slugBase: base });
      const b = await newOrder(repo, u, { slugBase: base });
      const c = await newOrder(repo, u, { slugBase: base });
      expect([a.slug, b.slug, c.slug]).toEqual([base, `${base}-2`, `${base}-3`]);
    });

    it("createOrder сохраняет статус и музыку из списка/свою", async () => {
      const repo = await makeRepo();
      const u = uid();
      const o = await newOrder(repo, u, {
        status: "preview",
        music: { kind: "own", fileId: "FILE1", url: "https://x/m.mp3", title: "Ёр-ёр" },
        slugBase: `t-${tag}-music`,
      });
      const back = await repo.getOrder(o.id);
      expect(back?.status).toBe("preview");
      expect(back?.music).toEqual({ kind: "own", fileId: "FILE1", url: "https://x/m.mp3", title: "Ёр-ёр" });
    });

    it("getOrder / getOrderByNumber / getOrderBySlug находят один и тот же заказ", async () => {
      const repo = await makeRepo();
      const o = await newOrder(repo, uid(), { slugBase: `t-${tag}-get` });
      expect((await repo.getOrder(o.id))?.id).toBe(o.id);
      expect((await repo.getOrderByNumber(o.number))?.id).toBe(o.id);
      expect((await repo.getOrderBySlug(o.slug))?.id).toBe(o.id);
      expect(await repo.getOrderBySlug(`t-${tag}-nope`)).toBeNull();
      expect(await repo.getOrderByNumber(-1)).toBeNull();
    });

    it("listOrdersByUser — только заказы клиента, новые первыми", async () => {
      const repo = await makeRepo();
      const u1 = uid();
      const u2 = uid();
      const a = await newOrder(repo, u1, { slugBase: `t-${tag}-l1` });
      const b = await newOrder(repo, u1, { slugBase: `t-${tag}-l2` });
      await newOrder(repo, u2, { slugBase: `t-${tag}-l3` });
      const list = await repo.listOrdersByUser(u1);
      expect(list.map((o) => o.id)).toEqual([b.id, a.id]);
    });

    it("listOrdersByStatus фильтрует по статусам", async () => {
      const repo = await makeRepo();
      const u = uid();
      const a = await newOrder(repo, u, { status: "receipt_sent", slugBase: `t-${tag}-s1` });
      const b = await newOrder(repo, u, { status: "preview", slugBase: `t-${tag}-s2` });
      const mine = (await repo.listOrdersByStatus(["receipt_sent"])).filter((o) => o.userId === u);
      expect(mine.map((o) => o.id)).toEqual([a.id]);
      const both = (await repo.listOrdersByStatus(["receipt_sent", "preview"])).filter((o) => o.userId === u);
      expect(both.map((o) => o.id).sort()).toEqual([a.id, b.id].sort());
    });

    it("findOrders ищет по номеру, slug, именам, хозяевам и username без учёта регистра", async () => {
      const repo = await makeRepo();
      const u = uid();
      const groom = `Жасур${tag}`;
      const o = await newOrder(repo, u, {
        data: { ...nikohData(groom, "Нилуфар"), hosts: `Алиевлар${tag} оиласи` },
        slugBase: `t-${tag}-find`,
      });
      const ids = async (q: string) => (await repo.findOrders(q)).map((x) => x.id);
      expect(await ids(groom.toUpperCase())).toContain(o.id);
      expect(await ids(`алиевлар${tag}`)).toContain(o.id);
      expect(await ids(`t-${tag}-find`)).toContain(o.id);
      expect(await ids(String(o.number))).toContain(o.id);
      expect(await ids(`#${o.number}`)).toContain(o.id);
      expect(await ids(`U${u}`)).toContain(o.id);
      expect(await ids(`ничего-${tag}-нет`)).toEqual([]);
    });

    it("updateOrder меняет поля и updatedAt", async () => {
      const repo = await makeRepo();
      const o = await newOrder(repo, uid(), { slugBase: `t-${tag}-upd` });
      await new Promise((r) => setTimeout(r, 15));
      const paidAt = new Date("2026-11-01T10:00:00Z");
      const u = await repo.updateOrder(o.id, {
        receipt: { fileId: "PH1", kind: "photo" },
        paidAt,
        data: nikohData("Азиз", "Зарина"),
        music: { kind: "list", musicId: "yor-yor" },
      });
      expect(u.receipt).toEqual({ fileId: "PH1", kind: "photo" });
      expect(u.paidAt?.getTime()).toBe(paidAt.getTime());
      expect(u.data.bride).toBe("Зарина");
      expect(u.slug).toBe(o.slug);
      expect(u.updatedAt.getTime()).toBeGreaterThan(o.updatedAt.getTime());
    });

    it("transition меняет статус только из разрешённых и возвращает null при повторе", async () => {
      const repo = await makeRepo();
      const o = await newOrder(repo, uid(), { status: "receipt_sent", slugBase: `t-${tag}-tr` });
      const first = await repo.transition(o.id, ["receipt_sent"], "active", { paidAt: new Date() });
      expect(first?.status).toBe("active");
      expect(first?.paidAt).toBeInstanceOf(Date);
      const second = await repo.transition(o.id, ["receipt_sent"], "active");
      expect(second).toBeNull();
      expect((await repo.getOrder(o.id))?.status).toBe("active");
    });

    it("isSlugTaken учитывает исключение своего заказа", async () => {
      const repo = await makeRepo();
      const o = await newOrder(repo, uid(), { slugBase: `t-${tag}-taken` });
      expect(await repo.isSlugTaken(o.slug)).toBe(true);
      expect(await repo.isSlugTaken(o.slug, o.id)).toBe(false);
      expect(await repo.isSlugTaken(`t-${tag}-free`)).toBe(false);
    });

    // ── Адрес никогда не переиспользуется (старые гости не увидят чужой тўй) ──
    it("сменённый адрес остаётся занятым: новый заказ его не получит, старый адрес ведёт на новый", async () => {
      const repo = await makeRepo();
      const base = `t-${tag}-hist`;
      const a = await newOrder(repo, uid(), { slugBase: base });
      await repo.updateOrder(a.id, { slug: `${base}-yangi` });
      expect(await repo.isSlugTaken(base)).toBe(true);
      expect(await repo.isSlugTaken(base, a.id)).toBe(false); // свой старый адрес можно вернуть
      const b = await newOrder(repo, uid(), { slugBase: base });
      expect(b.slug).toBe(`${base}-2`);
      expect(await repo.resolveSlug(base)).toBe(`${base}-yangi`);
      expect(await repo.resolveSlug(b.slug)).toBe(b.slug);
      expect(await repo.resolveSlug(`t-${tag}-nobody`)).toBeNull();
    });

    it("чужой старый адрес занять нельзя даже прямой правкой", async () => {
      const repo = await makeRepo();
      const base = `t-${tag}-steal`;
      const a = await newOrder(repo, uid(), { slugBase: base });
      await repo.updateOrder(a.id, { slug: `${base}-new` });
      const b = await newOrder(repo, uid(), { slugBase: `t-${tag}-other` });
      await expect(repo.updateOrder(b.id, { slug: base })).rejects.toThrow();
      expect((await repo.getOrder(b.id))?.slug).toBe(`t-${tag}-other`);
    });

    it("запретные адреса (demo, catalog, api…) заняты всегда", async () => {
      const repo = await makeRepo();
      for (const s of ["demo", "catalog", "api", "admin", "namuna"]) expect(await repo.isSlugTaken(s)).toBe(true);
    });

    // ── Напоминания ──
    it("ordersAwaitingAdmin: чек раньше before и админу ещё не напоминали", async () => {
      const repo = await makeRepo();
      const u = uid();
      const old = new Date(Date.now() - 60 * 60_000);
      const a = await newOrder(repo, u, { status: "receipt_sent", slugBase: `t-${tag}-aw1` });
      await repo.updateOrder(a.id, { receiptAt: old });
      const b = await newOrder(repo, u, { status: "receipt_sent", slugBase: `t-${tag}-aw2` });
      await repo.updateOrder(b.id, { receiptAt: new Date() });
      const c = await newOrder(repo, u, { status: "receipt_sent", slugBase: `t-${tag}-aw3` });
      await repo.updateOrder(c.id, { receiptAt: old, adminRemindedAt: new Date() });
      const before = new Date(Date.now() - 30 * 60_000);
      const mine = (await repo.ordersAwaitingAdmin(before)).filter((o) => o.userId === u);
      expect(mine.map((o) => o.id)).toEqual([a.id]);
    });

    it("ordersAbandonedAtPayment: preview/awaiting_payment, не менялся с before, без напоминания", async () => {
      const repo = await makeRepo();
      const u = uid();
      const a = await newOrder(repo, u, { status: "awaiting_payment", slugBase: `t-${tag}-ab1` });
      const b = await newOrder(repo, u, { status: "preview", slugBase: `t-${tag}-ab2` });
      const c = await newOrder(repo, u, { status: "awaiting_payment", slugBase: `t-${tag}-ab3` });
      await repo.updateOrder(c.id, { paymentRemindedAt: new Date() });
      await newOrder(repo, u, { status: "receipt_sent", slugBase: `t-${tag}-ab4` });
      const future = new Date(Date.now() + 60_000);
      const mine = (await repo.ordersAbandonedAtPayment(future)).filter((o) => o.userId === u);
      expect(mine.map((o) => o.id).sort()).toEqual([a.id, b.id].sort());
      const past = new Date(Date.now() - 60 * 60_000);
      const none = (await repo.ordersAbandonedAtPayment(past)).filter((o) => o.userId === u);
      expect(none).toEqual([]);
    });
    // ── Роли (v2) ──
    it("менеджер: назначить, снять, вернуть; в staffIds и после снятия", async () => {
      const repo = await makeRepo();
      const id = uid();
      const m = await repo.addManager({ telegramId: id, code: `c${tag}${seq}`.slice(0, 32), username: "mgr", firstName: "Менеджер", invitedBy: 1 });
      expect(m).toMatchObject({ telegramId: id, active: true, invitedBy: 1 });
      expect(await repo.getManager(id)).toMatchObject({ telegramId: id });
      expect(await repo.staffIds()).toContain(id);
      expect(await repo.removeManager(id, new Date())).toBe(true);
      expect(await repo.removeManager(id, new Date())).toBe(false);
      expect(await repo.getManager(id)).toBeNull();
      expect(await repo.staffIds()).toContain(id);
      await repo.addManager({ telegramId: id, code: m.code, username: "mgr", firstName: "Менеджер", invitedBy: 1 });
      expect((await repo.getManager(id))?.code).toBe(m.code);
    });

    it("одноразовая ссылка: срабатывает один раз, не после срока, только своего вида", async () => {
      const repo = await makeRepo();
      const now = new Date();
      const base = `${tag}${seq}`.replace(/[^0-9a-f]/g, "a");
      const hash = (n: number) => `${base}${n}`.padEnd(64, "0").slice(0, 64);
      await repo.createInvite({ tokenHash: hash(1), kind: "manager", createdBy: 7, expiresAt: new Date(+now + 60_000) });
      await repo.createInvite({ tokenHash: hash(2), kind: "manager", createdBy: 7, expiresAt: new Date(+now - 1) });
      expect(await repo.useInvite(hash(1), "partner", uid(), now)).toEqual({ status: "none" });
      expect(await repo.useInvite(hash(1), "manager", uid(), now)).toEqual({ status: "ok", createdBy: 7, partnerId: null });
      expect(await repo.useInvite(hash(1), "manager", uid(), now)).toEqual({ status: "used" });
      expect(await repo.useInvite(hash(2), "manager", uid(), now)).toEqual({ status: "expired" });
      expect(await repo.useInvite(hash(3), "manager", uid(), now)).toEqual({ status: "none" });
    });

    it("заказ для клиента: клиент забирает один раз, продавец — нет, оплаченный — закрыт", async () => {
      const repo = await makeRepo();
      const seller = uid();
      const client = uid();
      const other = uid();
      await repo.touchUser({ id: client });
      const o = await newOrder(repo, seller, { status: "preview" });
      const h = `${tag}${seq}`.padEnd(64, "b").replace(/[^0-9a-f]/g, "c").slice(0, 64);
      await repo.issueClientOrder({ orderId: o.id, createdBy: seller, tokenHash: h, refSource: "m_abcd1234" });
      expect(await repo.clientOrderRef(o.id)).toBeNull();
      expect((await repo.claimClientOrder(h, seller, new Date())).status).toBe("creator");
      const r = await repo.claimClientOrder(h, client, new Date());
      expect(r.status).toBe("claimed");
      expect(r.order?.userId).toBe(client);
      expect((await repo.claimClientOrder(h, client, new Date())).status).toBe("mine");
      expect((await repo.claimClientOrder(h, other, new Date())).status).toBe("used");
      expect(await repo.clientOrderRef(o.id)).toEqual({ ref: "m_abcd1234" });

      const paid = await newOrder(repo, seller, { status: "preview" });
      const h2 = h.slice(0, 63) + "f";
      await repo.issueClientOrder({ orderId: paid.id, createdBy: seller, tokenHash: h2, refSource: null });
      await repo.transition(paid.id, ["preview"], "receipt_sent");
      expect((await repo.claimClientOrder(h2, client, new Date())).status).toBe("closed");
      expect((await repo.getOrder(paid.id))?.userId).toBe(seller);
    });
  });
}
