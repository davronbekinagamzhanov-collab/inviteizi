/**
 * Хранилище бота. Две реализации с одинаковым поведением:
 *  - bot/repo-memory.ts — в памяти, для тестов;
 *  - bot/repo-pg.ts — Postgres (Supabase) через lib/db.ts.
 * Логика бота (bot/flow) знает только этот интерфейс.
 */
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

export interface Repo {
  // ── Пользователи ──
  getUser(id: number): Promise<UserRecord | null>;
  /** Создать при первом /start (source — метка ?start=…, только при создании) или обновить имя/username и lastSeenAt */
  touchUser(u: { id: number; username?: string | null; firstName?: string | null; source?: string | null }): Promise<UserRecord>;
  setLang(id: number, lang: Lang): Promise<void>;
  /** Сохранить шаг диалога и его данные (бот помнит, где клиент остановился) */
  saveStep(id: number, step: string, state: Record<string, unknown>): Promise<void>;

  // ── Админы ──
  /** Админ — если id есть в ADMIN_IDS (env) или в таблице admins */
  isAdmin(id: number): Promise<boolean>;
  listAdminIds(): Promise<number[]>;

  // ── Музыка ──
  listMusic(): Promise<MusicRecord[]>;
  setMusicTelegramFileId(musicId: string, fileId: string): Promise<void>;

  // ── Заказы ──
  /** Создаёт заказ: номер по порядку, slug = slugBase или slugBase-2, -3… если занят */
  createOrder(o: NewOrder): Promise<OrderRecord>;
  getOrder(id: string): Promise<OrderRecord | null>;
  getOrderByNumber(n: number): Promise<OrderRecord | null>;
  getOrderBySlug(slug: string): Promise<OrderRecord | null>;
  listOrdersByUser(userId: number): Promise<OrderRecord[]>;
  listOrdersByStatus(statuses: OrderStatus[]): Promise<OrderRecord[]>;
  /** Поиск для /find: по номеру, slug, именам, хозяевам, username (без учёта регистра) */
  findOrders(query: string): Promise<OrderRecord[]>;
  updateOrder(id: string, patch: OrderPatch): Promise<OrderRecord>;
  /**
   * Атомарная смена статуса: меняет, только если текущий статус в from.
   * Возвращает null, если статус уже другой (двойное нажатие «Тасдиқлаш»).
   */
  transition(id: string, from: OrderStatus[], to: OrderStatus, patch?: OrderPatch): Promise<OrderRecord | null>;
  isSlugTaken(slug: string, exceptOrderId?: string): Promise<boolean>;

  // ── Напоминания и статистика ──
  /** receipt_sent, чек пришёл раньше before и админу ещё не напоминали */
  ordersAwaitingAdmin(before: Date): Promise<OrderRecord[]>;
  /** preview/awaiting_payment, заказ не менялся с before и клиенту ещё не напоминали */
  ordersAbandonedAtPayment(before: Date): Promise<OrderRecord[]>;
  stats(now: Date): Promise<Stats>;
}
