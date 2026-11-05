import { RSVP_IP_HOUR_LIMIT, RSVP_ORDER_LIMIT, type RsvpInput, type RsvpRecord } from "@/lib/rsvp";
import type { ManagerPayout, PanelOrder, PanelSnapshot, Partner, PartnerEarning, PartnerPayout, PanelUser, PayoutSchedule } from "@/lib/owner-panel";
import type { BotErrorEntry } from "./errors";
import type { ClaimStatus, InviteKind, InviteUse, Manager } from "@/lib/roles";
/**
 * Repo на Postgres (Supabase) через lib/db.ts (роль inviteizi_server).
 * Поведение — как у bot/repo-memory.ts (общий набор тестов bot/repo.contract.ts).
 * Таблицы: supabase/migrations/*_schema.sql.
 */
import type { NewPartner, Notice, PartnerPatch, Repo } from "./repo";
import type {
  InvitationData,
  InvitationEvent,
  Lang,
  MusicChoice,
  MusicRecord,
  NewOrder,
  OrderPatch,
  OrderRecord,
  OrderStatus,
  Stats,
  UserRecord,
} from "@/lib/domain";
import { EXTRA_LANGS, type EventKind, type ExtraLang, type Occasion, type Relation } from "@/lib/types";
import { db, type Sql, type Tx } from "@/lib/db";
import { env } from "@/lib/env";
import { isReservedSlug } from "@/lib/slug";
import { summarize, withoutStaffAnalytics, type AnalyticsInput, type EventKind as AnalyticsEventKind, type MetricOrder, type MetricEvent, type MetricUser, type Period } from "@/lib/analytics";

const PAID: OrderStatus[] = ["active", "archived"];
const TZ_OFFSET_MS = 5 * 60 * 60_000; // Казахстан: UTC+5 круглый год
const DAY = 24 * 60 * 60_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const INT4_MAX = 2_147_483_647;

// ── Строки базы ──

type UserRow = {
  id: number;
  username: string | null;
  first_name: string | null;
  lang: Lang | null;
  step: string;
  state: Record<string, unknown>;
  source: string | null;
  created_at: Date;
  last_seen_at: Date;
  nudge_count?: number | null;
  nudge_off?: boolean | null;
};

type EventJson = {
  kind: EventKind;
  date: string;
  time: string;
  venueName: string;
  address: string;
  lat: number | null;
  lng: number | null;
  mapUrl: string | null;
};

type OrderRow = {
  id: string;
  number: number;
  user_id: number;
  status: OrderStatus;
  occasion: OrderRecord["occasion"];
  format: OrderRecord["format"];
  template_id: string;
  design_version: InvitationData["designVersion"] | null;
  relation: Relation | null;
  groom: string | null;
  bride: string | null;
  person: string | null;
  cause: InvitationData["cause"] | null;
  age: number | null;
  hosts: string;
  side_groom: string | null;
  side_bride: string | null;
  text_id: string | null;
  custom_text: string | null;
  music_kind: MusicChoice["kind"];
  music_id: string | null;
  music_file_id: string | null;
  music_url: string | null;
  music_title: string | null;
  slug: string;
  amount: number;
  receipt_file_id: string | null;
  receipt_kind: "photo" | "document" | null;
  reject_reason: string | null;
  created_at: Date;
  updated_at: Date;
  receipt_at: Date | null;
  paid_at: Date | null;
  payment_reminded_at: Date | null;
  rsvp: boolean | null;
  /** Нет колонки до миграции client_photos — тогда undefined */
  photos?: string[] | null;
  /** v2: нет колонок до миграции invite_langs — тогда undefined */
  langs?: string[] | null;
  custom_text_i18n?: Partial<Record<ExtraLang, string>> | null;
  admin_reminded_at: Date | null;
  expires_at: Date | null;
  events: EventJson[];
};

type MusicRow = {
  id: string;
  title_uz: string;
  title_ru: string;
  file_url: string;
  telegram_file_id: string | null;
  sort: number;
  occasion: Occasion | null;
  is_artist: boolean;
};

// ── Преобразования ──

function toUser(r: UserRow): UserRecord {
  return {
    id: r.id,
    username: r.username,
    firstName: r.first_name,
    lang: r.lang,
    step: r.step,
    state: r.state ?? {},
    source: r.source,
    createdAt: r.created_at,
    lastSeenAt: r.last_seen_at,
    nudgeCount: r.nudge_count ?? 0,
    nudgeOff: r.nudge_off ?? false,
  };
}

function toEvent(e: EventJson): InvitationEvent {
  const ev: InvitationEvent = { kind: e.kind, date: e.date, time: e.time, venueName: e.venueName, address: e.address };
  if (e.lat != null && e.lng != null) ev.location = { lat: e.lat, lng: e.lng };
  if (e.mapUrl != null) ev.mapUrl = e.mapUrl;
  return ev;
}

/** Необязательное поле: null из базы → поля нет вовсе (как в исходных данных) */
function put<T extends object, K extends keyof T>(obj: T, key: K, v: T[K] | null) {
  if (v != null) obj[key] = v;
}

function toData(r: OrderRow): InvitationData {
  const d: InvitationData = { occasion: r.occasion, hosts: r.hosts, events: (r.events ?? []).map(toEvent) };
  put(d, "designVersion", r.design_version);
  put(d, "groom", r.groom);
  put(d, "bride", r.bride);
  put(d, "person", r.person);
  put(d, "relation", r.relation);
  put(d, "cause", r.cause);
  put(d, "age", r.age);
  if (r.side_groom != null || r.side_bride != null) {
    const sides: NonNullable<InvitationData["sides"]> = {};
    put(sides, "groom", r.side_groom);
    put(sides, "bride", r.side_bride);
    d.sides = sides;
  }
  put(d, "textId", r.text_id);
  put(d, "customText", r.custom_text);
  put(d, "rsvp", r.rsvp);
  if (r.photos?.length) d.photos = r.photos;
  const extra = EXTRA_LANGS.filter((l) => r.langs?.includes(l));
  if (extra.length) d.langs = extra;
  // Главный язык страницы — первый в списке
  const main = r.langs?.[0];
  if (main && main !== "uz" && extra.includes(main as ExtraLang)) d.mainLang = main as ExtraLang;
  const own = Object.fromEntries(EXTRA_LANGS.flatMap((l) => (typeof r.custom_text_i18n?.[l] === "string" && r.custom_text_i18n[l] ? [[l, r.custom_text_i18n[l]]] : [])));
  if (Object.keys(own).length) d.customTexts = own;
  return d;
}

