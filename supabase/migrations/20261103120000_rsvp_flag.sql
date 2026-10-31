-- Выбор клиента «ответы гостей» и время последней вечерней сводки хозяину.
-- Колонка rsvp обязательна для кода бота: применять до выкладки.
alter table public.orders
  add column if not exists rsvp boolean,
  add column if not exists rsvp_digest_at timestamptz;
