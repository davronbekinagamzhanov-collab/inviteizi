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
import type { BotErrorEntry } from "./errors";
import type { PanelSnapshot, Partner } from "@/lib/owner-panel";
import type { RsvpInput, RsvpRecord } from "@/lib/rsvp";
import type { ClaimStatus, InviteKind, InviteUse, Manager } from "@/lib/roles";

export interface Repo {
  /** Журнал ошибок бота: entry уже очищен от личных данных */
  logBotError(entry: BotErrorEntry): Promise<void>;
  isOwner(id: number): Promise<boolean>;
  canAnalyze(id: number): Promise<boolean>;
  analytics(actorId: number, period: Period, now: Date, customers?: boolean): Promise<Analytics>;
  /** Newest saved first, template ID ascending on equal timestamps; repeat add keeps its place. */
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
  /** Atomically consume the review question and create the order; failure rolls both back. */
  createOrderFromDraft(o: NewOrder, expectedQ: number, handledUpdates?: number[]): Promise<OrderRecord | null>;
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

  // ── Панель владельца и партнёры (права проверяет логика бота) ──
  panelSnapshot(): Promise<PanelSnapshot>;
  /** Владелец и админы: их действия не считаются в статистике */
  staffIds(): Promise<number[]>;
  /** Ответ гостя: повтор с того же устройства заменяет прежний */
  saveRsvp(input: RsvpInput): Promise<"ok" | "limited">;
  /** Новые ответы сверху. Таблицы ещё нет — пусто */
  listRsvp(orderId: string): Promise<RsvpRecord[]>;
  /** Оплаченные заказы с новыми ответами, которым сегодня сводку ещё не слали */
  rsvpDigestDue(dayStart: Date): Promise<{ id: string; number: number; userId: number; since: Date | null }[]>;
  /** Ставит метку сводки; false — сегодня её уже забрал другой запуск */
  claimRsvpDigest(orderId: string, dayStart: Date, now: Date): Promise<boolean>;
  createPartner(p: { code: string; name: string; telegramId: number | null; username: string | null; rate: number; managedBy?: number | null }): Promise<Partner>;
  getPartner(id: number): Promise<Partner | null>;
  setPartnerRate(id: number, rate: number): Promise<void>;
  /** Партнёр этого человека: по id или по username (id тогда запоминается). Нет таблицы или партнёра — null */
  findPartnerForUser(userId: number, username: string | null): Promise<Partner | null>;
  findUserByUsername(username: string): Promise<UserRecord | null>;
  /**
   * Один раз начислить за оплаченный заказ по текущей ставке.
   * null — уже начислено, партнёра нет или заказ сделал сам партнёр.
   */
  creditPartnerOrder(orderId: string, clientId: number, code: string): Promise<{ partner: Partner; amount: number } | null>;
  markEarningDelivered(orderId: string): Promise<void>;
  /** Выплата проходит, только если к выплате ровно expected */
  recordPartnerPayout(partnerId: number, expected: number, createdBy: number): Promise<boolean>;
  /** Оплаченные заказы пришедших от партнёра клиентов без начисления */
  uncreditedPartnerOrders(): Promise<{ id: string; userId: number }[]>;

  // ── Роли (v2): менеджеры, одноразовые ссылки, заказы «для клиента». Таблиц ещё нет — пусто / none ──
  /** Все менеджеры, и снятые тоже (active = false) */
  listManagers(): Promise<Manager[]>;
  /** Активный менеджер или null */
  getManager(id: number): Promise<Manager | null>;
  /** Назначить (снятого — вернуть) */
  addManager(m: { telegramId: number; code: string; username: string | null; firstName: string | null; invitedBy: number }): Promise<Manager>;
  /** false — уже снят или не был менеджером */
  removeManager(id: number, now: Date): Promise<boolean>;
  createInvite(i: { tokenHash: string; kind: InviteKind; createdBy: number; expiresAt: Date; partnerId?: number | null }): Promise<void>;
  /** Атомарно: ссылка срабатывает один раз и только до expiresAt */
  useInvite(tokenHash: string, kind: InviteKind, userId: number, now: Date): Promise<InviteUse>;
  /** Неоплаченный заказ сотрудника → ссылка для клиента (повтор заменяет ссылку, пока клиент не забрал) */
  issueClientOrder(o: { orderId: string; createdBy: number; tokenHash: string; refSource: string | null }): Promise<void>;
  /** Клиент забирает заказ: заказ переходит к нему (user_id), один раз */
  claimClientOrder(tokenHash: string, clientId: number, now: Date): Promise<{ status: ClaimStatus; order?: OrderRecord }>;
  /** Забранный клиентом заказ «для клиента»: кому засчитать (m_<код> менеджера; ref null — напрямую). null — обычный заказ */
  clientOrderRef(orderId: string): Promise<{ ref: string | null } | null>;
}
