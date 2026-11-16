-- Оплата без чека (17.11.2026): клиент нажал «✅ Тўладим» и написал имя, как в Kaspi. Чек — по желанию.
-- Только расширение: старые значения допустимы как раньше. Применяет владелец вручную.
alter table public.orders add column if not exists payer_name text check (payer_name is null or char_length(payer_name) between 2 and 40);

-- receipt_kind: + 'name' (оплата по имени, без файла). Файл есть только у photo/document
alter table public.orders drop constraint if exists orders_receipt_kind_check;
alter table public.orders add constraint orders_receipt_kind_check check (receipt_kind in ('photo', 'document', 'name'));
alter table public.orders drop constraint if exists orders_receipt_pair;
alter table public.orders add constraint orders_receipt_pair check (
  (receipt_kind = 'name' and receipt_file_id is null)
  or (receipt_kind is distinct from 'name' and (receipt_file_id is null) = (receipt_kind is null))
);