function toMusic(r: OrderRow): MusicChoice {
  if (r.music_kind === "list" && r.music_id) return { kind: "list", musicId: r.music_id };
  if (r.music_kind === "own" && r.music_file_id) {
    const m: Extract<MusicChoice, { kind: "own" }> = { kind: "own", fileId: r.music_file_id };
    put(m, "url", r.music_url);
    put(m, "title", r.music_title);
    return m;
  }
  return { kind: "none" };
}

function toOrder(r: OrderRow): OrderRecord {
  return {
    id: r.id,
    number: r.number,
    userId: r.user_id,
    status: r.status,
    occasion: r.occasion,
    format: r.format,
    templateId: r.template_id,
    data: toData(r),
    music: toMusic(r),
    slug: r.slug,
    amount: r.amount,
    receipt: r.receipt_file_id && r.receipt_kind ? { fileId: r.receipt_file_id, kind: r.receipt_kind } : null,
    rejectReason: r.reject_reason,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    receiptAt: r.receipt_at,
    paidAt: r.paid_at,
    paymentRemindedAt: r.payment_reminded_at,
    adminRemindedAt: r.admin_reminded_at,
    expiresAt: r.expires_at,
  };
}

function toMusicRecord(r: MusicRow): MusicRecord {
  return {
    id: r.id,
    titleUz: r.title_uz,
    titleRu: r.title_ru,
    fileUrl: r.file_url,
    telegramFileId: r.telegram_file_id,
    sort: r.sort,
    occasion: r.occasion,
    isArtist: r.is_artist,
  };
}

type Columns = Record<string, string | number | boolean | Date | string[] | Partial<Record<ExtraLang, string>> | null>;

/** Колонка orders.langs: главный язык первым, узбекский всегда есть */
function langsColumn(langs: ExtraLang[], main?: ExtraLang) {
  const extra = EXTRA_LANGS.filter((l) => langs.includes(l));
  const first = main && extra.includes(main) ? main : "uz";
  return [first, ...["uz", ...extra].filter((l) => l !== first)];
}

function dataColumns(d: InvitationData): Columns {
  return {
    occasion: d.occasion,
    design_version: d.designVersion ?? null,
    groom: d.groom ?? null,
    bride: d.bride ?? null,
    person: d.person ?? null,
    relation: d.relation ?? null,
    cause: d.cause ?? null,
    age: d.age ?? null,
    hosts: d.hosts ?? "",
    side_groom: d.sides?.groom ?? null,
    side_bride: d.sides?.bride ?? null,
    text_id: d.textId ?? null,
    custom_text: d.customText ?? null,
    rsvp: d.rsvp ?? null,
    // Колонка photos появляется миграцией client_photos: заказы без фото её не трогают
    ...(d.photos !== undefined && { photos: d.photos.length ? d.photos : null }),
    // v2: колонки языков появляются миграцией invite_langs — заказы без языков их не трогают
    ...(d.langs !== undefined && { langs: langsColumn(d.langs, d.mainLang) }),
    ...(d.customTexts !== undefined && { custom_text_i18n: Object.keys(d.customTexts).length ? d.customTexts : null }),
  };
}

function musicColumns(m: MusicChoice): Columns {
  return {
    music_kind: m.kind,
    music_id: m.kind === "list" ? m.musicId : null,
    music_file_id: m.kind === "own" ? m.fileId : null,
    music_url: m.kind === "own" ? (m.url ?? null) : null,
    music_title: m.kind === "own" ? (m.title ?? null) : null,
  };
}

/** OrderPatch → колонки orders (только переданные поля) */
function patchColumns(p: OrderPatch): Columns {
  const c: Columns = {};
  if (p.status !== undefined) c.status = p.status;
  if (p.templateId !== undefined) c.template_id = p.templateId;
  if (p.format !== undefined) c.format = p.format;
  if (p.data !== undefined) {
    const fields = dataColumns(p.data);
    // A normal edit cannot upgrade, erase or forge the pinned creation revision.
    delete fields.design_version;
    Object.assign(c, fields);
  }
  if (p.music !== undefined) Object.assign(c, musicColumns(p.music));
  if (p.slug !== undefined) c.slug = p.slug;
  if (p.amount !== undefined) c.amount = p.amount;
  if (p.receipt !== undefined) {
    c.receipt_file_id = p.receipt?.fileId ?? null;
    c.receipt_kind = p.receipt?.kind ?? null;
  }
  if (p.rejectReason !== undefined) c.reject_reason = p.rejectReason;
  if (p.receiptAt !== undefined) c.receipt_at = p.receiptAt;
  if (p.paidAt !== undefined) c.paid_at = p.paidAt;
  if (p.paymentRemindedAt !== undefined) c.payment_reminded_at = p.paymentRemindedAt;
  if (p.adminRemindedAt !== undefined) c.admin_reminded_at = p.adminRemindedAt;
  if (p.expiresAt !== undefined) c.expires_at = p.expiresAt;
  // updated_at всё равно ставит триггер; так в update всегда есть хотя бы одна колонка
  c.updated_at = new Date();
  return c;
}

const EVENT_COLUMNS = ["order_id", "position", "kind", "date", "time", "venue_name", "address", "lat", "lng", "map_url"] as const;

async function writeEvents(tx: Tx, orderId: string, events: InvitationEvent[], replace: boolean) {
  if (replace) await tx`delete from public.events where order_id = ${orderId}`;
  if (!events.length) return;
  const rows = events.map((e, position) => ({
    order_id: orderId,
    position,
    kind: e.kind,
    date: e.date,
    time: e.time,
    venue_name: e.venueName ?? "",
    address: e.address ?? "",
    lat: e.location?.lat ?? null,
    lng: e.location?.lng ?? null,
    map_url: e.mapUrl ?? null,
  }));
  await tx`insert into public.events ${tx(rows, ...EVENT_COLUMNS)}`;
}

/** Заказ вместе с тадбирами одним запросом */
function selectOrders(tx: Tx) {
  return tx`
    select o.*,
      coalesce((
        select json_agg(json_build_object(
          'kind', e.kind, 'date', e.date::text, 'time', e.time,
          'venueName', e.venue_name, 'address', e.address,
          'lat', e.lat, 'lng', e.lng, 'mapUrl', e.map_url) order by e.position)
        from public.events e where e.order_id = o.id
      ), '[]'::json) as events
    from public.orders o`;
}

async function loadOrder(tx: Tx, id: string): Promise<OrderRecord | null> {
  const [r] = await tx<OrderRow[]>`${selectOrders(tx)} where o.id = ${id}`;
  return r ? toOrder(r) : null;
}

const isUniqueSlugViolation = (e: unknown) =>
  typeof e === "object" && e !== null && (e as { code?: string }).code === "23505" &&
  String((e as { constraint_name?: string }).constraint_name ?? "").includes("slug");

