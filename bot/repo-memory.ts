/**
 * Repo в памяти — для тестов бота. Поведение то же, что у bot/repo-pg.ts (см. bot/repo.contract.ts).
 * Записи отдаются копиями (как из базы): изменить их снаружи нельзя.
 */
import { isReservedSlug } from "@/lib/slug";
import { summarize, type MetricEvent, type EventKind, type Period } from "@/lib/analytics";
import type { Occasion } from "@/lib/types";
import type { Repo } from "./repo";
import type {
  Lang,
  MusicRecord,
  NewOrder,
  OrderPatch,
  OrderRecord,
  OrderStatus,
  Stats,
  UserRecord,
} from "@/lib/domain";

type Options = {
  ownerId?: number;
  analyticsAdminIds?: number[];
  adminIds?: number[];
  music?: MusicRecord[];
  /** Часы (в тестах — управляемые) */
  now?: () => Date;
  /** Первый номер заказа (как identity start 101 в базе) */
  firstNumber?: number;
};

const clone = <T>(x: T): T => structuredClone(x);
const PAID: OrderStatus[] = ["active", "archived"];
/** Казахстан: UTC+5 круглый год */
const TZ_OFFSET_MS = 5 * 60 * 60_000;
const DAY = 24 * 60 * 60_000;

export class MemoryRepo implements Repo {
  private favorites = new Map<number, Set<string>>();
  private analyticsEvents = new Map<string, MetricEvent>();
  private ownerId?: number;
  private analyticsAdminIds: number[];
  private trackingSince: Date;

  async isOwner(id: number) { return this.ownerId === id; }
  async canAnalyze(id: number) { return await this.isOwner(id) || (await this.isAdmin(id) && this.analyticsAdminIds.includes(id)); }
  async analytics(actorId: number, period: Period, now: Date, customers = false) {
    const owner = await this.isOwner(actorId);
    if (!(await this.canAnalyze(actorId)) || (customers && !owner)) throw new Error("Analytics access denied");
    return summarize({ orders: [...this.orders.values()], users: [...this.users.values()], events: [...this.analyticsEvents.values()], since: this.trackingSince, music: this.music }, period, now, customers && owner);
  }
  async listFavorites(userId: number) { return [...(this.favorites.get(userId) ?? [])]; }
  async setFavorite(userId: number, templateId: string, saved: boolean) {
    if (!this.favorites.has(userId)) this.favorites.set(userId, new Set());
    const set = this.favorites.get(userId)!;
    if (!saved) { set.delete(templateId); return; }
    set.add(templateId);
    this.analyticsEvents.set(`favorite:${userId}:${templateId}`, this.analyticsEvents.get(`favorite:${userId}:${templateId}`) ?? { kind: "design_favorited", userId, target: templateId, createdAt: this.now() });
  }
  async recordEvent(userId: number, kind: Extract<EventKind, "demo_opened" | "design_selected">, target: string, key: string) {
    const id = `${kind}:${userId}:${key}`;
    if (!this.analyticsEvents.has(id)) this.analyticsEvents.set(id, { kind, userId, target, createdAt: this.now() });
  }
  private users = new Map<number, UserRecord>();
  private orders = new Map<string, OrderRecord>();
  /** Все адреса, которые когда-либо были у заказов: slug → id заказа (как таблица slug_history) */
  private slugHistory = new Map<string, string>();
  private music: MusicRecord[];
  private adminIds: number[];
  private now: () => Date;
  private nextNumber: number;
  private nextId = 1;

  constructor(o: Options = {}) {
    this.ownerId = o.ownerId;
    this.analyticsAdminIds = o.analyticsAdminIds ?? [];
    this.trackingSince = o.now?.() ?? new Date();
    this.adminIds = o.adminIds ?? [];
    this.music = clone(o.music ?? []);
    this.now = o.now ?? (() => new Date());
    this.nextNumber = o.firstNumber ?? 101;
  }

  // ── Пользователи ──
  async getUser(id: number) {
    const u = this.users.get(id);
    return u ? clone(u) : null;
  }

