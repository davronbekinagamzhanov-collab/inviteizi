-- Музыка «нашего списка» — с сайта вместо Supabase Storage (402 с 16.11.2026).
-- ЗАПУСКАТЬ ТОЛЬКО ПОСЛЕ ДЕПЛОЯ, когда файлы лежат в public/audio/lib/<тадбир>/<имя>.mp3
-- и каждый адрес из шага 1 открывается в браузере (https://inviteizi.vercel.app/audio/lib/...).
-- Ничего не удаляет. Свои песни клиентов (music/own/…) не трогает — их нет в таблице music.

-- Шаг 1 (только чтение): какие файлы нужны и куда их положить
select id,
       occasion,
       file_url as old_url,
       'public/audio/lib/' || occasion || '/' || substr(id, length(occasion) + 2) || '.mp3' as put_file_here,
       'https://inviteizi.vercel.app/audio/lib/' || occasion || '/' || substr(id, length(occasion) + 2) || '.mp3' as new_url
from public.music
where file_url like '%.supabase.co/storage/v1/object/public/music/%'
  and occasion is not null
  and id like occasion || '-%'
order by occasion, sort;

-- Шаг 2: перенос адресов одной транзакцией. telegram_file_id не трогаем: прослушивание в боте идёт из кэша Telegram
begin;
update public.music
set file_url = 'https://inviteizi.vercel.app/audio/lib/' || occasion || '/' || substr(id, length(occasion) + 2) || '.mp3'
where file_url like '%.supabase.co/storage/v1/object/public/music/%'
  and occasion is not null
  and id like occasion || '-%';
-- Проверка: старых адресов не осталось (должно быть 0)
select count(*) as left_on_supabase from public.music where file_url like '%.supabase.co/storage/%';
commit;
