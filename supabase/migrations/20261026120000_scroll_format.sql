-- Extend existing checks only. Historical order formats/prices are not rewritten.
begin;
alter table public.templates drop constraint templates_format_check;
alter table public.templates add constraint templates_format_check
  check (format in ('animated', 'scroll', 'simple'));
alter table public.orders drop constraint orders_format_check;
alter table public.orders add constraint orders_format_check
  check (format in ('animated', 'scroll', 'simple'));
commit;
