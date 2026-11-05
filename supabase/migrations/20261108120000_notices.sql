-- v2, часть 7: уведомления и выплаты менеджерам.
-- bot_notices — исходящие сообщения бота с ключом: отчёт 20:00, «выплаты сегодня», оплата менеджеру и т.д.
--   Ключ уникален — одно и то же сообщение не уйдёт дважды (повтор cron, двойное нажатие).
--   Ночью (22:00–08:00 Алматы) сообщение ждёт: due_at — 08:00; cron отправляет после.
-- manager_payouts — выплата менеджеру за месяц (500 ₸ × оплаты сети + бонус), одна строка на менеджера и месяц.
-- Применять только по «да» владельца, после 20261106120000_roles.sql и 20261107120000_partners_v2.sql, до Merge.

create table if not exists public.bot_notices (
  key text primary key check (char_length(key) between 1 and 120),
  chat_id bigint not null,
  body jsonb not null,
  due_at timestamptz not null,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists bot_notices_due_idx on public.bot_notices (due_at) where sent_at is null;

create table if not exists public.manager_payouts (
  manager_id bigint not null,
  month text not null check (month ~ '^[0-9]{4}-[0-9]{2}$'),
  amount integer not null check (amount > 0),
  orders integer not null check (orders >= 0),
  created_by bigint not null,
  created_at timestamptz not null default now(),
  primary key (manager_id, month)
);

alter table public.bot_notices enable row level security;
alter table public.manager_payouts enable row level security;

revoke all on public.bot_notices, public.manager_payouts from public, anon, authenticated;
grant select, insert, update on public.bot_notices to inviteizi_server;
grant select, insert on public.manager_payouts to inviteizi_server;

drop policy if exists server_all on public.bot_notices;
drop policy if exists server_all on public.manager_payouts;
create policy server_all on public.bot_notices for all to inviteizi_server using (true) with check (true);
create policy server_all on public.manager_payouts for all to inviteizi_server using (true) with check (true);
