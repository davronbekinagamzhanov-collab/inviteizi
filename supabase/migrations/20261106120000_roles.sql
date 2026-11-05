-- v2, часть 4: роли. Менеджеры (назначает владелец одноразовой ссылкой), «кто привёл» партнёра,
-- заказы «для клиента» (сотрудник собрал — клиент забирает по ссылке и платит сам).
-- Применять только по «да» владельца и до Merge. Существующие строки не меняются.

create table public.managers (
  telegram_id bigint primary key,
  code text not null unique check (code ~ '^[a-z0-9]{4,32}$'),
  username text check (char_length(username) <= 32),
  first_name text check (char_length(first_name) <= 64),
  invited_by bigint not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  removed_at timestamptz
);

-- Одноразовые ссылки: хранится только sha256 токена, сам токен знает лишь тот, кому его отправили
create table public.staff_invites (
  token_hash text primary key check (token_hash ~ '^[0-9a-f]{64}$'),
  kind text not null check (kind in ('manager', 'partner')),
  created_by bigint not null,
  partner_id bigint references public.partners (id) on delete restrict,
  expires_at timestamptz not null,
  used_by bigint,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  check ((used_by is null) = (used_at is null))
);

-- Партнёр «в сети» менеджера; null — партнёр владельца
alter table public.partners add column managed_by bigint;
create index partners_managed_by_idx on public.partners (managed_by);

-- Заказ, собранный сотрудником для клиента. ref_source — кому засчитать продажу (m_<код менеджера>; null — напрямую)
create table public.client_orders (
  order_id uuid primary key references public.orders (id) on delete restrict,
  created_by bigint not null,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  ref_source text check (char_length(ref_source) <= 64),
  claimed_by bigint,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  check ((claimed_by is null) = (claimed_at is null))
);

alter table public.managers enable row level security;
alter table public.staff_invites enable row level security;
alter table public.client_orders enable row level security;

revoke all on public.managers, public.staff_invites, public.client_orders from public, anon, authenticated;
grant select, insert, update on public.managers, public.staff_invites, public.client_orders to inviteizi_server;

create policy server_all on public.managers for all to inviteizi_server using (true) with check (true);
create policy server_all on public.staff_invites for all to inviteizi_server using (true) with check (true);
create policy server_all on public.client_orders for all to inviteizi_server using (true) with check (true);
