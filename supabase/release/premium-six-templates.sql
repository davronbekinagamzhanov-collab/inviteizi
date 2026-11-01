-- PRE-DEPLOY: six new catalog identities only. No UPDATE/DELETE, no order reads or writes.
-- Current Git history reserves 107..112; this guard is mandatory because Production was not inspected.
begin;
set local lock_timeout = '5s';
lock table public.templates in share row exclusive mode;
do $$ begin
  if exists (
    with proposed(id, number, occasion, format, with_photo, price, cover_url, is_active, sort) as (values ('sunnat-muqova', 107, 'sunnat', 'animated', false, 8000, '/covers/sunnat-muqova.webp', true, 15),
    ('sunnat-nasab', 108, 'sunnat', 'scroll', false, 6000, '/covers/sunnat-nasab.webp', true, 16),
    ('sahar-ipagi', 109, 'nahorgi', 'animated', false, 8000, '/covers/sahar-ipagi.webp', true, 17),
    ('sahar-maktubi', 110, 'nahorgi', 'simple', false, 5000, '/covers/sahar-maktubi.webp', true, 18),
    ('umr-sahifalari', 111, 'yubiley', 'scroll', true, 6000, '/covers/umr-sahifalari.webp', true, 19),
    ('ehtirom-kartasi', 112, 'yubiley', 'simple', false, 5000, '/covers/ehtirom-kartasi.webp', true, 20))
    select 1 from public.templates t join proposed p on t.id = p.id or t.number = p.number
    where t.id <> p.id or t.number <> p.number or t.occasion <> p.occasion or t.format <> p.format or t.price <> p.price
  ) then raise exception 'Premium catalog identity/number conflict: transaction aborted; review reservations before release'; end if;
end $$;
insert into public.templates(id, number, occasion, format, with_photo, price, cover_url, is_active, sort) values
    ('sunnat-muqova', 107, 'sunnat', 'animated', false, 8000, '/covers/sunnat-muqova.webp', true, 15),
    ('sunnat-nasab', 108, 'sunnat', 'scroll', false, 6000, '/covers/sunnat-nasab.webp', true, 16),
    ('sahar-ipagi', 109, 'nahorgi', 'animated', false, 8000, '/covers/sahar-ipagi.webp', true, 17),
    ('sahar-maktubi', 110, 'nahorgi', 'simple', false, 5000, '/covers/sahar-maktubi.webp', true, 18),
    ('umr-sahifalari', 111, 'yubiley', 'scroll', true, 6000, '/covers/umr-sahifalari.webp', true, 19),
    ('ehtirom-kartasi', 112, 'yubiley', 'simple', false, 5000, '/covers/ehtirom-kartasi.webp', true, 20)
on conflict(id) do nothing;
commit;
