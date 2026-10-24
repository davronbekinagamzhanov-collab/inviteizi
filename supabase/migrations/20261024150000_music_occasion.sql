-- Музыка по тадбирам: бот показывает список только для типа заказа.
-- is_artist — песня исполнителя (скрыть все одним запросом: update music set is_active=false where is_artist);
-- is_generated — временная мелодия, сделанная кодом (скрывается, когда у тадбира есть настоящие файлы).
alter table public.music
  add column if not exists occasion text check (occasion in ('nikoh', 'nahorgi', 'sunnat', 'yubiley')),
  add column if not exists is_artist boolean not null default false,
  add column if not exists is_generated boolean not null default false;
create index if not exists music_occasion_idx on public.music (occasion, sort) where is_active;
