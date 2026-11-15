-- Task7 additive, rerunnable. Created by Supabase CLI2.81.3, resequenced after existing terms migration.
-- Apply ONLY to isolated/staging DB until owner-approved release. No money transfers.
begin;
alter table public.partners add column if not exists customer_user_id bigint references public.users(id) on delete restrict;
create unique index if not exists partners_customer_user_uidx on public.partners(customer_user_id);
alter table public.orders
 add column if not exists public_referral_code text check(public_referral_code ~ '^[a-f0-9]{32}$'),
 add column if not exists marketing_source_partner_id bigint references public.partners(id) on delete restrict,
 add column if not exists marketing_source_order_id uuid references public.orders(id) on delete restrict,
 add column if not exists marketing_issued_at timestamptz,
 add column if not exists marketing_original_amount integer check(marketing_original_amount>=0),
 add column if not exists marketing_payment_kind text check(marketing_payment_kind in('kaspi','promotion')),
 add column if not exists marketing_confirmed_by bigint,
 add column if not exists marketing_refunded_at timestamptz;
create unique index if not exists orders_public_referral_uidx on public.orders(public_referral_code) where public_referral_code is not null;
create index if not exists orders_marketing_partner_idx on public.orders(marketing_source_partner_id);
create index if not exists orders_marketing_source_order_idx on public.orders(marketing_source_order_id);
create table if not exists public.marketing_attributions(
 user_id bigint primary key references public.users(id) on delete restrict,
 partner_id bigint not null references public.partners(id) on delete restrict,
 source_order_id uuid references public.orders(id) on delete restrict,
 first_reward_order_id uuid unique references public.orders(id) on delete restrict,
 created_at timestamptz not null default now()
);
create index if not exists marketing_attributions_partner_idx on public.marketing_attributions(partner_id);
create index if not exists marketing_attributions_source_order_idx on public.marketing_attributions(source_order_id);
create table if not exists public.promotion_codes(
 id uuid primary key default gen_random_uuid(),
 name text not null default 'Промокод' check(char_length(name) between 1 and 80),
 code text not null unique check(code ~ '^[A-Z0-9_]{3,32}$'),
 discount_percent integer not null check(discount_percent between 1 and 100),
 usage_limit integer not null check(usage_limit between 1 and 100000),
 expires_at timestamptz, enabled boolean not null default true,
 created_by bigint not null, created_at timestamptz not null default now()
);
alter table public.promotion_codes add column if not exists name text not null default 'Промокод' check(char_length(name) between 1 and 80);
create table if not exists public.promotion_reservations(
 order_id uuid primary key references public.orders(id) on delete cascade,
 promo_id uuid not null references public.promotion_codes(id) on delete restrict,
 original_amount integer not null check(original_amount>=0),
 discounted_amount integer not null check(discounted_amount>=0 and discounted_amount<=original_amount),
 state text not null check(state in('reserved','receipt','consumed','released')),
 expires_at timestamptz,consumed_at timestamptz,
 created_at timestamptz not null default now(),
 check(state<>'reserved' or expires_at is not null),
 check((state='consumed')=(consumed_at is not null))
);
create index if not exists promotion_reservations_limit_idx on public.promotion_reservations(promo_id,state,expires_at);
create table if not exists public.marketing_audit(
 id bigint generated always as identity primary key,
 event_key text not null unique check(char_length(event_key) between 1 and 150),
 order_id uuid references public.orders(id) on delete restrict,
 actor_id bigint,kind text not null check(kind in('payment_confirmed','promotion_fulfilled','refund','edit_requested','edit_applied','edit_rejected','promo_created','promo_disabled','delivery_ack','delivery_ambiguous','earning_credited')),
 facts jsonb not null default '{}'::jsonb,created_at timestamptz not null default now()
);
alter table public.marketing_audit drop constraint if exists marketing_audit_kind_check;
alter table public.marketing_audit add constraint marketing_audit_kind_check check(kind in('payment_confirmed','promotion_fulfilled','refund','edit_requested','edit_applied','edit_rejected','promo_created','promo_disabled','delivery_ack','delivery_ambiguous','earning_credited'));
create index if not exists marketing_audit_order_idx on public.marketing_audit(order_id,created_at);
create table if not exists public.order_edit_requests(
 id uuid primary key default gen_random_uuid(),order_id uuid not null references public.orders(id) on delete restrict,
 user_id bigint not null references public.users(id) on delete restrict,
 request_key text not null unique check(char_length(request_key) between 1 and 120),
 body text not null check(char_length(body) between 1 and 600),
 state text not null default 'pending' check(state in('pending','applied','rejected')),
 fee integer not null check(fee in(0,2000)),created_at timestamptz not null default now(),decided_at timestamptz,decided_by bigint
);
create unique index if not exists order_one_free_edit_uidx on public.order_edit_requests(order_id) where fee=0 and state in('pending','applied');
create index if not exists order_edit_user_idx on public.order_edit_requests(user_id,created_at);
alter table public.bot_notices
 add column if not exists lease_token uuid,
 add column if not exists sending_at timestamptz,
 add column if not exists lease_until timestamptz,
 add column if not exists attempts integer not null default 0 check(attempts>=0),
 add column if not exists dead_at timestamptz,
 add column if not exists last_error_code text check(char_length(last_error_code)<=80),
 add column if not exists remote_message_id bigint;
