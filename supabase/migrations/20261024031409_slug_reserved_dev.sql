-- /dev — служебные страницы сайта (app/dev): такой slug заказу давать нельзя (как RESERVED_SLUGS в lib/slug.ts)
alter table public.orders drop constraint if exists orders_slug_check;
alter table public.orders add constraint orders_slug_check
  check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60
         and slug not in ('demo', 'catalog', 'api', 'admin', 'art', 'covers', 'music', 'pilots', 'previews', 'dev'));
