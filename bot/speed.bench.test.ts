/**
 * Этап 3, п.3 — скорость бота: сколько запросов к базе и сколько миллисекунд уходит на одно обновление Telegram
 * на типовых шагах (/start, каталог, шаг анкеты, оплата). Настоящий PgRepo на изолированной PostgreSQL
 * (scripts/marketing-test-db.mjs, MARKETING_LOCAL_PG=1). Время сети в проде ≈ число запросов × задержка до Supabase.
 * BENCH_OUT=<файл> — записать таблицу. Не читает DATABASE_URL.
 */
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { userInfo } from "node:os";
import { writeFile } from "node:fs/promises";
import postgres from "postgres";
import { PgRepo } from "./repo-pg";
import { designs, PRICES } from "@/templates/registry";
import { uz } from "@/texts/bot-uz";
import { payTexts } from "@/texts/pay";
import { Sim, ADMIN } from "./testing/sim";
import type { Sql } from "@/lib/db";

vi.mock("next/font/local", () => ({ default: () => ({ variable: "fixture-font" }) }));
const native = process.env.MARKETING_LOCAL_PG === "1";
let sql: Sql, repo: PgRepo;
let queries = 0;
const log: string[] = [];
const opts = {
  host: "127.0.0.1",
  port: 55437,
  username: userInfo().username,
  database: "inviteizi_task7",
  ssl: false as const,
  prepare: false,
  onnotice: () => {},
  types: { bigint: { to: 20, from: [20], serialize: String, parse: Number } },
};

beforeAll(async () => {
  if (!native) return;
  vi.stubEnv("ADMIN_IDS", String(ADMIN));
  const root = postgres({ ...opts, max: 1 });
  await root`truncate public.users, public.orders restart identity cascade`;
  for (const d of designs)
    await root`insert into public.templates(id,number,occasion,format,price) values(${d.id},${d.number},${d.occasion},${d.format},${PRICES[d.format]}) on conflict(id) do nothing`;
  await root`insert into public.music(id,title_uz,title_ru,file_url,sort,is_active,occasion) values('inviteizi-sunnat-oilaviy-shodlik','t','t','https://inviteizi.vercel.app/audio/originals/inviteizi-sunnat-oilaviy-shodlik.mp3',1,true,'sunnat') on conflict do nothing`;
  await root.end();
  sql = postgres({
    ...opts,
    max: 10,
    debug: (_c: number, q: string) => {
      queries++;
      if (process.env.BENCH_LOG) log.push(q.replace(/\s+/g, " ").slice(0, 110));
    },
  }) as unknown as Sql;
  repo = new PgRepo(sql);
}, 30_000);
afterAll(async () => {
  if (sql) await sql.end();
  vi.unstubAllEnvs();
});

it.skipIf(!native)("запросы к базе на одно обновление: /start, каталог, шаг анкеты, оплата", async () => {
  const s = new Sim();
  s.deps.repo = repo;
  s.repo = repo as unknown as typeof s.repo;
  const rows: { step: string; queries: number; ms: number }[] = [];
  const measure = async (step: string, f: () => Promise<unknown>) => {
    queries = 0;
    log.length = 0;
    const t0 = performance.now();
    await f();
    if (process.env.BENCH_LOG === step) console.log(log.join("\n"));
    rows.push({ step, queries, ms: Math.round(performance.now() - t0) });
  };
  const id = 770001;
  await measure("/start (новый)", () => s.start(id));
  await measure("выбор языка", () => s.click(id, uz.langUz));
  await measure("/start (знакомый)", () => s.start(id));
  await measure("каталог (Таклифнома яратиш)", () => s.text(id, uz.menu.create));
  await measure("тадбир Никоҳ", () => s.click(id, uz.category.nikoh));
  // дальше путь анкеты как в тестах — до сводки
  const { nikohToReview } = await import("./testing/paths");
  await nikohToReview(s, id + 1);
  await measure("новый клиент: /start → язык → каталог → Никоҳ (4 обновления)", async () => {
    await s.start(id + 2);
    await s.click(id + 2, uz.langUz);
    await s.text(id + 2, uz.menu.create);
    await s.click(id + 2, uz.category.nikoh);
  });
  await measure("сводка → «Тасдиқлаш» (создание заказа)", () => s.click(id + 1, uz.review.confirm));
  await measure("«💳 Тўлаш»", () => s.click(id + 1, /^💳 Тўлаш/));
  await measure("«✅ Ҳаммаси тўғри»", () => s.click(id + 1, uz.pay.confirmYes));
  await measure("«✅ Тўладим»", () => s.click(id + 1, payTexts.uz.paid));
  await measure("имя из Kaspi", () => s.text(id + 1, "Давронбек И."));
  console.table(rows);
  if (process.env.BENCH_OUT) await writeFile(process.env.BENCH_OUT, JSON.stringify(rows, null, 2));
  expect(rows.length).toBeGreaterThan(5);
}, 120_000);
