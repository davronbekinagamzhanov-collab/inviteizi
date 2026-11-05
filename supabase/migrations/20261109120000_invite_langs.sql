-- v2, часть 9: языки приглашения. Узбекский есть всегда; клиент может добавить русский и казахский
-- (гость сам выбирает язык на странице). Цена не меняется.
-- custom_text_i18n — свой текст клиента на других языках ({"ru": "...", "kk": "..."}), ввёл сам клиент.
-- Применять только по «да» владельца, до Merge. Существующие заказы получают '{uz}' и не меняются.

alter table public.orders
  add column if not exists langs text[] not null default '{uz}',
  add column if not exists custom_text_i18n jsonb;

alter table public.orders drop constraint if exists orders_langs_check;
alter table public.orders add constraint orders_langs_check
  check (langs <@ array['uz', 'ru', 'kk']::text[] and 'uz' = any (langs) and cardinality(langs) <= 3);

alter table public.orders drop constraint if exists orders_custom_text_i18n_check;
alter table public.orders add constraint orders_custom_text_i18n_check
  check (custom_text_i18n is null or (jsonb_typeof(custom_text_i18n) = 'object' and octet_length(custom_text_i18n::text) <= 8000));
