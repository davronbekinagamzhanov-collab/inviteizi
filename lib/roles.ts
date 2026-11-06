/**
 * Роли бота (v2): владелец (ADMIN_IDS и таблица admins), менеджер (таблица managers), партнёр (partners), клиент.
 * Одноразовые ссылки: в Telegram уходит токен, в базе — только его sha256.
 */
import { createHash, randomBytes } from "node:crypto";

export type Role = "owner" | "manager" | "partner" | "client";

export type Manager = {
  telegramId: number;
  code: string;
  username: string | null;
  firstName: string | null;
  invitedBy: number;
  active: boolean;
  createdAt: Date;
  /** Когда сняли (null — работает). Оплаты сети после снятия ему не засчитываются */
  removedAt?: Date | null;
};

export type InviteKind = "manager" | "partner";
export type InviteUse = { status: "ok"; createdBy: number; partnerId: number | null } | { status: "used" | "expired" | "none" };

export type ClaimStatus = "claimed" | "mine" | "used" | "creator" | "closed" | "none";

/** Ссылка менеджера живёт 72 часа, партнёра — 7 дней */
export const INVITE_TTL_MS: Record<InviteKind, number> = { manager: 72 * 3_600_000, partner: 7 * 24 * 3_600_000 };

const TOKEN_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

/** 20 знаков из 31 — ~99 бит: перебором не угадать */
export function newToken(length = 20) {
  return [...randomBytes(length)].map((b) => TOKEN_ALPHABET[b % TOKEN_ALPHABET.length]).join("");
}

/** Как показать менеджера: @username, имя или id */
export const managerName = (m: Pick<Manager, "username" | "firstName" | "telegramId">) =>
  m.username ? `@${m.username}` : m.firstName?.slice(0, 32) || `id ${m.telegramId}`;

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** Метки ?start=…: mgr_ (стать менеджером), join_ (стать партнёром), o_ (забрать заказ). Это не источник клиента */
export const START_TOKEN = /^(mgr|join|o)_([a-z0-9]{12,40})$/;

export function parseStartToken(args: string | undefined | null): { kind: "mgr" | "join" | "o"; token: string } | null {
  const m = START_TOKEN.exec((args ?? "").trim());
  return m ? { kind: m[1] as "mgr" | "join" | "o", token: m[2] } : null;
}

/** Продажа менеджера: m_<код>; для заказов «для клиента» и (в части 7) заработка его сети */
export const managerSource = (code: string) => `m_${code}`;
export const parseManagerSource = (source: string | null) => /^m_([a-z0-9]{4,32})$/.exec(source ?? "")?.[1] ?? null;

/** Заработок менеджера: за каждый оплаченный заказ его сети + бонус за 30+ оплат в месяц */
export const MANAGER_PER_ORDER = 500;
export const MANAGER_BONUS = 15_000;
export const MANAGER_GOAL = 30;
