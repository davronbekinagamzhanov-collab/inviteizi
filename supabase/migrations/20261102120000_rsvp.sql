-- Ответы гостей «Келаман / Келолмайман». Гость без регистрации: одна строка на устройство и заказ.
-- ip_hash — необратимый хеш только для защиты от спама; сам IP не хранится.
create table public.rsvp_responses (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  visitor_key text not null check (char_length(visitor_key) between 16 and 64),
  name text not null check (char_length(name) between 1 and 60),
  guests integer not null check (guests between 0 and 20),
  attending boolean not null,
  ip_hash text not null check (char_length(ip_hash) <= 64),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, visitor_key)
);
create index rsvp_responses_order_ip_idx on public.rsvp_responses (order_id, ip_hash, created_at);

alter table public.rsvp_responses enable row level security;

revoke all on public.rsvp_responses from public, anon, authenticated;
grant select, insert, update on public.rsvp_responses to inviteizi_server;

create policy server_all on public.rsvp_responses for all to inviteizi_server using (true) with check (true);
