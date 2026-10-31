-- Журнал ошибок бота. Без токенов, телефонов, Telegram ID и имён клиентов: код очищает текст перед записью.
-- Сервер может только добавлять строки; читать журнал может владелец через SQL Editor.
create table public.bot_errors (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  step text check (char_length(step) <= 40),
  update_kind text not null check (char_length(update_kind) <= 40),
  error_name text not null check (char_length(error_name) <= 80),
  error_code text check (char_length(error_code) <= 40),
  message text not null check (char_length(message) <= 500),
  stack text check (char_length(stack) <= 2000),
  outcome text not null check (outcome in ('retry', 'ack'))
);

create index bot_errors_created_at_idx on public.bot_errors (created_at desc);

alter table public.bot_errors enable row level security;
revoke all on public.bot_errors from public, anon, authenticated;
grant insert on public.bot_errors to inviteizi_server;
create policy server_insert on public.bot_errors for insert to inviteizi_server with check (true);