const PARTNER_COLUMNS = `id, code, name, telegram_id as "telegramId", username, rate, created_at as "createdAt", managed_by as "managedBy",
  phone, kaspi, schedule, status, proposed_rate as "proposedRate", proposed_schedule as "proposedSchedule",
  owner_notified_at as "ownerNotifiedAt", sleep_notified_at as "sleepNotifiedAt"`;
const PARTNER_PATCH: Record<keyof PartnerPatch, string> = { phone: "phone", kaspi: "kaspi", schedule: "schedule", ownerNotifiedAt: "owner_notified_at", sleepNotifiedAt: "sleep_notified_at" };
const MANAGER_COLUMNS = `telegram_id as "telegramId", code, username, first_name as "firstName", invited_by as "invitedBy", active, created_at as "createdAt"`;
/** Миграция партнёров ещё не применена */
const isMissingTable = (e: unknown) => (e as { code?: string } | null)?.code === "42P01";
const isMissingColumn = (e: unknown) => (e as { code?: string } | null)?.code === "42703";

export class PgRepo implements Repo {
  async isOwner(id: number) { return env.ownerId() === id; }

  async canAnalyze(id: number) {
    if (await this.isOwner(id)) return true;
    if (!(await this.isAdmin(id))) return false;
    if (env.analyticsAdminIds().includes(id)) return true;
    try {
      const [r] = await this.sql`select 1 from public.admins where telegram_id = ${id} and can_analytics`;
      return Boolean(r);
    } catch(error) {
      // Before the optional analytics migration there is no database grant to consult.
      // Deny by default; do not infer analytics access from payment-admin rights.
      if(typeof error==="object"&&error!==null&&"code" in error&&error.code==="42703")return false;
      throw error;
    }
  }

  async analytics(actorId: number, period: Period, now: Date, customers = false) {
    const owner = await this.isOwner(actorId);
    if (!(await this.canAnalyze(actorId)) || (customers && !owner)) throw new Error("Analytics access denied");
    // One consistent snapshot; only necessary columns, never event addresses or receipt files.
    const input = await this.sql.begin("isolation level repeatable read read only", async tx => {
      const orders = await tx<MetricOrder[]>`select id, user_id as "userId", status, occasion, format, template_id as "templateId",
        amount, created_at as "createdAt", paid_at as "paidAt", updated_at as "updatedAt",
        case when music_kind = 'list' then jsonb_build_object('kind','list','musicId',music_id)
          else jsonb_build_object('kind',music_kind) end as music from public.orders`;
      const users = customers
        ? await tx<MetricUser[]>`select id, username, first_name as "firstName", created_at as "createdAt" from public.users`
        : await tx<MetricUser[]>`select id, null::text as username, null::text as "firstName", created_at as "createdAt" from public.users`;
      const events = await tx<MetricEvent[]>`select kind, user_id as "userId", target, created_at as "createdAt" from public.analytics_events`;
      const [config] = await tx<{ started_at: Date }[]>`select started_at from public.analytics_config where singleton`;
      const music = await tx<{ id: string; titleRu: string; titleUz: string }[]>`select id, title_ru as "titleRu", title_uz as "titleUz" from public.music`;
      return { orders: [...orders], users: [...users], events: [...events], since: config.started_at, music: [...music] } satisfies AnalyticsInput;
    });
    return summarize(withoutStaffAnalytics(input, await this.staffIds()), period, now, customers && owner);
  }

  async listFavorites(userId: number) {
    const rows = await this.sql<{ template_id: string }[]>`select template_id from public.design_favorites where user_id = ${userId} order by created_at desc, template_id`;
    return rows.map(r => r.template_id);
  }

  async setFavorite(userId: number, templateId: string, saved: boolean) {
    await this.sql.begin(async tx => {
      if (!saved) { await tx`delete from public.design_favorites where user_id = ${userId} and template_id = ${templateId}`; return; }
      await tx`insert into public.design_favorites(user_id, template_id) values(${userId},${templateId}) on conflict do nothing`;
      await tx`insert into public.analytics_events(kind,user_id,target,dedupe_key) values('design_favorited',${userId},${templateId},${templateId}) on conflict do nothing`;
    });
  }

  async staffIds() {
    // Менеджеры (и снятые): их собственные заказы и клики — не продажи
    const managers = (await this.listManagers()).map((m) => m.telegramId);
    return [...new Set([...(await this.listAdminIds()), ...(env.ownerId() ? [env.ownerId() as number] : []), ...managers])];
  }

  async saveRsvp(input: RsvpInput) {
    return this.sql.begin(async (tx) => {
      // По очереди на заказ: лимиты нельзя обойти одновременными запросами
      await tx`select pg_advisory_xact_lock(hashtext(${input.orderId}))`;
      const [old] = await tx`update public.rsvp_responses set name=${input.name}, guests=${input.guests}, attending=${input.attending}, updated_at=now()
        where order_id=${input.orderId} and visitor_key=${input.visitorKey} returning id`;
      if (old) return "ok" as const;
      const [n] = await tx<{ total: number; ip: number }[]>`select count(*)::int8 as total,
        count(*) filter (where ip_hash=${input.ipHash} and created_at > now() - interval '1 hour')::int8 as ip
        from public.rsvp_responses where order_id=${input.orderId}`;
      if (n.total >= RSVP_ORDER_LIMIT || n.ip >= RSVP_IP_HOUR_LIMIT) return "limited" as const;
      await tx`insert into public.rsvp_responses(order_id,visitor_key,name,guests,attending,ip_hash)
        values(${input.orderId},${input.visitorKey},${input.name},${input.guests},${input.attending},${input.ipHash})`;
      return "ok" as const;
    });
  }

  async rsvpDigestDue(dayStart: Date) {
    const rows = await this.sql<{ id: string; number: number; userId: number; since: Date | null }[]>`
      select o.id, o.number, o.user_id as "userId", o.rsvp_digest_at as since from public.orders o
      where o.status = 'active' and o.rsvp is true
        and (o.rsvp_digest_at is null or o.rsvp_digest_at < ${dayStart})
        and exists (select 1 from public.rsvp_responses r where r.order_id = o.id and (o.rsvp_digest_at is null or r.updated_at > o.rsvp_digest_at))`;
    return [...rows];
  }

  async claimRsvpDigest(orderId: string, dayStart: Date, now: Date) {
    const rows = await this.sql`update public.orders set rsvp_digest_at = ${now}
      where id = ${orderId} and (rsvp_digest_at is null or rsvp_digest_at < ${dayStart}) returning id`;
    return rows.length > 0;
  }

