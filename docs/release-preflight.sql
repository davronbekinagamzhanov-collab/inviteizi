-- OWNER REVIEW ONLY. Not executed against production by Codex.
-- Run with an approved read-only connection. No secrets, vault/auth contents or customer files.
begin read only;
set local statement_timeout = '15s';

select to_regclass('supabase_migrations.schema_migrations') is not null as has_migration_history;
-- If true, separately read ONLY version/name from that table, as shown in release-runbook.md.

select conrelid::regclass::text as relation, conname, pg_get_constraintdef(oid) as definition
from pg_constraint where conrelid in ('public.templates'::regclass,'public.orders'::regclass)
and contype='c' order by relation,conname;

select table_name,column_name,data_type from information_schema.columns
where table_schema='public' and table_name in ('orders','templates','music','admins')
order by table_name,ordinal_position;

select name,to_regclass('public.'||name) is not null as present
from unnest(array['analytics_config','analytics_events','design_favorites','slug_history']) as items(name);

select c.relname,c.relrowsecurity
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('users','orders','events','templates','music','admins','analytics_config','analytics_events','design_favorites')
order by c.relname;

select tablename,policyname,roles,cmd from pg_policies
where schemaname='public' and tablename in ('orders','templates','music','admins','analytics_config','analytics_events','design_favorites')
order by tablename,policyname;

select c.relname,
 has_table_privilege('anon',c.oid,'SELECT') as anon_read,
 has_table_privilege('authenticated',c.oid,'SELECT') as authenticated_read,
 has_table_privilege('inviteizi_server',c.oid,'SELECT') as server_read
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('users','orders','events','templates','music','admins','analytics_config','analytics_events','design_favorites')
order by c.relname;

select tgname,tgenabled from pg_trigger
where tgrelid='public.orders'::regclass and not tgisinternal order by tgname;

-- Metadata/catalog only; do not export personal order rows into GitHub.
select id,format,price,is_active from public.templates order by number,id;
select o.template_id,count(*) as paid_references
from public.orders o where o.status in ('active','archived') group by o.template_id order by o.template_id;
select to_regprocedure('public.check_cron_secret(text)') is not null as cron_checker_present;

-- Supabase-only metadata: no object listing and no signed URLs.
-- Run separately if storage.buckets exists:
-- select id,public,file_size_limit from storage.buckets order by id;
rollback;
