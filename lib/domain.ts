/**
 * Записи базы (как их видит код). Общий контракт для бота (bot/), страницы /{slug} и базы (lib/db, bot/repo-pg).
 * Таблицы: users, admins, templates, music, orders, events — см. supabase/migrations.
 */
import type { InvitationData, InvitationEvent, Occasion } from "./types";
import type { Format } from "@/templates/registry";

// Format derives from the single catalog: animated / scroll / simple.
export type { Format };
export type Lang = "uz" | "ru" | "kk";

/** Статусы заказа (CLAUDE.md): draft → preview → awaiting_payment → receipt_sent → active → archived (+ rejected) */
export type OrderStatus =
  | "draft"
  | "preview"
  | "awaiting_payment"
  | "receipt_sent"
  | "active"
  | "archived"
  | "rejected";

/** Музыка заказа: из нашего списка / своя песня клиента (файл Telegram) / без музыки */
export type MusicChoice =
  | { kind: "list"; musicId: string }
  | { kind: "own"; fileId: string; url?: string; title?: string }
  | { kind: "none" };

export type UserRecord = {
  id: number; // Telegram user id
  username: string | null;
  firstName: string | null;
  lang: Lang | null; // null — ещё не выбрал
  /** Текущий шаг диалога (бот помнит его между сообщениями и днями) */
  step: string;
  /** Данные шага: черновик анкеты, позиция в каталоге и т.п. (jsonb) */
  state: Record<string, unknown>;
  /** Откуда пришёл: ?start=insta, ?start=qr_… */
  source: string | null;
  createdAt: Date;
  lastSeenAt: Date;
};

export type MusicRecord = {
  id: string;
  titleUz: string;
  titleRu: string;
  /** Публичный адрес файла (Storage, бакет music) */
  fileUrl: string;
  /** file_id в Telegram, когда файл уже отправлялся (чтобы не грузить заново) */
  telegramFileId: string | null;
  sort: number;
  /** Тадбир трека: бот показывает список только для типа заказа. Нет — трек подходит всем */
  occasion?: Occasion | null;
  /** Песня исполнителя (владелец может скрыть все разом) */
  isArtist?: boolean;
};

export type Receipt = { fileId: string; kind: "photo" | "document" };

export type OrderRecord = {
  id: string; // uuid
  number: number; // номер заказа для комментария к переводу (#245)
  userId: number;
  status: OrderStatus;
  occasion: Occasion;
  format: Format;
  templateId: string;
  /** Всё, что видят гости: имена, хозяева, стороны, текст, события */
  data: InvitationData;
  music: MusicChoice;
  slug: string;
  amount: number; // ₸, saved purchase price; never recompute from the current registry on read
  receipt: Receipt | null;
  rejectReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  receiptAt: Date | null;
  paidAt: Date | null;
  paymentRemindedAt: Date | null;
  adminRemindedAt: Date | null;
  /** После этой даты ссылка показывает заглушку (последний тадбир + 30 дней) */
  expiresAt: Date | null;
};

export type NewOrder = Pick<
  OrderRecord,
  "userId" | "occasion" | "format" | "templateId" | "data" | "music" | "amount"
> & { status?: OrderStatus; slugBase: string };

export type OrderPatch = Partial<
  Pick<
    OrderRecord,
    | "status"
    | "templateId"
    | "format"
    | "data"
    | "music"
    | "slug"
    | "amount"
    | "receipt"
    | "rejectReason"
    | "receiptAt"
    | "paidAt"
    | "paymentRemindedAt"
    | "adminRemindedAt"
    | "expiresAt"
  >
>;

export type Stats = {
  orders: { today: number; week: number; month: number; total: number };
  revenue: { today: number; week: number; month: number; total: number }; // ₸, только active/archived
  byStatus: Partial<Record<OrderStatus, number>>;
  bySource: { source: string; users: number; paid: number }[];
};

export type { InvitationData, InvitationEvent, Occasion };
