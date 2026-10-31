-- Партнёры панели владельца. Клиент ничего лишнего не платит: начисления только учёт для выплат партнёрам.
-- partner_earnings: одна строка на оплаченный заказ, сумма по ставке на момент оплаты.
create table public.partners (
  id bigint generated always as identity primary key,
  code text not null unique check (code ~ '^[a-z0-9]{4,32}$'),
  name text not null check (char_length(name) between 1 and 80),
  telegram_id bigint,
  username text check (char_length(username) <= 32),
  rate integer not null default 1000 check (rate between 0 and 1000000),
  created_at timestamptz not null default now(),
  check (telegram_id is not null or username is not null)
);

create table public.partner_earnings (
  order_id uuid primary key references public.orders (id) on delete restrict,
  partner_id bigint not null references public.partners (id) on delete restrict,
  amount integer not null check (amount >= 0),
  delivered boolean not null default false,
  created_at timestamptz not null default now()
);
create index partner_earnings_partner_idx on public.partner_earnings (partner_id);

create table public.partner_payouts (
  id bigint generated always as identity primary key,
  partner_id bigint not null references public.partners (id) on delete restrict,
  amount integer not null check (amount > 0),
  created_by bigint not null,
  created_at timestamptz not null default now()
);
create index partner_payouts_partner_idx on public.partner_payouts (partner_id);

alter table public.partners enable row level security;
alter table public.partner_earnings enable row level security;
alter table public.partner_payouts enable row level security;

revoke all on public.partners, public.partner_earnings, public.partner_payouts from public, anon, authenticated;
grant select, insert, update on public.partners to inviteizi_server;
grant select, insert, update on public.partner_earnings to inviteizi_server;
grant select, insert on public.partner_payouts to inviteizi_server;

create policy server_all on public.partners for all to inviteizi_server using (true) with check (true);
create policy server_all on public.partner_earnings for all to inviteizi_server using (true) with check (true);
create policy server_all on public.partner_payouts for all to inviteizi_server using (true) with check (true);