  async listRsvp(orderId: string) {
    try {
      const rows = await this.sql<RsvpRecord[]>`select name, guests, attending, updated_at as "updatedAt" from public.rsvp_responses where order_id=${orderId} order by updated_at desc`;
      return [...rows];
    } catch (e) {
      if (isMissingTable(e)) return [];
      throw e;
    }
  }

  async panelSnapshot(): Promise<PanelSnapshot> {
    const base = await this.sql.begin("isolation level repeatable read read only", async (tx) => {
      const orders = await tx<PanelOrder[]>`select o.id, o.number, o.user_id as "userId", u.username, u.first_name as "firstName", o.status, o.occasion, o.format,
        o.template_id as "templateId", o.music_kind as "musicKind", o.amount, o.created_at as "createdAt", o.paid_at as "paidAt", o.updated_at as "updatedAt"
        from public.orders o join public.users u on u.id = o.user_id`;
      const users = await tx<PanelUser[]>`select id, created_at as "createdAt", source from public.users`;
      return { orders: [...orders], users: [...users] };
    });
    try {
      const partners = await this.sql<Partner[]>`select ${this.sql.unsafe(PARTNER_COLUMNS)} from public.partners order by id`;
      const earnings = await this.sql<PartnerEarning[]>`select order_id as "orderId", partner_id as "partnerId", amount, delivered, created_at as "createdAt" from public.partner_earnings`;
      const payouts = await this.sql<PartnerPayout[]>`select partner_id as "partnerId", amount, created_at as "createdAt" from public.partner_payouts`;
      return { ...base, partners: [...partners], earnings: [...earnings], payouts: [...payouts], ...(await this.v2Snapshot()), partnersReady: true };
    } catch (e) {
      if (!isMissingTable(e)) throw e;
      return { ...base, partners: [], earnings: [], payouts: [], partnersReady: false };
    }
  }

  /** Заказы «для клиента» и выплаты менеджерам; до миграций v2 — пусто */
  private async v2Snapshot() {
    const clientOrders = await this.sql<{ orderId: string; ref: string | null }[]>`select order_id as "orderId", ref_source as ref from public.client_orders where claimed_by is not null`.catch((e) => {
      if (isMissingTable(e)) return [];
      throw e;
    });
    const managerPayouts = await this.sql<ManagerPayout[]>`select manager_id as "managerId", month, amount, orders, created_at as "createdAt" from public.manager_payouts`.catch((e) => {
      if (isMissingTable(e)) return [];
      throw e;
    });
    return { clientOrders: [...clientOrders], managerPayouts: [...managerPayouts] };
  }

  // ── Уведомления и выплаты менеджерам (v2, часть 7) ──
  async queueNotice(n: Notice) {
    try {
      const rows = await this.sql`insert into public.bot_notices(key, chat_id, body, due_at)
        values(${n.key}, ${n.chatId}, ${this.sql.json({ text: n.text, markup: n.markup ?? null })}, ${n.dueAt})
        on conflict (key) do nothing returning key`;
      return rows.length > 0;
    } catch (e) {
      if (isMissingTable(e)) return false;
      throw e;
    }
  }

  async claimNotice(key: string, now: Date) {
    try {
      const rows = await this.sql`update public.bot_notices set sent_at = ${now} where key = ${key} and sent_at is null returning key`;
      return rows.length > 0;
    } catch (e) {
      if (isMissingTable(e)) return false;
      throw e;
    }
  }

  async claimDueNotices(now: Date, limit: number) {
    try {
      const rows = await this.sql<{ key: string; chatId: number; body: { text: string; markup: Notice["markup"] }; dueAt: Date }[]>`
        update public.bot_notices set sent_at = ${now}
        where key in (select key from public.bot_notices where sent_at is null and due_at <= ${now} order by due_at limit ${limit} for update skip locked)
        returning key, chat_id as "chatId", body, due_at as "dueAt"`;
      return rows.map((r) => ({ key: r.key, chatId: r.chatId, text: r.body.text, markup: r.body.markup, dueAt: r.dueAt }));
    } catch (e) {
      if (isMissingTable(e)) return [];
      throw e;
    }
  }

  // ── Часть 10: напоминания, отзывы, очистка ──
  async setNudge(id: number, patch: { count?: number; off?: boolean }) {
    const row: Record<string, number | boolean> = {};
    if (patch.count !== undefined) row.nudge_count = Math.min(4, Math.max(0, patch.count));
    if (patch.off !== undefined) row.nudge_off = patch.off;
    if (!Object.keys(row).length) return;
    try {
      await this.sql`update public.users set ${this.sql(row, Object.keys(row))} where id = ${id}`;
    } catch (e) {
      if (!isMissingColumn(e)) throw e;
    }
  }

  async saveReview(r: { orderId: string; userId: number; stars?: number; text?: string }) {
    try {
      if (r.stars !== undefined) {
        await this.sql`insert into public.order_reviews(order_id, user_id, stars) values(${r.orderId}, ${r.userId}, ${r.stars})
          on conflict (order_id) do update set stars = excluded.stars, updated_at = now()`;
      }
      if (r.text !== undefined) {
        const rows = await this.sql`update public.order_reviews set text = ${r.text}, updated_at = now() where order_id = ${r.orderId} and user_id = ${r.userId} returning order_id`;
        return rows.length > 0;
      }
      return true;
    } catch (e) {
      if (isMissingTable(e)) return false;
      throw e;
    }
  }

  async reviewSummary(from: Date, to: Date, orderIds: string[] | null) {
    try {
      const ids = orderIds ? this.sql.array(orderIds) : null;
      const [r] = await this.sql<{ avg: number | null; count: number }[]>`select avg(stars)::float8 as avg, count(*)::int as count from public.order_reviews
        where created_at >= ${from} and created_at < ${to} and (${ids}::uuid[] is null or order_id = any(${ids}::uuid[]))`;
      return r.count ? { avg: r.avg ?? 0, count: r.count } : null;
    } catch (e) {
      if (isMissingTable(e)) return null;
      throw e;
    }
  }

  async staleDraftStates(before: Date) {
    const rows = await this.sql<{ id: number; state: Record<string, unknown> }[]>`select id, state from public.users
      where last_seen_at < ${before} and (state ? 'data' or state ? 'music') limit 500`;
    return [...rows];
  }