create index if not exists bot_notices_delivery_idx on public.bot_notices(due_at) where sent_at is null and dead_at is null;
create table if not exists public.marketing_command_limits(user_id bigint not null references public.users(id) on delete cascade,minute timestamptz not null,count integer not null check(count between 1 and 10),primary key(user_id,minute));
-- No anonymous or authenticated-user access to money, identity, requests or promo inventory.
do $$declare name text;begin
 foreach name in array array['marketing_attributions','promotion_codes','promotion_reservations','marketing_audit','order_edit_requests','marketing_command_limits'] loop
 execute format('alter table public.%I enable row level security',name);
 execute format('revoke all on public.%I from public,anon,authenticated',name);
 execute format('grant select,insert,update on public.%I to inviteizi_server',name);
 execute format('drop policy if exists server_all on public.%I',name);
 execute format('create policy server_all on public.%I for all to inviteizi_server using(true) with check(true)',name);
 end loop;
end$$;
-- Audit is append-only for the application role.
revoke update,delete on public.marketing_audit from inviteizi_server;
grant usage,select on sequence public.marketing_audit_id_seq to inviteizi_server;
-- Immutable source snapshot at order insertion. Old binary remains compatible with additive columns.
create or replace function public.marketing_order_source() returns trigger language plpgsql security invoker set search_path='' as $$begin
 select partner_id,source_order_id into new.marketing_source_partner_id,new.marketing_source_order_id from public.marketing_attributions where user_id=new.user_id;
 return new;end$$;
drop trigger if exists marketing_order_source on public.orders;
create trigger marketing_order_source before insert on public.orders for each row execute function public.marketing_order_source();
-- A valid reservation cannot expire while a submitted discounted receipt awaits the owner.
create or replace function public.marketing_promo_receipt() returns trigger language plpgsql security invoker set search_path='' as $$declare r public.promotion_reservations%rowtype;begin
 if new.status='receipt_sent' and old.status is distinct from new.status then
 select * into r from public.promotion_reservations where order_id=new.id for update;
 if found and r.state<>'released' then
 if r.state<>'reserved' or r.expires_at<=now() or new.amount<>r.discounted_amount then raise exception 'promotion_quote_expired' using errcode='P0001';end if;
 update public.promotion_reservations set state='receipt',expires_at=null where order_id=new.id;
 end if;
 elsif new.status='rejected' and old.status='receipt_sent' then
 update public.promotion_reservations set state='released',expires_at=null,consumed_at=null where order_id=new.id and state='receipt';
 select * into r from public.promotion_reservations where order_id=new.id;
 if found then new.amount:=r.original_amount;end if;
 end if;
 return new;end$$;
