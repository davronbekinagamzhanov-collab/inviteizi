-- v2, часть 5: партнёры. Телефон, Kaspi, график выплат, статус (подтверждение владельцем), предложения менеджера,
-- метки «владельцу сообщили» и «спящий». Применять только по «да» владельца, вместе с 20261106120000_roles.sql и до Merge.
-- Существующие партнёры остаются подтверждёнными (status = 'active', график — раз в неделю).

-- Партнёр по ссылке join_ создаётся без Telegram: аккаунт привязывается, когда он откроет ссылку
alter table public.partners drop constraint if exists partners_check;

alter table public.partners
  add column phone text check (phone ~ '^\+[0-9]{10,15}$'),
  add column kaspi text check (char_length(kaspi) between 10 and 24),
  add column schedule text not null default 'weekly' check (schedule in ('daily', 'weekly', 'monthly')),
  add column status text not null default 'active' check (status in ('pending', 'active', 'rejected')),
  -- Предложение менеджера: ставка и график, ждут ✅ владельца
  add column proposed_rate integer check (proposed_rate between 0 and 1000000),
  add column proposed_schedule text check (proposed_schedule in ('daily', 'weekly', 'monthly')),
  -- null — владельцу ещё не сообщили (ночью сообщение ждёт 08:00)
  add column owner_notified_at timestamptz,
  add column sleep_notified_at timestamptz,
  add check ((proposed_rate is null) = (proposed_schedule is null));

-- Прежние партнёры владельцу уже известны
update public.partners set owner_notified_at = created_at where owner_notified_at is null;
