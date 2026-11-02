-- Фото клиента в приглашении (1–3 WebP) и публичный бакет photos.
-- Добавочная миграция: старый код колонку не читает. Новый код пишет её только для заказов с фото,
-- поэтому до миграции бот работает, а шаг «расмлар» просто не сможет сохранить фото.
-- Применять по решению владельца (production).
alter table public.orders add column if not exists photos text[];
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'orders_photos_check' and conrelid = 'public.orders'::regclass) then
    alter table public.orders add constraint orders_photos_check check (photos is null or cardinality(photos) between 1 and 3);
  end if;
end $$;

-- Публичный бакет: гости открывают фото по прямой ссылке. Загрузка и удаление — только через storage-gate.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 5 * 1024 * 1024, array['image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
