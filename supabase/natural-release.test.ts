import { describe, it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import original from "@/docs/reviews/final/original-catalog.json";
import { ACCEPTED, everAccepted, getDesign } from "@/templates/registry";
import { ON_SALE_IDS } from "@/templates/catalog";
import { templateRows } from "@/templates/catalog-rows";
const file = (name: string) => readFile(name, "utf8");
async function fixture() {
  const pg = new PGlite();
  await pg.exec("create role anon; create role authenticated; create role inviteizi_server;");
  for (const name of [
    "20261023180530_schema.sql",
    "20261024031409_slug_reserved_dev.sql",
    "20261024120000_slug_history.sql",
    "20261024150000_music_occasion.sql",
    "20261025120000_analytics_favorites.sql",
    "20261026120000_scroll_format.sql",
  ])
    await pg.exec(await file("supabase/migrations/" + name));
  for (const d of original)
    await pg.query(
      "insert into public.templates(id,number,occasion,format,price,is_active) values($1,$2,$3,$4,$5,$6)",
      [d.id, d.number, d.occasion, d.format, d.price, d.is_active],
    );
  return pg;
}
const PILOTS = ["muhr", "ipak", "bog", "tong-dasturxon"];

describe("натуральные пилоты: SQL только по «да» владельца", () => {
  it("добавляет четыре строки каталога дважды без изменений старых строк", async () => {
    const pg = await fixture();
    try {
      const before = (await pg.query("select * from public.templates order by id")).rows;
      const sql = await file("supabase/release/natural-four-templates.sql");
      await pg.exec(sql);
      await pg.exec(sql);
      expect(
        (
          await pg.query(
            `select * from public.templates where id not in (${PILOTS.map((i) => `'${i}'`).join(",")}) order by id`,
          )
        ).rows,
      ).toEqual(before);
      const rows = (
        await pg.query<{ id: string; number: number; occasion: string; format: string }>(
          `select id,number,occasion,format from public.templates where id in (${PILOTS.map((i) => `'${i}'`).join(",")}) order by number`,
        )
      ).rows;
      // строки совпадают с реестром кода (номер, тадбир, формат)
      expect(rows).toEqual(
        PILOTS.map((id) => {
          const d = getDesign(id)!;
          return { id, number: d.number, occasion: d.occasion, format: d.format };
        }),
      );
    } finally {
      await pg.close();
    }
  }, 20000);

  it("откатывается целиком, если номер уже занят", async () => {
    const pg = await fixture();
    try {
      await pg.exec(
        "insert into public.templates(id,number,occasion,format,price) values('external-113',113,'nikoh','animated',8000)",
      );
      await expect(pg.exec(await file("supabase/release/natural-four-templates.sql"))).rejects.toThrow(
        /identity\/number conflict/,
      );
      await pg.exec("rollback");
      expect((await pg.query("select id from public.templates where id in ('muhr','ipak')")).rows).toHaveLength(0);
    } finally {
      await pg.close();
    }
  }, 20000);

  it("миграция фото: колонка 1–3 ссылки, бакет photos публичный, повторный запуск безопасен", async () => {
    const pg = await fixture();
    try {
      await pg.exec(
        "create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);",
      );
      const sql = await file("supabase/migrations/20261105120000_client_photos.sql");
      await pg.exec(sql);
      await pg.exec(sql);
      await pg.exec(
        "insert into public.users(id) values(991);insert into public.orders(user_id,occasion,format,template_id,status,hosts,slug,amount) values(991,'nikoh','animated','kabutar-salom','draft','Оила','with-photos',0)",
      );
      await pg.exec(
        "update public.orders set photos=array['https://x/1.webp','https://x/2.webp'] where slug='with-photos'",
      );
      await pg.exec("update public.orders set photos=null where slug='with-photos'");
      await expect(
        pg.exec("update public.orders set photos=array['a','b','c','d'] where slug='with-photos'"),
      ).rejects.toThrow(/orders_photos_check/);
      await expect(pg.exec("update public.orders set photos='{}' where slug='with-photos'")).rejects.toThrow(
        /orders_photos_check/,
      );
      expect((await pg.query("select id,public,file_size_limit,allowed_mime_types from storage.buckets")).rows).toEqual(
        [{ id: "photos", public: true, file_size_limit: 5242880, allowed_mime_types: ["image/webp"] }],
      );
    } finally {
      await pg.close();
    }
  }, 20000);
});

describe("батч 3 (123–138): SQL только по «да» владельца", () => {
  const BATCH3 = everAccepted().filter((d) => d.number >= 123 && d.number <= 138);
  const PRICE = { animated: 8000, scroll: 6000, simple: 5000 } as const;
  it("16 строк, совпадают с реестром (номер, тадбир, формат, цена, фото, is_active = в каталоге), повтор без изменений", async () => {
    const pg = await fixture();
    try {
      expect(BATCH3).toHaveLength(16);
      const before = (await pg.query("select * from public.templates order by id")).rows;
      const sql = await file("supabase/release/natural-batch3-templates.sql");
      await pg.exec(sql);
      await pg.exec(sql);
      expect(
        (await pg.query("select * from public.templates where number not between 123 and 138 order by id")).rows,
      ).toEqual(before);
      const rows = (
        await pg.query(
          "select id,number,occasion,format,price,with_photo,cover_url,is_active from public.templates where number between 123 and 138 order by number",
        )
      ).rows;
      expect(rows).toEqual(
        [...BATCH3]
          .sort((a, b) => a.number - b.number)
          .map((d) => ({
            id: d.id,
            number: d.number,
            occasion: d.occasion,
            format: d.format,
            price: PRICE[d.format],
            with_photo: d.withPhoto,
            cover_url: `/covers/${d.id}.webp`,
            is_active: ACCEPTED.has(d.id) || ["shohona-baxmal", "ganch-peshtoq", "visol-hikoya"].includes(d.id),
          })),
      );
      expect((rows as { number: number; is_active: boolean }[]).find((r) => r.number === 131)?.is_active).toBe(false);
    } finally {
      await pg.close();
    }
  }, 20000);

  it("откатывается целиком, если номер уже занят", async () => {
    const pg = await fixture();
    try {
      await pg.exec(
        "insert into public.templates(id,number,occasion,format,price) values('external-130',130,'nikoh','scroll',6000)",
      );
      await expect(pg.exec(await file("supabase/release/natural-batch3-templates.sql"))).rejects.toThrow(
        /identity\/number conflict/,
      );
      await pg.exec("rollback");
      expect((await pg.query("select id from public.templates where number between 123 and 138")).rows).toEqual([
        { id: "external-130" },
      ]);
    } finally {
      await pg.close();
    }
  }, 20000);
});

describe("«Пятно» (139–141): SQL только по «да» владельца", () => {
  const PATNO = everAccepted().filter((d) => d.number >= 139 && d.number <= 141);
  it("3 строки никоҳ 8 000 ₸ совпадают с реестром, повтор без изменений, старые строки не тронуты", async () => {
    const pg = await fixture();
    try {
      expect(PATNO.map((d) => d.id)).toEqual(["suvbuyoq-tuman", "suvbuyoq-zumrad", "suvbuyoq-upa"]);
      const before = (await pg.query("select * from public.templates order by id")).rows;
      const sql = await file("supabase/release/patno-three-templates.sql");
      await pg.exec(sql);
      await pg.exec(sql);
      expect(
        (await pg.query("select * from public.templates where number not between 139 and 141 order by id")).rows,
      ).toEqual(before);
      const rows = (
        await pg.query(
          "select id,number,occasion,format,price,with_photo,cover_url,is_active from public.templates where number between 139 and 141 order by number",
        )
      ).rows;
      expect(rows).toEqual(
        PATNO.map((d) => ({
          id: d.id,
          number: d.number,
          occasion: "nikoh",
          format: "animated",
          price: 8000,
          with_photo: false,
          cover_url: `/covers/${d.id}.webp`,
          is_active: true,
        })),
      );
    } finally {
      await pg.close();
    }
  }, 20000);
  it("откатывается целиком, если номер уже занят", async () => {
    const pg = await fixture();
    try {
      await pg.exec(
        "insert into public.templates(id,number,occasion,format,price) values('external-140',140,'nikoh','animated',8000)",
      );
      await expect(pg.exec(await file("supabase/release/patno-three-templates.sql"))).rejects.toThrow(
        /identity\/number conflict/,
      );
      await pg.exec("rollback");
      expect((await pg.query("select id from public.templates where number between 139 and 141")).rows).toEqual([
        { id: "external-140" },
      ]);
    } finally {
      await pg.close();
    }
  }, 20000);
});

const SEED_UPSERT = `insert into public.templates(id,number,occasion,format,with_photo,price,cover_url,is_active,sort)
 select * from json_populate_recordset(null::public.templates,$1::json)
 on conflict (id) do update set number=excluded.number,occasion=excluded.occasion,format=excluded.format,
  with_photo=excluded.with_photo,price=excluded.price,cover_url=excluded.cover_url,is_active=excluded.is_active,sort=excluded.sort`;

describe("весь выпуск по порядку: natural-four → natural-six → batch3 → hide-old-designs → «Пятно» (v2) → db:seed-templates", () => {
  it("исторический SQL: 131 и 48 старых скрыты, номера и цены новых строк совпадают с реестром", async () => {
    const pg = await fixture();
    try {
      for (const name of [
        "natural-four-templates",
        "natural-six-templates",
        "natural-batch3-templates",
        "hide-old-designs",
        "patno-three-templates",
      ])
        await pg.exec(await file(`supabase/release/${name}.sql`));
      const rows = (
        await pg.query<{ id: string; number: number; occasion: string; price: number; format: string }>(
          "select id,number,occasion,format,price from public.templates",
        )
      ).rows;
      const byId = new Map(rows.map((r) => [r.id, r]));
      // каждый дизайн, на который может ссылаться заказ, есть в базе с тем же номером и тадбиром
      for (const d of everAccepted().filter((d) => d.number >= 113 || ACCEPTED.has(d.id))) {
        const r = byId.get(d.id);
        expect(r, d.id).toBeDefined();
        expect({ number: r!.number, occasion: r!.occasion }, d.id).toEqual({ number: d.number, occasion: d.occasion });
      }
      const PRICE = { animated: 8000, scroll: 6000, simple: 5000 } as const;
      for (const r of rows.filter((r) => r.number >= 113))
        expect(r.price, r.id).toBe(PRICE[r.format as keyof typeof PRICE]);
      expect(byId.get("islimi-varaq")).toBeDefined();
      // повторный прогон всех файлов ничего не меняет
      const before = (await pg.query("select * from public.templates order by id")).rows;
      for (const name of [
        "natural-four-templates",
        "natural-six-templates",
        "natural-batch3-templates",
        "hide-old-designs",
      ])
        await pg.exec(await file(`supabase/release/${name}.sql`));
      expect((await pg.query("select * from public.templates order by id")).rows).toEqual(before);
    } finally {
      await pg.close();
    }
  }, 30000);

  it("после db:seed-templates база = код: в продаже ровно витрина templates/catalog.ts, формат/цена/порядок из реестра; повтор без изменений", async () => {
    const pg = await fixture();
    try {
      for (const name of [
        "natural-four-templates",
        "natural-six-templates",
        "natural-batch3-templates",
        "hide-old-designs",
        "patno-three-templates",
      ])
        await pg.exec(await file(`supabase/release/${name}.sql`));
      const ordersBefore = (await pg.query("select count(*)::int as n from public.orders")).rows;
      const seed = templateRows();
      await pg.query(SEED_UPSERT, [JSON.stringify(seed)]);
      const rows = (
        await pg.query<{ id: string; is_active: boolean }>(
          "select id,number,occasion,format,with_photo,price,cover_url,is_active,sort from public.templates order by id",
        )
      ).rows;
      const byId = new Map(rows.map((r) => [r.id, r]));
      for (const r of seed) expect(byId.get(r.id), r.id).toEqual(r);
      expect(
        rows
          .filter((r) => r.is_active)
          .map((r) => r.id)
          .sort(),
      ).toEqual([...ON_SALE_IDS].sort());
      expect((byId.get("islimi-varaq") as { is_active: boolean } | undefined)?.is_active).toBe(false);
      await pg.query(SEED_UPSERT, [JSON.stringify(seed)]);
      expect(
        (
          await pg.query(
            "select id,number,occasion,format,with_photo,price,cover_url,is_active,sort from public.templates order by id",
          )
        ).rows,
      ).toEqual(rows);
      expect((await pg.query("select count(*)::int as n from public.orders")).rows).toEqual(ordersBefore);
    } finally {
      await pg.close();
    }
  }, 30000);
});
