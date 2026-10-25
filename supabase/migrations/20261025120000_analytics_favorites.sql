-- Server only. No public analytics API, no client supplied financial events.
alter table public.admins add column can_analytics boolean not null default false;

create table public.analytics_config (
  singleton boolean primary key default true check (singleton),
  started_at timestamptz not null default now()
);
insert into public.analytics_config(singleton) values(true);

create table public.design_favorites (
  user_id bigint not null references public.users(id) on delete cascade,
  template_id text not null references public.templates(id) on update cascade,
  created_at timestamptz not null default now(),
  primary key(user_id, template_id)
);
create table public.analytics_events (
  kind text not null check(kind in ('demo_opened','design_favorited','design_selected','order_created','payment_confirmed','music_selected')),
  user_id bigint not null references public.users(id) on delete cascade,
  target text not null check(char_length(target) between 1 and 100),
  dedupe_key text not null check(char_length(dedupe_key) between 1 and 160),
  created_at timestamptz not null default now(),
  primary key(kind, user_id, dedupe_key)
);
create index analytics_events_date on public.analytics_events(created_at, kind);

-- Recorded in the same transaction as the order; repeated callbacks cannot duplicate sales.
create function public.track_order_analytics() returns trigger language plpgsql
security invoker set search_path = '' as $$
begin
  if TG_OP = 'INSERT' then
    insert into public.analytics_events(kind,user_id,target,dedupe_key)
      values ('order_created',new.user_id,new.template_id,new.id::text) on conflict do nothing;
    insert into public.analytics_events(kind,user_id,target,dedupe_key)
      values ('music_selected',new.user_id,coalesce(new.music_id,new.music_kind),new.id::text) on conflict do nothing;
  end if;
  if new.status in ('active','archived') and (TG_OP = 'INSERT' or old.status not in ('active','archived')) then
    insert into public.analytics_events(kind,user_id,target,dedupe_key)
      values ('payment_confirmed',new.user_id,new.template_id,new.id::text) on conflict do nothing;
  end if;
  return new;
end;
$$;
create trigger orders_analytics after insert or update of status on public.orders
for each row execute function public.track_order_analytics();

alter table public.analytics_config enable row level security;
alter table public.design_favorites enable row level security;
alter table public.analytics_events enable row level security;
revoke all on public.analytics_config, public.design_favorites, public.analytics_events from anon, authenticated;
grant select on public.analytics_config to inviteizi_server;
grant select, insert, delete on public.design_favorites to inviteizi_server;
grant select, insert on public.analytics_events to inviteizi_server;
create policy server_all on public.analytics_config for select to inviteizi_server using(true);
create policy server_all on public.design_favorites for all to inviteizi_server using(true) with check(true);
create policy server_all on public.analytics_events for all to inviteizi_server using(true) with check(true);
