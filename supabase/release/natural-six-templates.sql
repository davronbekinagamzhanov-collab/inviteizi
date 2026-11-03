-- PRE-DEPLOY (только по «да» владельца): шесть дизайнов «Гулли рамка» (117–122) в каталоге. Без UPDATE/DELETE, заказы не трогаем.
-- Номера 117..122 зарезервированы в templates/registry.ts. Если номер или id уже занят другим — транзакция откатывается целиком.
-- Применять ПОСЛЕ деплоя кода этой ветки (иначе бот покажет дизайн, которого ещё нет на сайте).
begin;
set local lock_timeout = '5s';
lock table public.templates in share row exclusive mode;
do $$ begin
  if exists (
    with proposed(id, number, occasion, format, with_photo, price, cover_url, is_active, sort) as (values
    ('gul-doira', 117, 'nikoh', 'animated', false, 8000, '/covers/gul-doira.webp', true, 25),
    ('girih-barg', 118, 'nikoh', 'animated', false, 8000, '/covers/girih-barg.webp', true, 26),
    ('muhrli-maktub', 119, 'nikoh', 'animated', false, 8000, '/covers/muhrli-maktub.webp', true, 27),
    ('tonggi-piyola', 120, 'nahorgi', 'animated', false, 8000, '/covers/tonggi-piyola.webp', true, 28),
    ('lola-bodom', 121, 'sunnat', 'animated', false, 8000, '/covers/lola-bodom.webp', true, 29),
    ('bordo-guldasta', 122, 'yubiley', 'simple', false, 5000, '/covers/bordo-guldasta.webp', true, 30))
    select 1 from public.templates t join proposed p on t.id = p.id or t.number = p.number
    where t.id <> p.id or t.number <> p.number or t.occasion <> p.occasion or t.format <> p.format or t.price <> p.price
  ) then raise exception 'Floral designs identity/number conflict: transaction aborted; review reservations before release'; end if;
end $$;
insert into public.templates(id, number, occasion, format, with_photo, price, cover_url, is_active, sort) values
    ('gul-doira', 117, 'nikoh', 'animated', false, 8000, '/covers/gul-doira.webp', true, 25),
    ('girih-barg', 118, 'nikoh', 'animated', false, 8000, '/covers/girih-barg.webp', true, 26),
    ('muhrli-maktub', 119, 'nikoh', 'animated', false, 8000, '/covers/muhrli-maktub.webp', true, 27),
    ('tonggi-piyola', 120, 'nahorgi', 'animated', false, 8000, '/covers/tonggi-piyola.webp', true, 28),
    ('lola-bodom', 121, 'sunnat', 'animated', false, 8000, '/covers/lola-bodom.webp', true, 29),
    ('bordo-guldasta', 122, 'yubiley', 'simple', false, 5000, '/covers/bordo-guldasta.webp', true, 30)
on conflict(id) do nothing;
select number, id, occasion, format, price, is_active from public.templates where number between 117 and 122 order by number;
commit;