  async deleteStaleDrafts(before: Date) {
    return this.sql.begin(async (tx) => {
      // Только неоплаченные: оплаченные заказы, оплаты и выплаты не удаляются никогда
      const rows = await tx<{ id: string; photos: string[] | null; music_url: string | null; music_kind: string }[]>`
        select id, photos, music_url, music_kind from public.orders
        where status in ('draft', 'preview', 'awaiting_payment', 'rejected') and paid_at is null and created_at < ${before}
          and not exists (select 1 from public.users u where u.id = orders.user_id and u.last_seen_at >= ${before})
          and not exists (select 1 from public.partner_earnings e where e.order_id = orders.id)
        for update`;
      if (!rows.length) return [];
      const ids = tx.array(rows.map((r) => r.id));
      // Заказ «для клиента», который клиент так и не забрал, уходит вместе с заказом; забранный — остаётся
      await tx`delete from public.client_orders where order_id = any(${ids}::uuid[]) and claimed_by is null`;
      const gone = await tx<{ id: string }[]>`delete from public.orders o where o.id = any(${ids}::uuid[])
        and not exists (select 1 from public.client_orders c where c.order_id = o.id) returning o.id`;
      const deleted = new Set(gone.map((g) => g.id));
      return rows.filter((r) => deleted.has(r.id)).map((r) => ({ photos: r.photos ?? [], music: r.music_kind === "own" ? r.music_url : null }));
    });
  }

  async recordManagerPayout(p: Omit<ManagerPayout, "createdAt"> & { createdBy: number }) {
    if (p.amount <= 0) return false;
    const rows = await this.sql`insert into public.manager_payouts(manager_id, month, amount, orders, created_by)
      values(${p.managerId}, ${p.month}, ${p.amount}, ${p.orders}, ${p.createdBy}) on conflict do nothing returning month`;
    return rows.length > 0;
  }

  async createPartner(p: NewPartner) {
    const [r] = await this.sql<Partner[]>`insert into public.partners(code,name,telegram_id,username,rate,managed_by,phone,schedule,status,owner_notified_at)
      values(${p.code},${p.name},${p.telegramId},${p.username},${p.rate},${p.managedBy ?? null},${p.phone ?? null},${p.schedule ?? "weekly"},${p.status ?? "active"},${p.ownerNotifiedAt ?? null})
      returning ${this.sql.unsafe(PARTNER_COLUMNS)}`;
    return r;
  }

  async getPartner(id: number) {
    if (!Number.isSafeInteger(id)) return null;
    const [r] = await this.sql<Partner[]>`select ${this.sql.unsafe(PARTNER_COLUMNS)} from public.partners where id = ${id}`;
    return r ?? null;
  }

  async setPartnerRate(id: number, rate: number) {
    await this.sql`update public.partners set rate = ${rate} where id = ${id}`;
  }

  async updatePartner(id: number, patch: PartnerPatch) {
    const row = Object.fromEntries(Object.entries(patch).map(([k, v]) => [PARTNER_PATCH[k as keyof PartnerPatch], v]));
    const cols = Object.keys(row);
    if (!cols.length || !Number.isSafeInteger(id)) return;
    await this.sql`update public.partners set ${this.sql(row, cols)} where id = ${id}`;
  }

  async bindPartner(id: number, userId: number, username: string | null) {
    // Один человек — один действующий партнёр; чужую привязку ссылка не перезаписывает
    const [r] = await this.sql<Partner[]>`update public.partners set telegram_id = ${userId}, username = ${username}
      where id = ${id} and status <> 'rejected' and (telegram_id is null or telegram_id = ${userId})
        and not exists (select 1 from public.partners x where x.id <> ${id} and x.telegram_id = ${userId} and x.status <> 'rejected')
      returning ${this.sql.unsafe(PARTNER_COLUMNS)}`;
    return r ?? null;
  }

  async decidePartner(id: number, status: "active" | "rejected") {
    const rows = await this.sql`update public.partners set status = ${status} where id = ${id} and status = 'pending' returning id`;
    return rows.length > 0;
  }

  async proposePartnerTerms(id: number, rate: number, schedule: PayoutSchedule) {
    await this.sql`update public.partners set proposed_rate = ${rate}, proposed_schedule = ${schedule}, owner_notified_at = null where id = ${id}`;
  }

  async settlePartnerProposal(id: number, accept: boolean) {
    // Одно обновление: двойное нажатие не применит предложение дважды
    const [r] = accept
      ? await this.sql<Partner[]>`update public.partners set rate = proposed_rate, schedule = proposed_schedule, proposed_rate = null, proposed_schedule = null
          where id = ${id} and proposed_rate is not null returning ${this.sql.unsafe(PARTNER_COLUMNS)}`
      : await this.sql<Partner[]>`update public.partners set proposed_rate = null, proposed_schedule = null
          where id = ${id} and proposed_rate is not null returning ${this.sql.unsafe(PARTNER_COLUMNS)}`;
    return r ?? null;
  }

  async findPartnerForUser(userId: number, username: string | null) {
    try {
      const [byId] = await this.sql<Partner[]>`select ${this.sql.unsafe(PARTNER_COLUMNS)} from public.partners where telegram_id = ${userId} and status <> 'rejected' order by id limit 1`;
      if (byId) return byId;
      if (!username) return null;
      const [bound] = await this.sql<Partner[]>`update public.partners set telegram_id = ${userId}
        where id = (select id from public.partners where telegram_id is null and status <> 'rejected' and lower(username) = lower(${username}) order by id limit 1)
        returning ${this.sql.unsafe(PARTNER_COLUMNS)}`;
      return bound ?? null;
    } catch (e) {
      if (isMissingTable(e)) return null;
      throw e;
    }
  }

  async findUserByUsername(username: string) {
    const [r] = await this.sql<UserRow[]>`select * from public.users where lower(username) = lower(${username}) limit 1`;
    return r ? toUser(r) : null;
  }

  async creditPartnerOrder(orderId: string, clientId: number, code: string) {
    const [partner] = await this.sql<Partner[]>`select ${this.sql.unsafe(PARTNER_COLUMNS)} from public.partners p where code = ${code} and p.status <> 'rejected'
      and p.telegram_id is distinct from ${clientId}
      and not exists (select 1 from public.users u where u.id = ${clientId} and p.username is not null and lower(u.username) = lower(p.username))`;
    if (!partner) return null;
    const [row] = await this.sql<{ amount: number }[]>`insert into public.partner_earnings(order_id,partner_id,amount)
      values(${orderId},${partner.id},${partner.rate}) on conflict (order_id) do nothing returning amount`;
    return row ? { partner, amount: row.amount } : null;
  }

  async markEarningDelivered(orderId: string) {
    await this.sql`update public.partner_earnings set delivered = true where order_id = ${orderId}`;
  }

