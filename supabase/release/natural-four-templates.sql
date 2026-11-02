-- PRE-DEPLOY (только по «да» владельца): четыре натуральных пилота в каталоге. Без UPDATE/DELETE, заказы не трогаем.
-- Номера 113..116 зарезервированы в templates/registry.ts. Если номер или id уже занят другим — транзакция откатывается целиком.
begin;
set local lock_timeout = '5s';
lock table public.templates in share row exclusive mode;
do $$ begin
  if exists (
    with proposed(id, number, occasion, format, with_photo, price, cover_url, is_active, sort) as (values
    ('muhr', 113, 'nikoh', 'animated', false, 8000, '/covers/muhr.webp', true, 21),
    ('ipak', 114, 'nikoh', 'animated', false, 8000, '/covers/ipak.webp', true, 22),
    ('bog', 115, 'sunnat', 'scroll', false, 6000, '/covers/bog.webp', true, 23),
    ('tong-dasturxon', 116, 'nahorgi', 'scroll', false, 6000, '/covers/tong-dasturxon.webp', true, 24))
    select 1 from public.templates t join proposed p on t.id = p.id or t.number = p.number
    where t.id <> p.id or t.number <> p.number or t.occasion <> p.occasion or t.format <> p.format or t.price <> p.price
  ) then raise exception 'Natural pilots identity/number conflict: transaction aborted; review reservations before release'; end if;
end $$;
insert into public.templates(id, number, occasion, format, with_photo, price, cover_url, is_active, sort) values
    ('muhr', 113, 'nikoh', 'animated', false, 8000, '/covers/muhr.webp', true, 21),
    ('ipak', 114, 'nikoh', 'animated', false, 8000, '/covers/ipak.webp', true, 22),
    ('bog', 115, 'sunnat', 'scroll', false, 6000, '/covers/bog.webp', true, 23),
    ('tong-dasturxon', 116, 'nahorgi', 'scroll', false, 6000, '/covers/tong-dasturxon.webp', true, 24)
on conflict(id) do nothing;
commit;
