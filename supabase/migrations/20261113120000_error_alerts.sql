-- v2, ночная доводка: сигнал владельцу, если в журнале ошибок бота ≥3 записей за час.
-- Серверу нужно читать журнал (раньше — только запись). Применять по «да» владельца, до Merge.
grant select on public.bot_errors to inviteizi_server;
drop policy if exists server_read on public.bot_errors;
create policy server_read on public.bot_errors for select to inviteizi_server using (true);
