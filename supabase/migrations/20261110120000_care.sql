-- v2, часть 10: напоминания не купившим, отзывы после тадбира, автоочистка черновиков.
-- Применять только по «да» владельца, после остальных миграций v2, до Merge.

-- Напоминания: сколько уже отправлено (не больше 4) и «🔕 Бошқа юборманг» / бот заблокирован
alter table public.users
  add column if not exists nudge_count smallint not null default 0 check (nudge_count between 0 and 4),
  add column if not exists nudge_off boolean not null default false;

-- Отзыв клиента через день после тадбира: звёзды 1–5 и текст по желанию
create table if not exists public.order_reviews (
  order_id uuid primary key references public.orders (id) on delete cascade,
  user_id bigint not null,
  stars smallint not null check (stars between 1 and 5),
  text text check (char_length(text) <= 600),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.order_reviews enable row level security;
revoke all on public.order_reviews from public, anon, authenticated;
grant select, insert, update on public.order_reviews to inviteizi_server;
drop policy if exists server_all on public.order_reviews;
create policy server_all on public.order_reviews for all to inviteizi_server using (true) with check (true);

-- Автоочистка: неоплаченный заказ «для клиента», который клиент так и не забрал, удаляется вместе с заказом
grant delete on public.client_orders to inviteizi_server;
