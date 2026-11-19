-- «Сақлаб олиш» (19.11.2026): готовые файлы приглашения — фото, PDF для печати, видео.
-- Одна строка на заказ и вид файла: состояние (очередь видео), попытки, адрес файла в Vercel Blob,
-- file_id Telegram (повторная отправка без генерации). Удаляется вместе с заказом; файлы Blob —
-- автоочисткой через 30 дней после тадбира. Повторный запуск безопасен.
create table if not exists public.order_renders (
  order_id uuid not null references public.orders (id) on delete cascade,
  kind text not null check (kind in ('story', 'feed', 'a5', 'a6', 'video')),
  status text not null default 'queued' check (status in ('queued', 'running', 'done', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  url text,
  telegram_file_id text,
  error text check (error is null or length(error) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (order_id, kind)
);

create index if not exists order_renders_pending_idx
  on public.order_renders (updated_at) where status in ('queued', 'running');

alter table public.order_renders enable row level security;
revoke all on public.order_renders from public, anon, authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'inviteizi_server') then
    grant select, insert, update, delete on public.order_renders to inviteizi_server;
    drop policy if exists server_all on public.order_renders;
    create policy server_all on public.order_renders for all to inviteizi_server using (true) with check (true);
  end if;
end $$;
