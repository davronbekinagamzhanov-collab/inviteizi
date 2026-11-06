import { RSVP_IP_HOUR_LIMIT, RSVP_ORDER_LIMIT, type RsvpInput, type RsvpRecord } from "@/lib/rsvp";
import { earningFor, type ManagerPayout, type PanelOrder, type PanelSnapshot, type Partner, type PartnerEarning, type PartnerPayout, type PayoutSchedule } from "@/lib/owner-panel";
import type { NewPartner, Notice, PartnerPatch } from "./repo";
import type { BotErrorEntry } from "./errors";
import type { ClaimStatus, InviteKind, InviteUse, Manager } from "@/lib/roles";
/**
 * Repo в памяти — для тестов бота. Поведение то же, что у bot/repo-pg.ts (см. bot/repo.contract.ts).
 * Записи отдаются копиями (как из базы): изменить их снаружи нельзя.
 */
import { isReservedSlug } from "@/lib/slug";
import { summarize, withoutStaffAnalytics, type MetricEvent, type EventKind, type Period } from "@/lib/analytics";
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
  partners: Partner[] = [];
  earnings: PartnerEarning[] = [];
  payouts: PartnerPayout[] = [];
  /** Как до применения миграции партнёров */
  partnersReady = true;
  rsvp: (RsvpInput & { createdAt: Date; updatedAt: Date })[] = [];
  async staffIds() {
    // Менеджеры (и снятые): их собственные заказы и клики — не продажи
    return [...new Set([...this.adminIds, ...(this.ownerId ? [this.ownerId] : []), ...this.managers.map((m) => m.telegramId)])];
  }
  async saveRsvp(input: RsvpInput) {
    const now = this.now();
    const old = this.rsvp.find((r) => r.orderId === input.orderId && r.visitorKey === input.visitorKey);
    if (old) {
      Object.assign(old, input, { updatedAt: now });
      return "ok" as const;
    }
    const order = this.rsvp.filter((r) => r.orderId === input.orderId);
    const hour = order.filter((r) => r.ipHash === input.ipHash && +r.createdAt > +now - 3_600_000);
    if (order.length >= RSVP_ORDER_LIMIT || hour.length >= RSVP_IP_HOUR_LIMIT) return "limited" as const;
    this.rsvp.push({ ...input, createdAt: now, updatedAt: now });
    return "ok" as const;
  }
  rsvpDigestAt = new Map<string, Date>();
  async rsvpDigestDue(dayStart: Date) {
    return [...this.orders.values()]
      .filter((o) => {
        const since = this.rsvpDigestAt.get(o.id);
        return o.status === "active" && o.data.rsvp === true && (!since || since < dayStart) && this.rsvp.some((r) => r.orderId === o.id && (!since || r.updatedAt > since));
      })
      .map((o) => ({ id: o.id, number: o.number, userId: o.userId, since: this.rsvpDigestAt.get(o.id) ?? null }));
  }
  async claimRsvpDigest(orderId: string, dayStart: Date, now: Date) {
    const since = this.rsvpDigestAt.get(orderId);
    if (since && since >= dayStart) return false;
    this.rsvpDigestAt.set(orderId, now);
    return true;
  }
  async listRsvp(orderId: string): Promise<RsvpRecord[]> {
    return this.rsvp.filter((r) => r.orderId === orderId).sort((a, b) => +b.updatedAt - +a.updatedAt).map(({ name, guests, attending, updatedAt }) => ({ name, guests, attending, updatedAt }));
  }
  async panelSnapshot(): Promise<PanelSnapshot> {
    const orders = [...this.orders.values()].map((o): PanelOrder => {
      const u = this.users.get(o.userId);
      return { id: o.id, number: o.number, userId: o.userId, username: u?.username ?? null, firstName: u?.firstName ?? null, status: o.status, occasion: o.occasion, format: o.format, templateId: o.templateId, musicKind: o.music.kind, amount: o.amount, createdAt: o.createdAt, paidAt: o.paidAt, updatedAt: o.updatedAt, slug: o.slug, names: [o.data.groom, o.data.bride, o.data.person].filter(Boolean).join(" & ") || null };
    });
    const users = [...this.users.values()].map((u) => ({ id: u.id, createdAt: u.createdAt, source: u.source }));
    return { orders, users, partners: this.partners.map((p) => ({ ...p })), earnings: this.earnings.map((e) => ({ ...e })), payouts: this.payouts.map((p) => ({ ...p })), clientOrders: this.clientOrders.filter((x) => x.claimedBy !== null).map((x) => ({ orderId: x.orderId, ref: x.refSource })), managerPayouts: clone(this.managerPayouts), partnersReady: this.partnersReady };
  }
  // ── Уведомления и выплаты менеджерам (v2, часть 7) ──
  notices = new Map<string, Notice & { sentAt: Date | null }>();
  managerPayouts: ManagerPayout[] = [];
  async queueNotice(n: Notice) {
    if (this.notices.has(n.key)) return false;
    this.notices.set(n.key, { ...clone(n), sentAt: null });
    return true;
  }
  async claimNotice(key: string, now: Date) {
    const n = this.notices.get(key);
    if (!n || n.sentAt) return false;
    n.sentAt = now;
    return true;
  }
  async claimDueNotices(now: Date, limit: number) {
    const due = [...this.notices.values()].filter((n) => !n.sentAt && +n.dueAt <= +now).sort((a, b) => +a.dueAt - +b.dueAt).slice(0, limit);
    for (const n of due) n.sentAt = now;
    return due.map(({ sentAt, ...n }) => (void sentAt, clone(n)));
  }
  // ── Часть 10 ──
  reviews: { orderId: string; userId: number; stars: number; text: string | null; createdAt: Date }[] = [];
  async setNudge(id: number, patch: { count?: number; off?: boolean }) {
    const u = this.users.get(id);
    if (!u) return;
    if (patch.count !== undefined) u.nudgeCount = Math.min(4, Math.max(0, patch.count));
    if (patch.off !== undefined) u.nudgeOff = patch.off;
  }
  async saveReview(r: { orderId: string; userId: number; stars?: number; text?: string }) {
    let rec = this.reviews.find((x) => x.orderId === r.orderId);
    if (r.stars !== undefined) {
      if (rec) rec.stars = r.stars;
      else this.reviews.push((rec = { orderId: r.orderId, userId: r.userId, stars: r.stars, text: null, createdAt: this.now() }));
    }
    if (r.text !== undefined) {
      if (!rec || rec.userId !== r.userId) return false;
      rec.text = r.text;
    }
    return true;
  }
  async reviewSummary(from: Date, to: Date, orderIds: string[] | null) {
    const list = this.reviews.filter((r) => +r.createdAt >= +from && +r.createdAt < +to && (!orderIds || orderIds.includes(r.orderId)));
    return list.length ? { avg: list.reduce((n, r) => n + r.stars, 0) / list.length, count: list.length } : null;
  }
  async errorSummary(since: Date) {
    const list = this.botErrors.filter((e) => +(e as { at?: Date }).at! >= +since);
    const counts = new Map<string, number>();
    for (const e of list) {
      const k = `${e.errorName}${e.errorCode ? ` ${e.errorCode}` : ""}: ${e.message.slice(0, 80)}`;
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
    return { count: list.length, top };
  }
  async noticeSentSince(prefix: string, since: Date) {
    return [...this.notices.values()].some((n) => n.key.startsWith(prefix) && n.sentAt && +n.sentAt >= +since);
  }
  async staleDraftStates(before: Date) {
    return [...this.users.values()].filter((u) => +u.lastSeenAt < +before && u.state && Object.keys(u.state).some((k) => k === "data" || k === "music")).map((u) => ({ id: u.id, state: clone(u.state) }));
  }
  async deleteStaleDrafts(before: Date) {
    const out: { photos: string[]; music: string | null }[] = [];
    for (const o of [...this.orders.values()]) {
      if (!["draft", "preview", "awaiting_payment", "rejected"].includes(o.status) || o.paidAt || +o.createdAt >= +before) continue;
      if (+(this.users.get(o.userId)?.lastSeenAt ?? 0) >= +before) continue;
      if (this.earnings.some((e) => e.orderId === o.id)) continue;
      const co = this.clientOrders.find((x) => x.orderId === o.id);
      if (co?.claimedBy) continue;
      if (co) this.clientOrders.splice(this.clientOrders.indexOf(co), 1);
      this.orders.delete(o.id);
      out.push({ photos: o.data.photos ?? [], music: o.music.kind === "own" ? (o.music.url ?? null) : null });
    }
    return out;
  }

  async recordManagerPayout(p: Omit<ManagerPayout, "createdAt"> & { createdBy: number }) {
    if (p.amount <= 0 || this.managerPayouts.some((x) => x.managerId === p.managerId && x.month === p.month)) return false;
    this.managerPayouts.push({ managerId: p.managerId, month: p.month, amount: p.amount, orders: p.orders, createdAt: this.now() });
    return true;
  }
  async createPartner(p: NewPartner) {
    const partner: Partner = {
      code: p.code,
      name: p.name,
      telegramId: p.telegramId,
      username: p.username,
      rate: p.rate,
      ratePercent: p.ratePercent ?? null,
      proposedRatePercent: null,
      managedBy: p.managedBy ?? null,
      phone: p.phone ?? null,
      kaspi: null,
      schedule: p.schedule ?? "weekly",
      status: p.status ?? "active",
      proposedRate: null,
      proposedSchedule: null,
      ownerNotifiedAt: p.ownerNotifiedAt ?? null,
      sleepNotifiedAt: null,
      id: this.partners.length + 1,
      createdAt: this.now(),
    };
    this.partners.push(partner);
    return { ...partner };
  }
  async getPartner(id: number) {
    const p = this.partners.find((x) => x.id === id);
    return p ? { ...p } : null;
  }
  async setPartnerRate(id: number, rate: number, ratePercent: number | null = null) {
    const p = this.partners.find((x) => x.id === id);
    if (p) Object.assign(p, { rate, ratePercent });
  }
  async updatePartner(id: number, patch: PartnerPatch) {
    const p = this.partners.find((x) => x.id === id);
    if (p) Object.assign(p, patch);
  }
  async bindPartner(id: number, userId: number, username: string | null) {
    const p = this.partners.find((x) => x.id === id);
    if (!p || p.status === "rejected" || (p.telegramId !== null && p.telegramId !== userId)) return null;
    if (this.partners.some((x) => x.id !== id && x.telegramId === userId && x.status !== "rejected")) return null;
    Object.assign(p, { telegramId: userId, username });
    return { ...p };
  }
  async decidePartner(id: number, status: "active" | "rejected") {
    const p = this.partners.find((x) => x.id === id);
    if (!p || p.status !== "pending") return false;
    p.status = status;
    return true;
  }
  async proposePartnerTerms(id: number, rate: number, schedule: PayoutSchedule, ratePercent: number | null = null) {
    const p = this.partners.find((x) => x.id === id);
    if (p) Object.assign(p, { proposedRate: rate, proposedRatePercent: ratePercent, proposedSchedule: schedule, ownerNotifiedAt: null });
  }
  async settlePartnerProposal(id: number, accept: boolean) {
    const p = this.partners.find((x) => x.id === id);
    if (!p || p.proposedRate === null || p.proposedSchedule === null) return null;
    if (accept) Object.assign(p, { rate: p.proposedRate, ratePercent: p.proposedRatePercent ?? null, schedule: p.proposedSchedule });
    Object.assign(p, { proposedRate: null, proposedRatePercent: null, proposedSchedule: null });
    return { ...p };
  }
  async findPartnerForUser(userId: number, username: string | null) {
    if (!this.partnersReady) return null;
    const name = username?.toLowerCase();
    const live = this.partners.filter((x) => x.status !== "rejected");
    const p = live.find((x) => x.telegramId === userId) ?? live.find((x) => x.telegramId === null && !!name && x.username?.toLowerCase() === name);
    if (!p) return null;
    p.telegramId = userId;
    return { ...p };
  }
  async findUserByUsername(username: string) {
    const name = username.toLowerCase();
    return [...this.users.values()].find((u) => u.username?.toLowerCase() === name) ?? null;
  }
  async creditPartnerOrder(orderId: string, clientId: number, code: string) {
    const partner = this.partners.find((p) => p.code === code);
    if (!partner || partner.status === "rejected" || partner.telegramId === clientId || this.earnings.some((e) => e.orderId === orderId)) return null;
    const client = this.users.get(clientId);
    if (client?.username && client.username.toLowerCase() === partner.username?.toLowerCase()) return null;
    // Процент — от фактически оплаченной суммы заказа
    const amount = earningFor(partner, this.orders.get(orderId)?.amount ?? 0);
    this.earnings.push({ orderId, partnerId: partner.id, amount, delivered: false, createdAt: this.now() });
    return { partner: { ...partner }, amount };
  }
  async markEarningDelivered(orderId: string) {
    const e = this.earnings.find((x) => x.orderId === orderId);
    if (e) e.delivered = true;
  }
  async recordPartnerPayout(partnerId: number, expected: number, createdBy: number) {
    void createdBy;
    const staff = await this.staffIds();
    if (this.partners.find((p) => p.id === partnerId)?.status !== "active") return false;
    const earned = this.earnings.filter((e) => e.partnerId === partnerId && !staff.includes(this.orders.get(e.orderId)?.userId ?? 0)).reduce((n, e) => n + e.amount, 0);
    const paid = this.payouts.filter((p) => p.partnerId === partnerId).reduce((n, p) => n + p.amount, 0);
    if (expected <= 0 || earned - paid !== expected) return false;
    this.payouts.push({ partnerId, amount: expected, createdAt: this.now() });
    return true;
  }
  async uncreditedPartnerOrders() {
    const credited = new Set(this.earnings.map((e) => e.orderId));
    const codes = new Set(this.partners.map((p) => `p_${p.code}`));
    return [...this.orders.values()]
      .filter((o) => (o.status === "active" || o.status === "archived") && !credited.has(o.id) && codes.has(this.users.get(o.userId)?.source ?? ""))
      .map((o) => ({ id: o.id, userId: o.userId }));
  }
  // ── Роли (v2) ──
  managers: Manager[] = [];
  invites: { tokenHash: string; kind: InviteKind; createdBy: number; partnerId: number | null; expiresAt: Date; usedBy: number | null }[] = [];
  clientOrders: { orderId: string; createdBy: number; tokenHash: string; refSource: string | null; claimedBy: number | null }[] = [];
  async listManagers() {
    return clone(this.managers);
  }
  async getManager(id: number) {
    const m = this.managers.find((x) => x.telegramId === id && x.active);
    return m ? clone(m) : null;
  }
  async addManager(m: { telegramId: number; code: string; username: string | null; firstName: string | null; invitedBy: number }) {
    const old = this.managers.find((x) => x.telegramId === m.telegramId);
    if (old) Object.assign(old, { active: true, removedAt: null, username: m.username, firstName: m.firstName, invitedBy: m.invitedBy });
    else this.managers.push({ ...m, active: true, createdAt: this.now() });
    return clone(this.managers.find((x) => x.telegramId === m.telegramId)!);
  }
  async removeManager(id: number, now?: Date) {
    const m = this.managers.find((x) => x.telegramId === id && x.active);
    if (!m) return false;
    m.active = false;
    m.removedAt = now ?? this.now();
    return true;
  }
  async createInvite(i: { tokenHash: string; kind: InviteKind; createdBy: number; expiresAt: Date; partnerId?: number | null }) {
    this.invites.push({ ...i, partnerId: i.partnerId ?? null, usedBy: null });
  }
  async useInvite(tokenHash: string, kind: InviteKind, userId: number, now: Date): Promise<InviteUse> {
    const i = this.invites.find((x) => x.tokenHash === tokenHash && x.kind === kind);
    if (!i) return { status: "none" };
    if (i.usedBy !== null) return { status: "used" };
    if (+i.expiresAt <= +now) return { status: "expired" };
    i.usedBy = userId;
    return { status: "ok", createdBy: i.createdBy, partnerId: i.partnerId };
  }
  async issueClientOrder(o: { orderId: string; createdBy: number; tokenHash: string; refSource: string | null }) {
    const old = this.clientOrders.find((x) => x.orderId === o.orderId);
    if (old?.claimedBy) return;
    if (old) Object.assign(old, o);
    else this.clientOrders.push({ ...o, claimedBy: null });
  }
  async claimClientOrder(tokenHash: string, clientId: number): Promise<{ status: ClaimStatus; order?: OrderRecord }> {
    const co = this.clientOrders.find((x) => x.tokenHash === tokenHash);
    const order = co ? this.orders.get(co.orderId) : undefined;
    if (!co || !order) return { status: "none" };
    if (co.claimedBy === clientId) return { status: "mine", order: clone(order) };
    if (co.claimedBy !== null) return { status: "used" };
    if (co.createdBy === clientId) return { status: "creator", order: clone(order) };
    if (!["draft", "preview", "awaiting_payment", "rejected"].includes(order.status) || order.userId !== co.createdBy) return { status: "closed" };
    co.claimedBy = clientId;
    order.userId = clientId;
    order.updatedAt = this.now();
    return { status: "claimed", order: clone(order) };
  }
  async clientOrderRef(orderId: string) {
    const co = this.clientOrders.find((x) => x.orderId === orderId && x.claimedBy !== null);
    return co ? { ref: co.refSource } : null;
  }
  botErrors: BotErrorEntry[] = [];
  async logBotError(entry: BotErrorEntry) {
    // Время записи — как created_at в базе (для сигнала «≥3 ошибок за час»)
    this.botErrors.push({ ...entry, at: this.now() } as BotErrorEntry);
  }
  private favorites = new Map<number, Map<string,number>>();
  private analyticsEvents = new Map<string, MetricEvent>();
  private ownerId?: number;
  private analyticsAdminIds: number[];
  private trackingSince: Date;

  async isOwner(id: number) { return this.ownerId === id; }
  async canAnalyze(id: number) { return await this.isOwner(id) || (await this.isAdmin(id) && this.analyticsAdminIds.includes(id)); }
  async analytics(actorId: number, period: Period, now: Date, customers = false) {
    const owner = await this.isOwner(actorId);
    if (!(await this.canAnalyze(actorId)) || (customers && !owner)) throw new Error("Analytics access denied");
    return summarize(withoutStaffAnalytics({ orders: [...this.orders.values()], users: [...this.users.values()], events: [...this.analyticsEvents.values()], since: this.trackingSince, music: this.music }, await this.staffIds(), this.partners.flatMap((p) => (p.telegramId ? [p.telegramId] : []))), period, now, customers && owner);
  }
  async listFavorites(userId: number) {
    return [...(this.favorites.get(userId)??new Map<string,number>())]
      .sort((a,b)=>b[1]-a[1]||(a[0]<b[0]?-1:a[0]>b[0]?1:0)).map(([id])=>id);
  }
  async setFavorite(userId: number, templateId: string, saved: boolean) {
    if (!this.favorites.has(userId)) this.favorites.set(userId, new Map());
    const set = this.favorites.get(userId)!;
    if (!saved) { set.delete(templateId); return; }
    if(!set.has(templateId))set.set(templateId,this.now().getTime());
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
          nudgeCount: 0,
          nudgeOff: false,
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
  async createOrderFromDraft(o: NewOrder, expectedQ: number, handledUpdates?: number[]) {
    const user = this.mustUser(o.userId);
    if (user.step !== "review" || Number(user.state.q ?? 0) !== expectedQ) return null;
    const previous = { step: user.step, state: clone(user.state) };
    user.step = "idle";
    user.state = { q: expectedQ + 1, ...(handledUpdates ? {handledUpdates} : {}) };
    try { return await this.createOrder(o); }
    catch (error) {
      if (user.step === "idle" && user.state.q === expectedQ + 1) Object.assign(user, previous);
      throw error;
    }
  }

  async createOrder(o: NewOrder) {
    const now = this.now();
    let slug = o.slugBase;
    for (let i = 2; this.slugHistory.has(slug) || isReservedSlug(slug); i++) slug = `${o.slugBase}-${i}`;
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
      payConfirmedAt: null,
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
    const safe = clone(patch);
    if (safe.data) {
      delete safe.data.designVersion;
      if (o.data.designVersion) safe.data.designVersion = o.data.designVersion;
    }
    Object.assign(o, safe, { updatedAt: this.now() });
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
    const staff = await this.staffIds();
    const all = [...this.orders.values()].filter((o) => !staff.includes(o.userId));
    const paid = all.filter((o) => PAID.includes(o.status));
    const count = (from: number) => all.filter((o) => o.createdAt.getTime() >= from).length;
    const sum = (from: number) =>
      paid.filter((o) => (o.paidAt ?? o.updatedAt).getTime() >= from).reduce((s, o) => s + o.amount, 0);
    const byStatus: Stats["byStatus"] = {};
    for (const o of all) byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;
    const sources = new Map<string, { source: string; users: number; paid: number }>();
    for (const u of this.users.values()) {
      if (staff.includes(u.id)) continue;
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