  async touchUser(u: { id: number; username?: string | null; firstName?: string | null; source?: string | null }) {
    const now = this.now();
    const old = this.users.get(u.id);
    const rec: UserRecord = old
      ? {
          ...old,
          username: u.username !== undefined ? u.username : old.username,
          firstName: u.firstName !== undefined ? u.firstName : old.firstName,
          lastSeenAt: now,
        }
      : {
          id: u.id,
          username: u.username ?? null,
          firstName: u.firstName ?? null,
          lang: null,
          step: "start",
          state: {},
          source: u.source ?? null,
          createdAt: now,
          lastSeenAt: now,
        };
    this.users.set(u.id, rec);
    return clone(rec);
  }

  async setLang(id: number, lang: Lang) {
    const u = this.mustUser(id);
    u.lang = lang;
  }

  async saveStep(id: number, step: string, state: Record<string, unknown>) {
    const u = this.mustUser(id);
    u.step = step;
    u.state = clone(state);
  }

  async claimStep(id: number, expectedQ: number, nextQ: number) {
    const u = this.mustUser(id);
    if (Number(u.state.q ?? 0) !== expectedQ) return false;
    u.state = { ...u.state, q: nextQ };
    return true;
  }

  // ── Админы ──
  async isAdmin(id: number) {
    return this.adminIds.includes(id);
  }

  async listAdminIds() {
    return [...this.adminIds];
  }

  // ── Музыка ──
  async listMusic(occasion?: Occasion) {
    const fits = (m: MusicRecord) => !occasion || !m.occasion || m.occasion === occasion;
    return clone([...this.music].filter(fits).sort((a, b) => a.sort - b.sort));
  }

  async setMusicTelegramFileId(musicId: string, fileId: string) {
    const m = this.music.find((x) => x.id === musicId);
    if (m) m.telegramFileId = fileId;
  }

  // ── Заказы ──
  async createOrder(o: NewOrder) {
    const now = this.now();
    let slug = o.slugBase;
    for (let i = 2; await this.isSlugTaken(slug); i++) slug = `${o.slugBase}-${i}`;
    this.slugHistory.set(slug, `00000000-0000-4000-8000-${String(this.nextId).padStart(12, "0")}`);
    const rec: OrderRecord = {
      id: `00000000-0000-4000-8000-${String(this.nextId++).padStart(12, "0")}`,
      number: this.nextNumber++,
      userId: o.userId,
      status: o.status ?? "draft",
      occasion: o.occasion,
      format: o.format,
      templateId: o.templateId,
      data: clone(o.data),
      music: clone(o.music),
      slug,
      amount: o.amount,
      receipt: null,
      rejectReason: null,
      createdAt: now,
      updatedAt: now,
      receiptAt: null,
      paidAt: null,
      paymentRemindedAt: null,
      adminRemindedAt: null,
      expiresAt: null,
    };
    this.orders.set(rec.id, rec);
    return clone(rec);
  }

  async getOrder(id: string) {
    const o = this.orders.get(id);
    return o ? clone(o) : null;
  }

  async getOrderByNumber(n: number) {
    return this.pick((o) => o.number === n);
  }

  async getOrderBySlug(slug: string) {
    return this.pick((o) => o.slug === slug);
  }

  async listOrdersByUser(userId: number) {
    return this.list((o) => o.userId === userId);
  }

  async listOrdersByStatus(statuses: OrderStatus[]) {
    return this.list((o) => statuses.includes(o.status));
  }

