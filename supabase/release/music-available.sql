-- Музыка: клиенту предлагаются только песни, которые реально играют (19.11.2026).
-- С 16.11.2026 Supabase Storage отвечает 402 — песни, лежавшие там, молчат. На сайте есть только
-- 12 своих мелодий public/audio/originals/*.mp3. Код (lib/music-available.ts) уже скрывает молчащие
-- песни и добавляет никоҳ/наҳорги подходящие мелодии других тадбиров; этот файл приводит таблицу в порядок.
-- Запускать после деплоя ветки release/final-2. Повторный запуск безопасен. Заказы не меняются:
-- заказ с уже выбранной недоступной песней играет демо-мелодию своего тадбира (lib/orders.ts).

-- Шаг 1 (только чтение): что сейчас в таблице
select id, occasion, is_active, file_url from public.music order by occasion, sort, id;

-- Шаг 2: одна транзакция
begin;
set local lock_timeout = '5s';

-- 2а. 12 своих мелодий есть и активны (если файл ещё не добавлялся — добавить; адрес — сайт)
insert into public.music(id, title_uz, title_ru, file_url, sort, is_active, occasion, is_artist, is_generated) values
  ('inviteizi-sunnat-qutlug-qadam', 'Қутлуғ қадам', 'Добрый шаг', 'https://inviteizi.vercel.app/audio/originals/inviteizi-sunnat-qutlug-qadam.mp3', 100, true, 'sunnat', false, false),
  ('inviteizi-sunnat-oilaviy-shodlik', 'Оилавий шодлик', 'Семейная радость', 'https://inviteizi.vercel.app/audio/originals/inviteizi-sunnat-oilaviy-shodlik.mp3', 101, true, 'sunnat', false, false),
  ('inviteizi-sunnat-duolar-sadosi', 'Дуолар садоси', 'Отзвук добрых молитв', 'https://inviteizi.vercel.app/audio/originals/inviteizi-sunnat-duolar-sadosi.mp3', 102, true, 'sunnat', false, false),
  ('inviteizi-sunnat-navnihollar', 'Навниҳоллар', 'Юные побеги', 'https://inviteizi.vercel.app/audio/originals/inviteizi-sunnat-navnihollar.mp3', 103, true, 'sunnat', false, false),
  ('inviteizi-sunnat-bayram-nafasi', 'Байрам нафаси', 'Дыхание праздника', 'https://inviteizi.vercel.app/audio/originals/inviteizi-sunnat-bayram-nafasi.mp3', 104, true, 'sunnat', false, false),
  ('inviteizi-sunnat-mehr-rishtasi', 'Меҳр риштаси', 'Нить доброты', 'https://inviteizi.vercel.app/audio/originals/inviteizi-sunnat-mehr-rishtasi.mp3', 105, true, 'sunnat', false, false),
  ('inviteizi-yubiley-umr-nuri', 'Умр нури', 'Свет прожитых лет', 'https://inviteizi.vercel.app/audio/originals/inviteizi-yubiley-umr-nuri.mp3', 106, true, 'yubiley', false, false),
  ('inviteizi-yubiley-ehtirom', 'Эҳтиром', 'Почтение', 'https://inviteizi.vercel.app/audio/originals/inviteizi-yubiley-ehtirom.mp3', 107, true, 'yubiley', false, false),
  ('inviteizi-yubiley-xotira-bogi', 'Хотира боғи', 'Сад воспоминаний', 'https://inviteizi.vercel.app/audio/originals/inviteizi-yubiley-xotira-bogi.mp3', 108, true, 'yubiley', false, false),
  ('inviteizi-yubiley-diydor', 'Дийдор', 'Радость встречи', 'https://inviteizi.vercel.app/audio/originals/inviteizi-yubiley-diydor.mp3', 109, true, 'yubiley', false, false),
  ('inviteizi-yubiley-sokin-oqshom', 'Сокин оқшом', 'Тихий вечер', 'https://inviteizi.vercel.app/audio/originals/inviteizi-yubiley-sokin-oqshom.mp3', 110, true, 'yubiley', false, false),
  ('inviteizi-yubiley-minnatdorlik', 'Миннатдорлик', 'Благодарность', 'https://inviteizi.vercel.app/audio/originals/inviteizi-yubiley-minnatdorlik.mp3', 111, true, 'yubiley', false, false)
on conflict (id) do update
  set file_url = excluded.file_url, is_active = true;

-- 2б. Песни без файла на сайте — скрыть из списков (строки и заказы остаются)
update public.music
set is_active = false
where is_active
  and file_url not like 'https://inviteizi.vercel.app/audio/originals/%'
  and file_url not like 'https://inviteizi.vercel.app/audio/lib/%'
  and file_url not like '/audio/%';

-- Проверка: активных песен по тадбирам (своих: sunnat 6, yubiley 6; никоҳ/наҳорги берут из них в коде)
select occasion, count(*) filter (where is_active) as active, count(*) filter (where not is_active) as hidden
from public.music group by occasion order by occasion;
commit;

-- Когда песни библиотеки лягут в public/audio/lib/<тадбир>/<имя>.mp3 и задеплоятся —
-- supabase/release/music-local-urls.sql (переносит адреса), затем вернуть им is_active = true.
