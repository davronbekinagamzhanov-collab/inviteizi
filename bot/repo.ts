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
import type { Occasion } from "@/lib/types";
import type { Analytics, Period, EventKind } from "@/lib/analytics";

export interface Repo {
  isOwner(id: number): Promise<boolean>;
  canAnalyze(id: number): Promise<boolean>;
  analytics(actorId: number, period: Period, now: Date, customers?: boolean): Promise<Analytics>;
  listFavorites(userId: number): Promise<string[]>;
  setFavorite(userId: number, templateId: string, saved: boolean): Promise<void>;
  recordEvent(userId: number, kind: Extract<EventKind, "demo_opened" | "design_selected">, target: string, key: string): Promise<void>;
  // ── Пользователи ──
  getUser(id: number): Promise<UserRecord | null>;
  /** Создать при первом /start (source — метка ?start=…, только при создании) или обновить имя/username и lastSeenAt */
  touchUser(u: { id: number; username?: string | null; firstName?: string | null; source?: string | null }): Promise<UserRecord>;
  setLang(id: number, lang: Lang): Promise<void>;
  /** Сохранить шаг диалога и его данные (бот помнит, где клиент остановился) */
  saveStep(id: number, step: string, state: Record<string, unknown>): Promise<void>;
  /**
   * Атомарно «занять» ответ: номер вопроса в state.q меняется с expectedQ на nextQ,
   * только если он всё ещё expectedQ. false — этот ответ уже обработал параллельный запрос
   * (Telegram шлёт webhook параллельно: двойное нажатие не должно создать два заказа).
   */
  claimStep(id: number, expectedQ: number, nextQ: number): Promise<boolean>;

  // ── Админы ──
  /** Админ — если id есть в ADMIN_IDS (env) или в таблице admins */
  isAdmin(id: number): Promise<boolean>;
  listAdminIds(): Promise<number[]>;

  // ── Музыка ──
  /** Активные треки по sort; с occasion — только треки этого тадбира (и треки без тадбира) */
  listMusic(occasion?: Occasion): Promise<MusicRecord[]>;
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
  /**
   * Адрес занят: запретный (demo, catalog…), у другого заказа сейчас или БЫЛ когда-либо раньше.
   * Адрес никогда не переиспользуется — гости со старой ссылкой не увидят чужой тўй.
   */
  isSlugTaken(slug: string, exceptOrderId?: string): Promise<boolean>;
  /** Текущий адрес заказа, которому когда-либо принадлежал slug (старая ссылка → новая). Нет — null */
  resolveSlug(slug: string): Promise<string | null>;

  // ── Напоминания и статистика ──
  /** receipt_sent, чек пришёл раньше before и админу ещё не напоминали */
  ordersAwaitingAdmin(before: Date): Promise<OrderRecord[]>;
  /** preview/awaiting_payment, заказ не менялся с before и клиенту ещё не напоминали */
  ordersAbandonedAtPayment(before: Date): Promise<OrderRecord[]>;
  stats(now: Date): Promise<Stats>;
}