  async findOrders(query: string) {
    const q = query.trim().toLowerCase().replace(/^#/, "");
    if (!q) return [];
    return this.list((o) => {
      if (/^\d+$/.test(q) && o.number === Number(q)) return true;
      const d = o.data;
      const username = this.users.get(o.userId)?.username ?? "";
      return [o.slug, d.groom, d.bride, d.person, d.hosts, username]
        .filter(Boolean)
        .some((s) => String(s).toLowerCase().includes(q));
    });
  }

  async updateOrder(id: string, patch: OrderPatch) {
    const o = this.orders.get(id);
    if (!o) throw new Error(`Заказ не найден: ${id}`);
    if (patch.slug !== undefined && patch.slug !== o.slug) {
      // как триггер в базе: чужой (в т.ч. прежний чужой) адрес — ошибка уникальности
      if (await this.isSlugTaken(patch.slug, id)) throw new Error(`Адрес занят: ${patch.slug}`);
      this.slugHistory.set(patch.slug, id);
    }
    Object.assign(o, clone(patch), { updatedAt: this.now() });
    return clone(o);
  }

  async transition(id: string, from: OrderStatus[], to: OrderStatus, patch: OrderPatch = {}) {
    const o = this.orders.get(id);
    if (!o || !from.includes(o.status)) return null;
    return this.updateOrder(id, { ...patch, status: to });
  }

  async isSlugTaken(slug: string, exceptOrderId?: string) {
    if (isReservedSlug(slug)) return true;
    for (const o of this.orders.values()) if (o.slug === slug && o.id !== exceptOrderId) return true;
    const owner = this.slugHistory.get(slug);
    return owner !== undefined && owner !== exceptOrderId;
  }

  async resolveSlug(slug: string) {
    const owner = this.slugHistory.get(slug);
    return owner ? (this.orders.get(owner)?.slug ?? null) : null;
  }

  // ── Напоминания и статистика ──
  async ordersAwaitingAdmin(before: Date) {
    return this.list(
      (o) => o.status === "receipt_sent" && !!o.receiptAt && o.receiptAt < before && !o.adminRemindedAt,
    );
  }

  async ordersAbandonedAtPayment(before: Date) {
    return this.list(
      (o) =>
        (o.status === "preview" || o.status === "awaiting_payment") &&
        o.updatedAt < before &&
        !o.paymentRemindedAt,
    );
  }

  async stats(now: Date): Promise<Stats> {
    // «Сегодня» — с полуночи по времени Казахстана; неделя — 7 суток; месяц — 30 суток
    const localMidnight = Math.floor((now.getTime() + TZ_OFFSET_MS) / DAY) * DAY - TZ_OFFSET_MS;
    const since = { today: localMidnight, week: now.getTime() - 7 * DAY, month: now.getTime() - 30 * DAY, total: -Infinity };
    const all = [...this.orders.values()];
    const paid = all.filter((o) => PAID.includes(o.status));
    const count = (from: number) => all.filter((o) => o.createdAt.getTime() >= from).length;
    const sum = (from: number) =>
      paid.filter((o) => (o.paidAt ?? o.updatedAt).getTime() >= from).reduce((s, o) => s + o.amount, 0);
    const byStatus: Stats["byStatus"] = {};
    for (const o of all) byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;
    const sources = new Map<string, { source: string; users: number; paid: number }>();
    for (const u of this.users.values()) {
      const key = u.source ?? "—";
      const row = sources.get(key) ?? { source: key, users: 0, paid: 0 };
      row.users++;
      row.paid += paid.filter((o) => o.userId === u.id).length;
      sources.set(key, row);
    }
    return {
      orders: { today: count(since.today), week: count(since.week), month: count(since.month), total: all.length },
      revenue: { today: sum(since.today), week: sum(since.week), month: sum(since.month), total: sum(since.total) },
      byStatus,
      bySource: [...sources.values()],
    };
  }

  // ── Внутреннее ──
  private mustUser(id: number) {
    const u = this.users.get(id);
    if (!u) throw new Error(`Пользователь не найден: ${id}`);
    return u;
  }

  private pick(f: (o: OrderRecord) => boolean) {
    for (const o of this.orders.values()) if (f(o)) return clone(o);
    return null;
  }

  /** Новые первыми */
  private list(f: (o: OrderRecord) => boolean) {
    return clone([...this.orders.values()].filter(f).sort((a, b) => b.number - a.number));
  }
}