  async recordPartnerPayout(partnerId: number, expected: number, createdBy: number) {
    const staff = this.sql.array((await this.staffIds()).map(String));
    return this.sql.begin(async (tx) => {
      // Блокировка партнёра: две одновременные выплаты идут по очереди
      const [p] = await tx`select id from public.partners where id = ${partnerId} and status = 'active' for update`;
      if (!p || expected <= 0) return false;
      const [{ due }] = await tx<{ due: number }[]>`select
        (select coalesce(sum(e.amount),0) from public.partner_earnings e join public.orders o on o.id = e.order_id
          where e.partner_id = ${partnerId} and not (o.user_id = any(${staff}::text[]::bigint[])))::int
        - (select coalesce(sum(amount),0) from public.partner_payouts where partner_id = ${partnerId})::int as due`;
      if (due !== expected) return false;
      await tx`insert into public.partner_payouts(partner_id,amount,created_by) values(${partnerId},${expected},${createdBy})`;
      return true;
    });
  }

  // ── Роли (v2) ──
  async listManagers() {
    try {
      return [...(await this.sql<Manager[]>`select ${this.sql.unsafe(MANAGER_COLUMNS)} from public.managers order by created_at`)];
    } catch (e) {
      if (isMissingTable(e)) return [];
      throw e;
    }
  }

  async getManager(id: number) {
    if (!Number.isSafeInteger(id)) return null;
    try {
      const [r] = await this.sql<Manager[]>`select ${this.sql.unsafe(MANAGER_COLUMNS)} from public.managers where telegram_id = ${id} and active`;
      return r ?? null;
    } catch (e) {
      if (isMissingTable(e)) return null;
      throw e;
    }
  }

  async addManager(m: { telegramId: number; code: string; username: string | null; firstName: string | null; invitedBy: number }) {
    const [r] = await this.sql<Manager[]>`insert into public.managers(telegram_id,code,username,first_name,invited_by)
      values(${m.telegramId},${m.code},${m.username},${m.firstName},${m.invitedBy})
      on conflict (telegram_id) do update set active = true, removed_at = null, username = excluded.username, first_name = excluded.first_name, invited_by = excluded.invited_by
      returning ${this.sql.unsafe(MANAGER_COLUMNS)}`;
    return r;
  }

  async removeManager(id: number, now: Date) {
    const rows = await this.sql`update public.managers set active = false, removed_at = ${now} where telegram_id = ${id} and active returning telegram_id`;
    return rows.length > 0;
  }

  async createInvite(i: { tokenHash: string; kind: InviteKind; createdBy: number; expiresAt: Date; partnerId?: number | null }) {
    await this.sql`insert into public.staff_invites(token_hash,kind,created_by,partner_id,expires_at)
      values(${i.tokenHash},${i.kind},${i.createdBy},${i.partnerId ?? null},${i.expiresAt})`;
  }

  async useInvite(tokenHash: string, kind: InviteKind, userId: number, now: Date): Promise<InviteUse> {
    try {
      // Одно обновление: два одновременных нажатия не используют ссылку дважды
      const [r] = await this.sql<{ createdBy: number; partnerId: number | null }[]>`update public.staff_invites set used_by = ${userId}, used_at = ${now}
        where token_hash = ${tokenHash} and kind = ${kind} and used_by is null and expires_at > ${now}
        returning created_by as "createdBy", partner_id as "partnerId"`;
      if (r) return { status: "ok", createdBy: Number(r.createdBy), partnerId: r.partnerId === null ? null : Number(r.partnerId) };
      const [old] = await this.sql<{ used: boolean }[]>`select used_by is not null as used from public.staff_invites where token_hash = ${tokenHash} and kind = ${kind}`;
      return { status: !old ? "none" : old.used ? "used" : "expired" };
    } catch (e) {
      if (isMissingTable(e)) return { status: "none" };
      throw e;
    }
  }

  async issueClientOrder(o: { orderId: string; createdBy: number; tokenHash: string; refSource: string | null }) {
    await this.sql`insert into public.client_orders(order_id,created_by,token_hash,ref_source)
      values(${o.orderId},${o.createdBy},${o.tokenHash},${o.refSource})
      on conflict (order_id) do update set token_hash = excluded.token_hash, ref_source = excluded.ref_source, created_by = excluded.created_by
      where public.client_orders.claimed_by is null`;
  }

  async claimClientOrder(tokenHash: string, clientId: number, now: Date): Promise<{ status: ClaimStatus; order?: OrderRecord }> {
    try {
      return await this.sql.begin(async (tx) => {
        const [co] = await tx<{ orderId: string; createdBy: number; claimedBy: number | null }[]>`select order_id as "orderId", created_by as "createdBy", claimed_by as "claimedBy"
          from public.client_orders where token_hash = ${tokenHash} for update`;
        if (!co) return { status: "none" as const };
        const claimedBy = co.claimedBy === null ? null : Number(co.claimedBy);
        if (claimedBy === clientId) return { status: "mine" as const, order: (await loadOrder(tx, co.orderId)) ?? undefined };
        if (claimedBy !== null) return { status: "used" as const };
        if (Number(co.createdBy) === clientId) return { status: "creator" as const, order: (await loadOrder(tx, co.orderId)) ?? undefined };
        const moved = await tx`update public.orders set user_id = ${clientId}, updated_at = ${now}
          where id = ${co.orderId} and user_id = ${co.createdBy} and status in ('draft','preview','awaiting_payment','rejected') returning id`;
        if (!moved.length) return { status: "closed" as const };
        await tx`update public.client_orders set claimed_by = ${clientId}, claimed_at = ${now} where order_id = ${co.orderId}`;
        return { status: "claimed" as const, order: (await loadOrder(tx, co.orderId)) ?? undefined };
      });
    } catch (e) {
      if (isMissingTable(e)) return { status: "none" };
      throw e;
    }
  }

  async clientOrderRef(orderId: string) {
    if (!UUID.test(orderId)) return null;
    try {
      const [r] = await this.sql<{ ref: string | null }[]>`select ref_source as ref from public.client_orders where order_id = ${orderId} and claimed_by is not null`;
      return r ? { ref: r.ref } : null;
    } catch (e) {
      if (isMissingTable(e)) return null;
      throw e;
    }
  }

  async uncreditedPartnerOrders() {
    try {
      const rows = await this.sql<{ id: string; userId: number }[]>`select o.id, o.user_id as "userId" from public.orders o
        join public.users u on u.id = o.user_id
        join public.partners p on 'p_' || p.code = u.source
        where o.status in ('active','archived')
          and p.telegram_id is distinct from o.user_id
          and not exists (select 1 from public.partner_earnings e where e.order_id = o.id)`;
      return [...rows];
    } catch (e) {
      if (isMissingTable(e)) return [];
      throw e;
    }
  }

