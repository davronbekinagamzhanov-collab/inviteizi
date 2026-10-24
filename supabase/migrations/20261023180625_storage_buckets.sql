-- InviteIZI: бакеты хранилища.
-- Публичные (читает кто угодно по прямой ссылке): art, previews, music.
-- Приватные: receipts (чеки), deploy. Загрузка и подписанные ссылки — только через edge-функцию storage-gate
-- (service role внутри функции). Политик на storage.objects для anon/authenticated нет — им ничего нельзя.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('art',      'art',      true,  10 * 1024 * 1024, array['image/webp', 'image/png', 'image/jpeg']),
  ('previews', 'previews', true,  10 * 1024 * 1024, array['image/webp', 'image/png', 'image/jpeg']),
  ('music',    'music',    true,  20 * 1024 * 1024, array[
     'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/ogg', 'audio/opus',
     'audio/wav', 'audio/x-wav', 'audio/webm', 'audio/flac']),
  ('receipts', 'receipts', false, 10 * 1024 * 1024, array[
     'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']),
  ('deploy',   'deploy',   false, 50 * 1024 * 1024, null)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
