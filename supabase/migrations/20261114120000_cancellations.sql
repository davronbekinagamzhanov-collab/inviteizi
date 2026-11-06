-- fix/app-polish-2, п.7: клиент сам отменяет незаконченный заказ («Бекор қилиш»).
-- Персональные данные удаляются (заказ, фото, своя песня); здесь остаётся только обезличенная запись:
-- на каком шаге ушёл, какой тадбир/формат/дизайн. Ни user_id, ни имён. Применять по «да» владельца, до Merge.
create table if not exists public.order_cancellations (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  step smallint not null check (step between 1 and 5),
  occasion text,
  format text,
  template_id text
);
create index if not exists order_cancellations_date on public.order_cancellations(created_at);
alter table public.order_cancellations enable row level security;
revoke all on public.order_cancellations from anon, authenticated;
grant select, insert on public.order_cancellations to inviteizi_server;
grant usage on sequence public.order_cancellations_id_seq to inviteizi_server;
drop policy if exists server_all on public.order_cancellations;
create policy server_all on public.order_cancellations for all to inviteizi_server using (true) with check (true);