  async logBotError(e: BotErrorEntry) {
    await this.sql`insert into public.bot_errors(step,update_kind,error_name,error_code,message,stack,outcome)
      values(${e.step},${e.updateKind},${e.errorName},${e.errorCode},${e.message},${e.stack},${e.outcome})`;
  }
  async recordEvent(userId: number, kind: Extract<AnalyticsEventKind, "demo_opened" | "design_selected">, target: string, key: string) {
    await this.sql`insert into public.analytics_events(kind,user_id,target,dedupe_key) values(${kind},${userId},${target},${key}) on conflict do nothing`;
  }
  private sql: Sql;

  constructor(sql: Sql = db()) {
    this.sql = sql;
  }

  // ── Пользователи ──
  async getUser(id: number) {
    const [r] = await this.sql<UserRow[]>`select * from public.users where id = ${id}`;
    return r ? toUser(r) : null;
  }

  async touchUser(u: { id: number; username?: string | null; firstName?: string | null; source?: string | null }) {
    const [r] = await this.sql<UserRow[]>`
      insert into public.users (id, username, first_name, source)
      values (${u.id}, ${u.username ?? null}, ${u.firstName ?? null}, ${u.source ?? null})
      on conflict (id) do update set
        username = case when ${u.username !== undefined} then excluded.username else public.users.username end,
        first_name = case when ${u.firstName !== undefined} then excluded.first_name else public.users.first_name end,
        last_seen_at = now()
      returning *`;
    return toUser(r);
  }

  async setLang(id: number, lang: Lang) {
    const r = await this.sql`update public.users set lang = ${lang} where id = ${id} returning id`;
    if (!r.length) throw new Error(`Пользователь не найден: ${id}`);
  }

  async saveStep(id: number, step: string, state: Record<string, unknown>) {
    const r = await this.sql`
      update public.users set step = ${step}, state = ${this.sql.json(state as never)}
      where id = ${id} returning id`;
    if (!r.length) throw new Error(`Пользователь не найден: ${id}`);
  }

  async claimStep(id: number, expectedQ: number, nextQ: number) {
    // Одна строка update — атомарно: из двух параллельных запросов пройдёт только один
    const r = await this.sql`
      update public.users set state = jsonb_set(state, '{q}', to_jsonb(${nextQ}::int))
      where id = ${id} and coalesce((state->>'q')::int, 0) = ${expectedQ}
      returning id`;
    return r.length > 0;
  }

  // ── Админы ──
  async isAdmin(id: number) {
    if (env.adminIdsOrEmpty().includes(id)) return true;
    const [r] = await this.sql`select 1 from public.admins where telegram_id = ${id}`;
    return Boolean(r);
  }

  async listAdminIds() {
    const rows = await this.sql<{ telegram_id: number }[]>`select telegram_id from public.admins`;
    return [...new Set([...env.adminIdsOrEmpty(), ...rows.map((r) => r.telegram_id)])];
  }

  // ── Музыка ──
  async listMusic(occasion?: Occasion) {
    const o = occasion ?? null;
    const rows = await this.sql<MusicRow[]>`
      select id, title_uz, title_ru, file_url, telegram_file_id, sort, occasion, is_artist
      from public.music
      where is_active and (${o}::text is null or occasion is null or occasion = ${o})
      order by sort, id`;
    return rows.map(toMusicRecord);
  }

  async setMusicTelegramFileId(musicId: string, fileId: string) {
    await this.sql`update public.music set telegram_file_id = ${fileId} where id = ${musicId}`;
  }

  // ── Заказы ──
  async createOrder(o: NewOrder): Promise<OrderRecord> { return (await this.insertOrder(o))!; }

  async createOrderFromDraft(o: NewOrder, expectedQ: number, handledUpdates?: number[]) { return this.insertOrder(o, expectedQ, handledUpdates); }

