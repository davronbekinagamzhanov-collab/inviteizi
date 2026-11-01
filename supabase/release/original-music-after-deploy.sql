-- POST-DEPLOY ONLY: verify all twelve /audio/originals/*.mp3 URLs are live BEFORE executing.
-- Add-only. Existing active tracks, missing local files and user uploads are never hidden or changed.
begin;
set local lock_timeout = '5s';
lock table public.music in share row exclusive mode;
do $$ begin
  if exists (
    with proposed(id, title_uz, title_ru, file_url, sort, is_active, occasion, is_artist, is_generated) as (values ('inviteizi-sunnat-qutlug-qadam', 'Қутлуғ қадам', 'Добрый шаг', 'https://inviteizi.vercel.app/audio/originals/inviteizi-sunnat-qutlug-qadam.mp3', 100, true, 'sunnat', false, false),
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
    ('inviteizi-yubiley-minnatdorlik', 'Миннатдорлик', 'Благодарность', 'https://inviteizi.vercel.app/audio/originals/inviteizi-yubiley-minnatdorlik.mp3', 111, true, 'yubiley', false, false))
    select 1 from public.music m join proposed p on m.id = p.id
    where m.file_url <> p.file_url or m.occasion is distinct from p.occasion
  ) then raise exception 'Original music ID conflict: transaction aborted; no existing records overwritten'; end if;
end $$;
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
on conflict(id) do nothing;
commit;
