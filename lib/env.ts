/**
 * Доступ к переменным окружения — только через этот файл.
 * Значения лежат в .env.local (локально) и в настройках Vercel. В коде секретов нет.
 * Нет обязательной переменной → понятная ошибка с её именем (значение никогда не печатается).
 */

const SUPABASE_REF = "hjakyirmyauqhurkqhsn";
const POOLER_HOST = "aws-0-ap-northeast-2.pooler.supabase.com";

export class MissingEnvError extends Error {
  constructor(name: string) {
    super(`Нет переменной окружения ${name} (добавьте её в .env.local и в настройки Vercel)`);
    this.name = "MissingEnvError";
  }
}

function required(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new MissingEnvError(name);
  return v;
}

function optional(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}

export const env = {
  /** Explicit immutable Telegram ID. Missing configuration disables private reports. */
  ownerId: (): number | undefined => {
    const id = Number(optional("OWNER_TELEGRAM_ID"));
    return Number.isSafeInteger(id) && id > 0 ? id : undefined;
  },
  analyticsAdminIds: (): number[] => (optional("ANALYTICS_ADMIN_IDS") ?? "").split(",").map(Number).filter(n => Number.isSafeInteger(n) && n > 0),
  analyticsSecret: () => optional("ANALYTICS_SIGNING_SECRET"),
  telegramBotToken: () => required("TELEGRAM_BOT_TOKEN"),
  telegramWebhookSecret: () => required("TELEGRAM_WEBHOOK_SECRET"),
  /** Telegram id админов из ADMIN_IDS (через запятую). Нет переменной — ошибка */
  adminIds: (): number[] =>
    required("ADMIN_IDS")
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isSafeInteger(n) && n > 0),
  /** То же, но без ошибки, если переменной нет (для Repo.isAdmin: там есть ещё таблица admins) */
  adminIdsOrEmpty: (): number[] => (optional("ADMIN_IDS") ? env.adminIds() : []),
  ownerUsername: () => required("OWNER_USERNAME").replace(/^@/, ""),
  kaspiPhone: () => required("KASPI_PHONE"),
  kaspiName: () => required("KASPI_NAME"),
  pixabayApiKey: () => required("PIXABAY_API_KEY"),
  storageGateSecret: () => required("STORAGE_GATE_SECRET"),
  /** Адрес сайта без «/» на конце */
  publicBaseUrl: () => (optional("PUBLIC_BASE_URL") ?? "https://inviteizi.vercel.app").replace(/\/+$/, ""),
  supabaseUrl: () => (optional("SUPABASE_URL") ?? `https://${SUPABASE_REF}.supabase.co`).replace(/\/+$/, ""),
  /** Строка подключения к Postgres ролью inviteizi_server через пулер (transaction mode, порт 6543) */
  databaseUrl: (): string => {
    const url = optional("DATABASE_URL");
    if (url) return url;
    const password = optional("DB_SERVER_PASSWORD");
    if (!password) throw new MissingEnvError("DATABASE_URL или DB_SERVER_PASSWORD");
    return `postgres://inviteizi_server.${SUPABASE_REF}:${encodeURIComponent(password)}@${POOLER_HOST}:6543/postgres`;
  },
  /** Есть ли доступ к базе (для тестов и страниц, которые без базы показывают заглушку) */
  hasDatabase: () => Boolean(optional("DATABASE_URL") || optional("DB_SERVER_PASSWORD")),
};
