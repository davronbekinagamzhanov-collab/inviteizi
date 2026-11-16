-- Рассылка об акции (17.11.2026). Только добавление: без этой миграции рассылка выключена, остальное работает.
-- Применяет владелец вручную (Supabase → SQL editor), после 20261117120000_promotions_wholesale.sql.

-- Пользователь нажал «🔕 Хабарларни ўчириш» или заблокировал бота (ответ Telegram 403) — рассылок ему больше нет
alter table public.users add column if not exists broadcast_off boolean not null default false;
alter table public.users add column if not exists bot_blocked_at timestamptz;

-- Акция: рассылать ли клиентам и напоминание «Охирги кун!» за 24 ч; когда они ушли в очередь (один раз)
alter table public.promotions add column if not exists broadcast boolean not null default true;
alter table public.promotions add column if not exists remind boolean not null default true;
alter table public.promotions add column if not exists broadcast_at timestamptz;
alter table public.promotions add column if not exists remind_at timestamptz;
create index if not exists promotions_broadcast_at_idx on public.promotions(broadcast_at) where broadcast_at is not null;

-- Очередь — существующая public.bot_notices (ключ promo:<акция>:<пользователь>:<start|last>, lease_token/lease_until)
create index if not exists bot_notices_promo_due_idx on public.bot_notices(due_at) where sent_at is null and dead_at is null and key like 'promo:%';
