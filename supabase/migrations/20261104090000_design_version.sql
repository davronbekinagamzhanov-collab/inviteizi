-- Additive, nullable, no default and no backfill: every existing order keeps its original renderer.
-- Apply only through the owner's reviewed release procedure. Never run automatically at startup.
-- Old application code ignores this column and remains compatible.
alter table public.orders add column if not exists design_version text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname='orders_design_version_check' and conrelid='public.orders'::regclass) then
    alter table public.orders add constraint orders_design_version_check
      check (design_version is null or design_version = 'premium-v1');
  end if;
end $$;
