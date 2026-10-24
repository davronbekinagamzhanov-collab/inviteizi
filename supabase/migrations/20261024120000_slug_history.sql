-- Адрес пригласительного никогда не переиспользуется: гости со старой ссылкой не должны увидеть чужой тўй.
-- slug_history хранит КАЖДЫЙ адрес, который когда-либо был у заказа (без внешнего ключа:
-- адрес остаётся занятым и после удаления заказа). Старый адрес ведёт на текущий (resolveSlug).

create table if not exists public.slug_history (
  slug        text primary key,
  order_id    uuid not null,
  created_at  timestamptz not null default now()
);
create index if not exists slug_history_order_id_idx on public.slug_history (order_id);

alter table public.slug_history enable row level security;
-- сервер только читает и добавляет; удалять/менять историю нельзя никому, кроме владельца базы
grant select, insert on public.slug_history to inviteizi_server;
create policy server_read on public.slug_history for select to inviteizi_server using (true);
create policy server_insert on public.slug_history for insert to inviteizi_server with check (true);

-- уже существующие адреса
insert into public.slug_history (slug, order_id)
select slug, id from public.orders
on conflict (slug) do nothing;

-- Перед вставкой/сменой адреса: чужой (текущий или прежний) адрес — ошибка уникальности
-- (тот же код 23505 и имя ограничения со словом slug, что ловит bot/repo-pg.ts), свой — записывается в историю.
create or replace function public.orders_slug_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.slug_history h where h.slug = new.slug and h.order_id <> new.id) then
    raise exception using
      errcode = '23505',
      constraint = 'orders_slug_key',
      message = 'адрес уже использовался другим заказом: ' || new.slug;
  end if;
  insert into public.slug_history (slug, order_id) values (new.slug, new.id)
  on conflict (slug) do nothing;
  return new;
end;
$$;
revoke all on function public.orders_slug_history() from public, anon, authenticated;

drop trigger if exists orders_slug_history on public.orders;
create trigger orders_slug_history
  before insert or update of slug on public.orders
  for each row execute function public.orders_slug_history();

-- Запретные адреса = lib/slug.ts RESERVED_SLUGS (тест lib/slug.test.ts сверяет списки)
alter table public.orders drop constraint if exists orders_slug_check;
alter table public.orders add constraint orders_slug_check
  check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60
         and slug not in ('demo', 'catalog', 'api', 'admin', 'art', 'covers', 'music', 'pilots', 'previews', 'dev',
                          'namuna', 'bot', 'cron', 'webhook', 'static', 'assets', 'public', 'robots', 'sitemap', 'favicon',
                          'help', 'about', 'privacy', 'terms', 'login', 'www'));
