-- PRE-DEPLOY (только по «да» владельца): три дизайна «Пятно» (никоҳ, Анимацияли, 8 000 ₸). Без UPDATE/DELETE, заказы не трогаем.
-- Номера 139..141 зарезервированы в templates/registry.ts. Если номер или id уже занят другим — транзакция откатывается целиком.
-- Порядок в каталоге задаёт код (CATALOG_ORDER: места 5–7 в никоҳ); sort здесь — только после батча 3.
begin;
set local lock_timeout = '5s';
lock table public.templates in share row exclusive mode;
do $$ begin
  if exists (
    with proposed(id, number, occasion, format, with_photo, price, cover_url, is_active, sort) as (values
    ('suvbuyoq-tuman', 139, 'nikoh', 'animated', false, 8000, '/covers/suvbuyoq-tuman.webp', true, 47),
    ('suvbuyoq-zumrad', 140, 'nikoh', 'animated', false, 8000, '/covers/suvbuyoq-zumrad.webp', true, 48),
    ('suvbuyoq-upa', 141, 'nikoh', 'animated', false, 8000, '/covers/suvbuyoq-upa.webp', true, 49))
    select 1 from public.templates t join proposed p on t.id = p.id or t.number = p.number
    where t.id <> p.id or t.number <> p.number or t.occasion <> p.occasion or t.format <> p.format or t.price <> p.price
  ) then raise exception 'Patno identity/number conflict: transaction aborted; review reservations before release'; end if;
end $$;
insert into public.templates(id, number, occasion, format, with_photo, price, cover_url, is_active, sort) values
    ('suvbuyoq-tuman', 139, 'nikoh', 'animated', false, 8000, '/covers/suvbuyoq-tuman.webp', true, 47),
    ('suvbuyoq-zumrad', 140, 'nikoh', 'animated', false, 8000, '/covers/suvbuyoq-zumrad.webp', true, 48),
    ('suvbuyoq-upa', 141, 'nikoh', 'animated', false, 8000, '/covers/suvbuyoq-upa.webp', true, 49)
on conflict(id) do nothing;
commit;
