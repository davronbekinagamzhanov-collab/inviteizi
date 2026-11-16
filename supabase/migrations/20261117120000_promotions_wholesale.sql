-- Акции (скидка для всех без промокода) и оптовики. Только добавление: старый код работает и без этой миграции.
-- Применяет владелец вручную (Supabase → SQL editor), после проверки на копии.
create table if not exists public.promotions(
 id uuid primary key default gen_random_uuid(),
 name text not null check(char_length(name) between 1 and 80),
 discount_percent integer not null check(discount_percent between 1 and 100),
 starts_at timestamptz not null,
 ends_at timestamptz not null check(ends_at>starts_at),
 -- null — все тадбиры / все форматы
 occasions text[] check(occasions is null or occasions <@ array['nikoh','nahorgi','sunnat','yubiley']::text[]),
 formats text[] check(formats is null or formats <@ array['simple','scroll','animated']::text[]),
 -- Клиентам, пришедшим по ссылке партнёра: по умолчанию цена обычная
 for_partner_clients boolean not null default false,
 stopped_at timestamptz,
 created_by bigint not null,
 created_at timestamptz not null default now()
);
create index if not exists promotions_window_idx on public.promotions(starts_at,ends_at) where stopped_at is null;

create table if not exists public.wholesalers(
 user_id bigint primary key references public.users(id) on delete cascade,
 discount_percent integer not null check(discount_percent between 1 and 90),
 created_by bigint not null,
 created_at timestamptz not null default now(),
 removed_at timestamptz
);

-- Заказ: на какой акции/оптовой скидке зафиксирована цена (в момент перехода к оплате)
alter table public.orders add column if not exists promotion_id uuid references public.promotions(id) on delete restrict;
alter table public.orders add column if not exists pricing jsonb;

do $$declare name text;begin
 foreach name in array array['promotions','wholesalers'] loop
 execute format('alter table public.%I enable row level security',name);
 execute format('revoke all on public.%I from public,anon,authenticated',name);
 execute format('grant select,insert,update on public.%I to inviteizi_server',name);
 execute format('drop policy if exists server_all on public.%I',name);
 execute format('create policy server_all on public.%I for all to inviteizi_server using(true) with check(true)',name);
 end loop;
end$$;

-- Одна активная акция одновременно: пересекающиеся по времени неостановленные акции запрещены
do $$begin
 if not exists(select 1 from pg_constraint where conname='promotions_no_overlap') then
 alter table public.promotions add constraint promotions_no_overlap
 exclude using gist(tstzrange(starts_at,ends_at) with &&) where (stopped_at is null);
 end if;
end$$;
