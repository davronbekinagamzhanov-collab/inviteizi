-- PRE-DEPLOY (только по «да» владельца): батч 3 — 16 дизайнов (123–138) в каталоге. Без UPDATE/DELETE, заказы не трогаем.
-- Номера 123..138 зарезервированы в templates/registry.ts. Если номер или id уже занят другим — транзакция откатывается целиком.
-- Применять ПОСЛЕ деплоя кода этой ветки (иначе бот покажет дизайн, которого ещё нет на сайте).
-- Цена по формату: Анимацияли 8000, Варақланадиган 6000, Оддий 5000. with_photo = true — у дизайнов с фото клиента.
begin;
set local lock_timeout = '5s';
lock table public.templates in share row exclusive mode;
do $$ begin
  if exists (
    with proposed(id, number, occasion, format, with_photo, price, cover_url, is_active, sort) as (values
    ('choy-maktub', 123, 'nahorgi', 'simple', false, 5000, '/covers/choy-maktub.webp', true, 31),
    ('non-albom', 124, 'nahorgi', 'simple', true, 5000, '/covers/non-albom.webp', true, 32),
    ('qozon-tongi', 125, 'nahorgi', 'animated', true, 8000, '/covers/qozon-tongi.webp', true, 33),
    ('tong-varaq', 126, 'nahorgi', 'scroll', false, 6000, '/covers/tong-varaq.webp', true, 34),
    ('oq-maktub', 127, 'nikoh', 'simple', false, 5000, '/covers/oq-maktub.webp', true, 35),
    ('ipak-albom', 128, 'nikoh', 'simple', true, 5000, '/covers/ipak-albom.webp', true, 36),
    ('suzani-medalyon', 129, 'nikoh', 'simple', true, 5000, '/covers/suzani-medalyon.webp', true, 37),
    ('nur-varaq', 130, 'nikoh', 'scroll', true, 6000, '/covers/nur-varaq.webp', true, 38),
    ('islimi-varaq', 131, 'nikoh', 'scroll', false, 6000, '/covers/islimi-varaq.webp', true, 39),
    ('xotira-albom', 132, 'nikoh', 'scroll', true, 6000, '/covers/xotira-albom.webp', true, 40),
    ('visol-hikoya', 133, 'nikoh', 'animated', true, 8000, '/covers/visol-hikoya.webp', true, 41),
    ('ganch-darvoza', 134, 'sunnat', 'animated', false, 8000, '/covers/ganch-darvoza.webp', true, 42),
    ('doppi-kitob', 135, 'sunnat', 'scroll', false, 6000, '/covers/doppi-kitob.webp', true, 43),
    ('lola-medalyon', 136, 'sunnat', 'simple', true, 5000, '/covers/lola-medalyon.webp', true, 44),
    ('umr-kitobi', 137, 'yubiley', 'scroll', false, 6000, '/covers/umr-kitobi.webp', true, 45),
    ('hurmat-maktub', 138, 'yubiley', 'simple', false, 5000, '/covers/hurmat-maktub.webp', true, 46))
    select 1 from public.templates t join proposed p on t.id = p.id or t.number = p.number
    where t.id <> p.id or t.number <> p.number or t.occasion <> p.occasion or t.format <> p.format or t.price <> p.price
  ) then raise exception 'Batch 3 designs identity/number conflict: transaction aborted; review reservations before release'; end if;
end $$;
insert into public.templates(id, number, occasion, format, with_photo, price, cover_url, is_active, sort) values
    ('choy-maktub', 123, 'nahorgi', 'simple', false, 5000, '/covers/choy-maktub.webp', true, 31),
    ('non-albom', 124, 'nahorgi', 'simple', true, 5000, '/covers/non-albom.webp', true, 32),
    ('qozon-tongi', 125, 'nahorgi', 'animated', true, 8000, '/covers/qozon-tongi.webp', true, 33),
    ('tong-varaq', 126, 'nahorgi', 'scroll', false, 6000, '/covers/tong-varaq.webp', true, 34),
    ('oq-maktub', 127, 'nikoh', 'simple', false, 5000, '/covers/oq-maktub.webp', true, 35),
    ('ipak-albom', 128, 'nikoh', 'simple', true, 5000, '/covers/ipak-albom.webp', true, 36),
    ('suzani-medalyon', 129, 'nikoh', 'simple', true, 5000, '/covers/suzani-medalyon.webp', true, 37),
    ('nur-varaq', 130, 'nikoh', 'scroll', true, 6000, '/covers/nur-varaq.webp', true, 38),
    ('islimi-varaq', 131, 'nikoh', 'scroll', false, 6000, '/covers/islimi-varaq.webp', true, 39),
    ('xotira-albom', 132, 'nikoh', 'scroll', true, 6000, '/covers/xotira-albom.webp', true, 40),
    ('visol-hikoya', 133, 'nikoh', 'animated', true, 8000, '/covers/visol-hikoya.webp', true, 41),
    ('ganch-darvoza', 134, 'sunnat', 'animated', false, 8000, '/covers/ganch-darvoza.webp', true, 42),
    ('doppi-kitob', 135, 'sunnat', 'scroll', false, 6000, '/covers/doppi-kitob.webp', true, 43),
    ('lola-medalyon', 136, 'sunnat', 'simple', true, 5000, '/covers/lola-medalyon.webp', true, 44),
    ('umr-kitobi', 137, 'yubiley', 'scroll', false, 6000, '/covers/umr-kitobi.webp', true, 45),
    ('hurmat-maktub', 138, 'yubiley', 'simple', false, 5000, '/covers/hurmat-maktub.webp', true, 46)
on conflict(id) do nothing;
select number, id, occasion, format, with_photo, price, is_active from public.templates where number between 123 and 138 order by number;
commit;