drop trigger if exists marketing_promo_receipt on public.orders;
create trigger marketing_promo_receipt before update of status on public.orders for each row execute function public.marketing_promo_receipt();
revoke all on function public.marketing_order_source(),public.marketing_promo_receipt() from public,anon,authenticated;
grant execute on function public.marketing_order_source(),public.marketing_promo_receipt() to inviteizi_server;

create or replace function public.track_order_analytics() returns trigger language plpgsql security invoker set search_path='' as $$begin
 if TG_OP='INSERT' then
 insert into public.analytics_events(kind,user_id,target,dedupe_key) values('order_created',new.user_id,new.template_id,new.id::text) on conflict do nothing;
 insert into public.analytics_events(kind,user_id,target,dedupe_key) values('music_selected',new.user_id,coalesce(new.music_id,new.music_kind),new.id::text) on conflict do nothing;
 end if;
 if new.amount>0 and new.marketing_refunded_at is null and new.status in('active','archived') and(TG_OP='INSERT' or old.status not in('active','archived')) then
 insert into public.analytics_events(kind,user_id,target,dedupe_key) values('payment_confirmed',new.user_id,new.template_id,new.id::text) on conflict do nothing;
 end if;
 return new;end$$;
create or replace function public.marketing_format_change() returns trigger language plpgsql security invoker set search_path='' as $$begin
 if new.format is distinct from old.format then
 update public.promotion_reservations set state='released',expires_at=null,consumed_at=null where order_id=new.id and state='reserved';
 new.marketing_original_amount:=new.amount;
 end if;return new;end$$;
drop trigger if exists marketing_format_change on public.orders;
create trigger marketing_format_change before update of format on public.orders for each row execute function public.marketing_format_change();
revoke all on function public.marketing_format_change() from public,anon,authenticated;
grant execute on function public.marketing_format_change() to inviteizi_server;

create or replace function public.marketing_earning_guard() returns trigger language plpgsql security invoker set search_path='' as $$declare o public.orders%rowtype;p public.partners%rowtype;begin
 select * into o from public.orders where id=new.order_id for update;
 select * into p from public.partners where id=new.partner_id for update;
 if o.status not in('active','archived') or o.amount<=0 or o.marketing_refunded_at is not null or p.status='rejected' or p.telegram_id=o.user_id or p.customer_user_id=o.user_id or exists(select 1 from public.users u where u.id=o.user_id and p.username is not null and lower(u.username)=lower(p.username)) then raise exception 'ineligible_commission' using errcode='23514';end if;
 return new;end$$;
create or replace function public.marketing_earning_audit() returns trigger language plpgsql security invoker set search_path='' as $$begin
 insert into public.marketing_audit(event_key,kind,order_id,actor_id,facts)
 select 'earning:'||new.order_id::text,'earning_credited',new.order_id,o.marketing_confirmed_by,jsonb_build_object('partnerId',new.partner_id,'amount',new.amount,'rate',p.rate,'ratePercent',p.rate_percent)
 from public.orders o join public.partners p on p.id=new.partner_id where o.id=new.order_id on conflict(event_key) do nothing;
 return new;end$$;
drop trigger if exists marketing_earning_guard on public.partner_earnings;
drop trigger if exists marketing_earning_audit on public.partner_earnings;
create trigger marketing_earning_guard before insert on public.partner_earnings for each row execute function public.marketing_earning_guard();
create trigger marketing_earning_audit after insert on public.partner_earnings for each row execute function public.marketing_earning_audit();
revoke all on function public.marketing_earning_guard(),public.marketing_earning_audit() from public,anon,authenticated;
grant execute on function public.marketing_earning_guard(),public.marketing_earning_audit() to inviteizi_server;

commit;
