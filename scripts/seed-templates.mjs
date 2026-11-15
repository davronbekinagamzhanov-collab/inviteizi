// Переносит дизайны из templates/registry.ts в таблицу templates (идемпотентно: upsert по id).
// Дизайны, которых больше нет в реестре, помечаются is_active = false (заказы на них не ломаются).
// В продаже (is_active) — ровно витрина templates/catalog.ts. Сначала проверить: --dry-run.
// Запуск: node --env-file=.env.local scripts/seed-templates.mjs
// Сначала применить 20261026120000_scroll_format.sql. Upsert меняет только templates,
// не пересчитывает orders.format/amount; прежние оплаченные ссылки сохраняются.
import "./ts-hooks.mjs";

const { templateRows } = await import("../templates/catalog-rows.ts");
const { db, closeDb } = await import("../lib/db.ts");

// is_active = в витрине templates/catalog.ts, price = цена формата, sort = порядок каталога
const rows = templateRows();

// Review the exact registry-derived rows without credentials or a database connection.
if (process.argv.includes("--dry-run")) {
  console.log(JSON.stringify(rows));
  process.exit(0);
}
const sql = db();
try {
  await sql.begin(async (tx) => {
    await tx`
      insert into public.templates ${tx(rows, "id", "number", "occasion", "format", "with_photo", "price", "cover_url", "is_active", "sort")}
      on conflict (id) do update set
        number = excluded.number,
        occasion = excluded.occasion,
        format = excluded.format,
        with_photo = excluded.with_photo,
        price = excluded.price,
        cover_url = excluded.cover_url,
        is_active = excluded.is_active,
        sort = excluded.sort`;
    const off = await tx`
      update public.templates set is_active = false
      where is_active and id <> all(${rows.map((r) => r.id)}) returning id`;
    if (off.length) console.log("Выключены (нет в реестре):", off.map((r) => r.id).join(", "));
  });
  const [{ n }] = await sql`select count(*) as n from public.templates where is_active`;
  console.log(`Дизайнов в реестре: ${rows.length}, активных в базе: ${n}`);
} finally {
  await closeDb();
}