  private async insertOrder(o: NewOrder, expectedQ?: number, handledUpdates?: number[]): Promise<OrderRecord | null> {
    // Одинаковый slugBase одновременно: блокировка в транзакции + повтор при гонке
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.sql.begin(async (tx) => {
          if (expectedQ !== undefined) {
            const state = {q:expectedQ+1,...(handledUpdates ? {handledUpdates} : {})};
            const claimed = await tx`update public.users set step = 'idle', state = ${tx.json(state)}
              where id = ${o.userId} and step = 'review' and coalesce((state->>'q')::int,0) = ${expectedQ} returning id`;
            if (!claimed.length) return null;
          }
          await tx`select pg_advisory_xact_lock(hashtext(${"slug:" + o.slugBase}))`;
          const slug = await this.freeSlug(tx, o.slugBase);
          const cols: Columns = {
            user_id: o.userId,
            status: o.status ?? "draft",
            format: o.format,
            template_id: o.templateId,
            amount: o.amount,
            slug,
            ...dataColumns(o.data),
            ...musicColumns(o.music),
          };
          cols.occasion = o.occasion;
          const [{ id }] = await tx<{ id: string }[]>`insert into public.orders ${tx(cols)} returning id`;
          await writeEvents(tx, id, o.data.events ?? [], false);
          return (await loadOrder(tx, id))!;
        });
      } catch (e) {
        if (attempt < 4 && isUniqueSlugViolation(e)) continue;
        throw e;
      }
    }
  }

  /** slugBase, если свободен; иначе slugBase-2, -3… */
  private async freeSlug(tx: Tx, base: string) {
    // и текущие адреса, и все прежние (slug_history): адрес не переиспользуется никогда
    const rows = await tx<{ slug: string }[]>`
      select slug from public.slug_history
      where slug = ${base} or (left(slug, ${base.length + 1}) = ${base + "-"} and substr(slug, ${base.length + 2}) ~ '^[0-9]+$')
      union
      select slug from public.orders
      where slug = ${base} or (left(slug, ${base.length + 1}) = ${base + "-"} and substr(slug, ${base.length + 2}) ~ '^[0-9]+$')`;
    const taken = new Set(rows.map((r) => r.slug));
    if (!taken.has(base) && !isReservedSlug(base)) return base;
    for (let i = 2; ; i++) if (!taken.has(`${base}-${i}`)) return `${base}-${i}`;
  }

  async getOrder(id: string) {
    if (!UUID.test(id)) return null;
    return loadOrder(this.sql, id);
  }

  async getOrderByNumber(n: number) {
    if (!Number.isSafeInteger(n) || n < 1 || n > INT4_MAX) return null;
    const [r] = await this.sql<OrderRow[]>`${selectOrders(this.sql)} where o.number = ${n}`;
    return r ? toOrder(r) : null;
  }

  async getOrderBySlug(slug: string) {
    const [r] = await this.sql<OrderRow[]>`${selectOrders(this.sql)} where o.slug = ${slug}`;
    return r ? toOrder(r) : null;
  }

  async listOrdersByUser(userId: number) {
    const rows = await this.sql<OrderRow[]>`${selectOrders(this.sql)} where o.user_id = ${userId} order by o.number desc`;
    return rows.map(toOrder);
  }

  async listOrdersByStatus(statuses: OrderStatus[]) {
    if (!statuses.length) return [];
    const rows = await this.sql<OrderRow[]>`
      ${selectOrders(this.sql)} where o.status = any(${this.sql.array(statuses)}::text[]) order by o.number desc`;
    return rows.map(toOrder);
  }

  async findOrders(query: string) {
    const q = query.trim().toLowerCase().replace(/^#/, "");
    if (!q) return [];
    const n = /^\d+$/.test(q) && Number(q) <= INT4_MAX ? Number(q) : null;
    const like = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
    const rows = await this.sql<OrderRow[]>`
      ${selectOrders(this.sql)}
      left join public.users u on u.id = o.user_id
      where o.number = ${n}
         or o.slug ilike ${like} or o.groom ilike ${like} or o.bride ilike ${like}
         or o.person ilike ${like} or o.hosts ilike ${like} or u.username ilike ${like}
      order by o.number desc
      limit 100`;
    return rows.map(toOrder);
  }

  async updateOrder(id: string, patch: OrderPatch) {
    const updated = UUID.test(id) ? await this.update(id, null, patch) : null;
    if (!updated) throw new Error(`Заказ не найден: ${id}`);
    return updated;
  }

  async transition(id: string, from: OrderStatus[], to: OrderStatus, patch: OrderPatch = {}) {
    if (!UUID.test(id) || !from.length) return null;
    return this.update(id, from, { ...patch, status: to });
  }

  /** update … where id = $1 [and status = any($2)] returning — атомарно, вместе с тадбирами */
  private update(id: string, from: OrderStatus[] | null, patch: OrderPatch) {
    return this.sql.begin(async (tx) => {
      const cols = patchColumns(patch);
      const rows = from
        ? await tx`update public.orders set ${tx(cols)}
                   where id = ${id} and status = any(${tx.array(from)}::text[]) returning id`
        : await tx`update public.orders set ${tx(cols)} where id = ${id} returning id`;
      if (!rows.length) return null;
      if (patch.data) await writeEvents(tx, id, patch.data.events ?? [], true);
      return loadOrder(tx, id);
    });
  }

  async isSlugTaken(slug: string, exceptOrderId?: string) {
    if (isReservedSlug(slug)) return true;
    const except = exceptOrderId ?? null;
    const [r] = await this.sql`
      select 1 from public.orders
      where slug = ${slug} and (${except}::text is null or id::text <> ${except})
      union all
      select 1 from public.slug_history
      where slug = ${slug} and (${except}::text is null or order_id::text <> ${except})
      limit 1`;
    return Boolean(r);
  }

  async resolveSlug(slug: string) {
    const [r] = await this.sql<{ slug: string }[]>`
      select o.slug from public.slug_history h join public.orders o on o.id = h.order_id
      where h.slug = ${slug}`;
    return r?.slug ?? null;
  }

  // ── Напоминания и статистика ──
  async ordersAwaitingAdmin(before: Date) {
    const rows = await this.sql<OrderRow[]>`
      ${selectOrders(this.sql)}
      where o.status = 'receipt_sent' and o.receipt_at < ${before} and o.admin_reminded_at is null
      order by o.number desc`;
    return rows.map(toOrder);
  }

  async ordersAbandonedAtPayment(before: Date) {
    const rows = await this.sql<OrderRow[]>`
      ${selectOrders(this.sql)}
      where o.status in ('preview', 'awaiting_payment') and o.updated_at < ${before} and o.payment_reminded_at is null
      order by o.number desc`;
    return rows.map(toOrder);
  }

  async stats(now: Date): Promise<Stats> {
    // «Сегодня» — с полуночи по времени Казахстана; неделя — 7 суток; месяц — 30 суток (как repo-memory)
    const today = new Date(Math.floor((now.getTime() + TZ_OFFSET_MS) / DAY) * DAY - TZ_OFFSET_MS);
    const week = new Date(now.getTime() - 7 * DAY);
    const month = new Date(now.getTime() - 30 * DAY);
    const paid = this.sql.array(PAID);
    const staff = this.sql.array((await this.staffIds()).map(String));
    const [t] = await this.sql<Record<string, number>[]>`
      select
        count(*) filter (where created_at >= ${today})::int8 as o_today,
        count(*) filter (where created_at >= ${week})::int8 as o_week,
        count(*) filter (where created_at >= ${month})::int8 as o_month,
        count(*)::int8 as o_total,
        coalesce(sum(amount) filter (where status = any(${paid}::text[]) and coalesce(paid_at, updated_at) >= ${today}), 0)::int8 as r_today,
        coalesce(sum(amount) filter (where status = any(${paid}::text[]) and coalesce(paid_at, updated_at) >= ${week}), 0)::int8 as r_week,
        coalesce(sum(amount) filter (where status = any(${paid}::text[]) and coalesce(paid_at, updated_at) >= ${month}), 0)::int8 as r_month,
        coalesce(sum(amount) filter (where status = any(${paid}::text[])), 0)::int8 as r_total
      from public.orders where not (user_id = any(${staff}::text[]::bigint[]))`;
    const statusRows = await this.sql<{ status: OrderStatus; n: number }[]>`
      select status, count(*)::int8 as n from public.orders where not (user_id = any(${staff}::text[]::bigint[])) group by status`;
    const sourceRows = await this.sql<{ source: string; users: number; paid: number }[]>`
      select coalesce(u.source, '—') as source, count(*)::int8 as users, coalesce(sum(p.n), 0)::int8 as paid
      from public.users u
      left join (
        select user_id, count(*) as n from public.orders where status = any(${paid}::text[]) group by user_id
      ) p on p.user_id = u.id
      where not (u.id = any(${staff}::text[]::bigint[]))
      group by 1
      order by 2 desc`;
    const byStatus: Stats["byStatus"] = {};
    for (const r of statusRows) byStatus[r.status] = r.n;
    return {
      orders: { today: t.o_today, week: t.o_week, month: t.o_month, total: t.o_total },
      revenue: { today: t.r_today, week: t.r_week, month: t.r_month, total: t.r_total },
      byStatus,
      bySource: sourceRows.map((r) => ({ source: r.source, users: r.users, paid: r.paid })),
    };
  }
}

export function createPgRepo(): Repo {
  return new PgRepo();
}
