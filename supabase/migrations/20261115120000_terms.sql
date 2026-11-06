-- fix/app-polish-2, п.18: «Шартларга розиман» на проверке перед оплатой.
-- Время согласия с условиями сохраняется вместе с pay_confirmed_at (доказательство для споров).
-- Применять по «да» владельца, до Merge. Без неё оплата работает: сервер сохраняет без новой колонки.
alter table public.orders add column if not exists terms_accepted_at timestamptz;
