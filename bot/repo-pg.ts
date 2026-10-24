/**
 * Repo на Postgres (Supabase) через lib/db.ts (роль inviteizi_server).
 * Поведение — как у bot/repo-memory.ts (общий набор тестов bot/repo.contract.ts).
 * Таблицы: supabase/migrations/*_schema.sql.
 */
import type { Repo } from "./repo";
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
import type { EventKind, Relation } from "@/lib/types";
import { db, type Sql, type Tx } from "@/lib/db";
import { env } from "@/lib/env";
import { isReservedSlug } from "@/lib/slug";

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
  };
}

type Columns = Record<string, string | number | boolean | Date | null>;

function dataColumns(d: InvitationData): Columns {
  return {
    occasion: d.occasion,
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
  if (p.data !== undefined) Object.assign(c, dataColumns(p.data));
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

export class PgRepo implements Repo {
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
  async listMusic() {
    const rows = await this.sql<MusicRow[]>`
      select id, title_uz, title_ru, file_url, telegram_file_id, sort
      from public.music where is_active order by sort, id`;
    return rows.map(toMusicRecord);
  }

  async setMusicTelegramFileId(musicId: string, fileId: string) {
    await this.sql`update public.music set telegram_file_id = ${fileId} where id = ${musicId}`;
  }

  // ── Заказы ──
  async createOrder(o: NewOrder): Promise<OrderRecord> {
    // Одинаковый slugBase одновременно: блокировка в транзакции + повтор при гонке
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.sql.begin(async (tx) => {
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
      from public.orders`;
    const statusRows = await this.sql<{ status: OrderStatus; n: number }[]>`
      select status, count(*)::int8 as n from public.orders group by status`;
    const sourceRows = await this.sql<{ source: string; users: number; paid: number }[]>`
      select coalesce(u.source, '—') as source, count(*)::int8 as users, coalesce(sum(p.n), 0)::int8 as paid
      from public.users u
      left join (
        select user_id, count(*) as n from public.orders where status = any(${paid}::text[]) group by user_id
      ) p on p.user_id = u.id
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
