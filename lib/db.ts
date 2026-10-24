/**
 * Postgres (Supabase) для сервера: одна пара соединений на процесс.
 * Пулер в transaction mode → prepare: false. На Vercel (serverless) — max: 1.
 * Только для серверного кода (страницы, route handlers, бот). В браузер не попадает.
 */
import postgres from "postgres";
import { env } from "./env";

export type Sql = postgres.Sql<{ bigint: number }>;
/** Клиент или транзакция (sql.begin) — для функций, которые работают и там, и там */
export type Tx = Sql | postgres.TransactionSql<{ bigint: number }>;

function create(): Sql {
  return postgres(env.databaseUrl(), {
    prepare: false,
    ssl: "require",
    max: process.env.VERCEL ? 1 : 4,
    idle_timeout: 20,
    connect_timeout: 30, // из Казахстана до Сеула первое соединение бывает 5–10 с
    // bigint (Telegram id, count(*), sum()) → number: id Telegram < 2^53, суммы маленькие
    types: {
      bigint: {
        to: 20,
        from: [20],
        serialize: (x: number) => String(x),
        parse: (x: string) => Number(x),
      },
    },
    // необязательные поля (undefined) пишутся как null
    transform: { undefined: null },
    onnotice: () => {},
  });
}

const g = globalThis as unknown as { __inviteiziSql?: Sql };

/** Клиент создаётся при первом обращении (сборка без .env не падает) */
export function db(): Sql {
  if (!g.__inviteiziSql) g.__inviteiziSql = create();
  return g.__inviteiziSql;
}

/** Закрыть соединения (скрипты и тесты) */
export async function closeDb() {
  const sql = g.__inviteiziSql;
  g.__inviteiziSql = undefined;
  if (sql) await sql.end({ timeout: 5 });
}
