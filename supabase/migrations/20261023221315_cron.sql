-- InviteIZI: задание каждые 10 минут — POST https://inviteizi.vercel.app/api/cron с заголовком x-cron-secret.
-- Секрет создаётся внутри базы (vault) и никуда не выводится. Next проверяет его функцией check_cron_secret.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- секрет: случайные 24 байта, только если ещё нет (повторный запуск не меняет его)
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'cron_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(24), 'hex'), 'cron_secret', 'InviteIZI: x-cron-secret для /api/cron');
  end if;
end;
$$;

-- проверка секрета для Next (роль inviteizi_server)
create or replace function public.check_cron_secret(p text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select s.decrypted_secret = p from vault.decrypted_secrets s where s.name = 'cron_secret' limit 1),
    false
  ) and p is not null and length(p) > 0;
$$;

revoke all on function public.check_cron_secret(text) from public, anon, authenticated;
grant execute on function public.check_cron_secret(text) to inviteizi_server;

-- задание (пересоздаётся по имени)
select cron.unschedule(jobid) from cron.job where jobname = 'inviteizi-cron';
select cron.schedule(
  'inviteizi-cron',
  '*/10 * * * *',
  $job$
  select net.http_post(
    url := 'https://inviteizi.vercel.app/api/cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret' limit 1)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  );
  $job$
);

-- Служебная функция Supabase (event trigger ensure_rls) не должна вызываться через /rest/v1/rpc.
-- Event trigger работает без EXECUTE, поэтому забрать право безопасно (замечание advisors 0028/0029).
do $$
begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'rls_auto_enable') then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end;
$$;
