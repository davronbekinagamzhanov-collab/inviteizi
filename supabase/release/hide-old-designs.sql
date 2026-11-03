-- ТОЛЬКО ПО «ДА» ВЛАДЕЛЬЦА. Скрыть 48 старых дизайнов из каталога бота (решение 03.11.2026).
-- Без DELETE: строки остаются, заказы и оплаченные ссылки /{slug} продолжают работать (сайт рендерит дизайн по коду).
-- Проверка: если номер в базе принадлежит другому id — вся транзакция откатывается.
-- Номера, которых ещё нет в базе (например, 107–112 до их выпуска), просто пропускаются.
begin;
set local lock_timeout = '5s';

create temporary table hide_list(number int primary key, id text not null) on commit drop;
insert into hide_list(number, id) values
    (31, 'oq-ot'),
    (41, 'tonggi-qozon'),
    (62, 'zarhal-eshik'),
    (63, 'atlas-tolqin'),
    (65, 'bodom-guli'),
    (66, 'samarqand-kitob'),
    (67, 'ipak-romol'),
    (68, 'rishton-koshin'),
    (69, 'atirgul'),
    (71, 'tandir-nuri'),
    (72, 'dasturxon'),
    (73, 'non-muhr'),
    (74, 'tonggi-choy'),
    (75, 'paxta-gul'),
    (76, 'oltin-ot'),
    (77, 'oq-chinni'),
    (79, 'sayram-hovli'),
    (80, 'zarvaraq'),
    (82, 'marvarid-satr'),
    (83, 'gulbog-sahifa'),
    (84, 'suzani-yol'),
    (85, 'bugdoy-boshoq'),
    (86, 'lola-ehtirom'),
    (88, 'adras-nishon'),
    (89, 'mis-kafgir'),
    (90, 'rayhon-sahari'),
    (91, 'visol-rishta'),
    (92, 'uzum-hovli'),
    (93, 'sopol-navo'),
    (94, 'girih-nur'),
    (95, 'siyoh-duo'),
    (96, 'kabutar-salom'),
    (97, 'shirin-tilak'),
    (98, 'minor-satr'),
    (99, 'kumush-taroq'),
    (100, 'shabnam-visol'),
    (101, 'visol-soati'),
    (102, 'dutor-navosi'),
    (103, 'tut-qogozi'),
    (104, 'qosh-uzuk'),
    (105, 'yelpigich-ziynat'),
    (106, 'saodat-kaliti'),
    (107, 'sunnat-muqova'),
    (108, 'sunnat-nasab'),
    (109, 'sahar-ipagi'),
    (110, 'sahar-maktubi'),
    (111, 'umr-sahifalari'),
    (112, 'ehtirom-kartasi');

do $$
declare bad text; n int;
begin
  select string_agg(format('%s: в базе %s, ожидали %s', t.number, t.id, h.id), '; ')
    into bad
    from public.templates t join hide_list h on h.number = t.number
   where t.id <> h.id;
  if bad is not null then raise exception 'Номер не совпадает с дизайном, ничего не меняем: %', bad; end if;

  update public.templates t set is_active = false
    from hide_list h where t.number = h.number and t.id = h.id and t.is_active;
  get diagnostics n = row_count;
  raise notice 'Скрыто строк: %', n;

  -- Защита: в каждом тадбире должен остаться хотя бы один активный дизайн
  select string_agg(o, ', ') into bad from (values ('nikoh'), ('sunnat'), ('nahorgi'), ('yubiley')) v(o)
   where not exists (select 1 from public.templates t where t.occasion = v.o and t.is_active);
  if bad is not null then raise exception 'После скрытия пустой каталог у тадбира: %', bad; end if;
end $$;

-- Контроль (видно в выводе): что осталось активным
select occasion, count(*) as active, string_agg(number::text, ', ' order by number) as numbers
  from public.templates where is_active group by occasion order by occasion;

commit;
-- Откат (если понадобится): update public.templates set is_active = true where number in (31, 41, 62..112 из списка выше);
