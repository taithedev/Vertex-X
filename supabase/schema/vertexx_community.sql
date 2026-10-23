
create table public.vertexx_members (
 user_id uuid primary key references auth.users(id) on delete cascade,
 username text not null unique check(username ~ '^[A-Za-z0-9_]{3,20}$'),
 display_name text not null default '' check(char_length(display_name)<=48),
 bio text not null default '' check(char_length(bio)<=500),
 avatar_data_url text check(avatar_data_url is null or (length(avatar_data_url)<=140000 and avatar_data_url ~ '^data:image/(png|jpeg|webp);base64,')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.vertexx_member_roles (
 user_id uuid primary key references public.vertexx_members(user_id) on delete cascade,
 role text not null default 'member' check(role in ('member','owner')),
 verified boolean not null default false
);
create table public.vertexx_wallets (
 user_id uuid primary key references public.vertexx_members(user_id) on delete cascade,
 balance integer not null default 100 check(balance>=0 and balance<=10000000),
 daily_claimed_on date, updated_at timestamptz not null default now()
);
create table public.vertexx_crystal_ledger (
 id bigint generated always as identity primary key,
 user_id uuid not null references public.vertexx_members(user_id) on delete cascade,
 amount integer not null, reason text not null, request_id uuid unique,
 created_at timestamptz not null default now()
);
create index vertexx_ledger_user_time on public.vertexx_crystal_ledger(user_id,created_at desc);
create table public.vertexx_runs (
 id uuid primary key, user_id uuid not null references public.vertexx_members(user_id) on delete cascade,
 source_hash text not null, status text not null default 'pending' check(status in ('pending','success','failed','cancelled')),
 cost integer not null check(cost in (0,1)), result jsonb,
 created_at timestamptz not null default now(), expires_at timestamptz not null default (now()+interval '20 seconds'),
 finished_at timestamptz
);
create index vertexx_runs_user_time on public.vertexx_runs(user_id,created_at desc);
create table public.vertexx_scripts (
 id uuid primary key default gen_random_uuid(), author_id uuid not null references public.vertexx_members(user_id) on delete cascade default auth.uid(),
 title text not null check(char_length(title) between 1 and 80), description text not null default '' check(char_length(description)<=1000),
 source text not null check(octet_length(source) between 1 and 100000),
 visibility text not null default 'public' check(visibility in ('public','private')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index vertexx_scripts_author on public.vertexx_scripts(author_id);
create index vertexx_scripts_newest on public.vertexx_scripts(updated_at desc);
create table public.vertexx_script_moderation (
 script_id uuid primary key references public.vertexx_scripts(id) on delete cascade,
 hidden boolean not null default false, updated_by uuid references public.vertexx_members(user_id) on delete set null,
 updated_at timestamptz not null default now()
);
create table public.vertexx_cloud_preferences (
 user_id uuid primary key references public.vertexx_members(user_id) on delete cascade default auth.uid(),
 settings jsonb not null default '{}' check(octet_length(settings::text)<=16000)
);
create table public.vertexx_roblox_challenges (
 user_id uuid primary key references public.vertexx_members(user_id) on delete cascade,
 roblox_id bigint not null, username text not null, code text not null,
 expires_at timestamptz not null default (now()+interval '10 minutes')
);
create table public.vertexx_roblox_links (
 user_id uuid primary key references public.vertexx_members(user_id) on delete cascade,
 roblox_id bigint not null unique, username text not null, display_name text not null,
 avatar_data_url text, linked_at timestamptz not null default now(),
 method text not null default 'profile_bio_proof'
);
alter table public.vertexx_members enable row level security;
alter table public.vertexx_member_roles enable row level security;
alter table public.vertexx_wallets enable row level security;
alter table public.vertexx_crystal_ledger enable row level security;
alter table public.vertexx_runs enable row level security;
alter table public.vertexx_scripts enable row level security;
alter table public.vertexx_script_moderation enable row level security;
alter table public.vertexx_cloud_preferences enable row level security;
alter table public.vertexx_roblox_challenges enable row level security;
alter table public.vertexx_roblox_links enable row level security;
revoke all on public.vertexx_members,public.vertexx_member_roles,public.vertexx_wallets,public.vertexx_crystal_ledger,public.vertexx_runs,public.vertexx_scripts,public.vertexx_script_moderation,public.vertexx_cloud_preferences,public.vertexx_roblox_challenges,public.vertexx_roblox_links from anon,authenticated;
grant all on public.vertexx_members,public.vertexx_member_roles,public.vertexx_wallets,public.vertexx_crystal_ledger,public.vertexx_runs,public.vertexx_scripts,public.vertexx_script_moderation,public.vertexx_cloud_preferences,public.vertexx_roblox_challenges,public.vertexx_roblox_links to service_role;
grant usage,select on sequence public.vertexx_crystal_ledger_id_seq to service_role;
grant select on public.vertexx_members,public.vertexx_member_roles,public.vertexx_script_moderation to authenticated;
grant select on public.vertexx_wallets,public.vertexx_crystal_ledger,public.vertexx_runs,public.vertexx_roblox_links,public.vertexx_cloud_preferences to authenticated;
grant select,delete on public.vertexx_scripts to authenticated;
grant insert(author_id,title,description,source,visibility), update(title,description,source,visibility) on public.vertexx_scripts to authenticated;
grant update(display_name,bio,avatar_data_url) on public.vertexx_members to authenticated;
grant insert(user_id,settings),update(settings) on public.vertexx_cloud_preferences to authenticated;
create policy vertexx_members_read on public.vertexx_members for select to authenticated using(true);
create policy vertexx_members_edit on public.vertexx_members for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy vertexx_roles_read on public.vertexx_member_roles for select to authenticated using(true);
create policy vertexx_moderation_read on public.vertexx_script_moderation for select to authenticated using(true);
create policy vertexx_wallet_read on public.vertexx_wallets for select to authenticated using(user_id=(select auth.uid()));
create policy vertexx_ledger_read on public.vertexx_crystal_ledger for select to authenticated using(user_id=(select auth.uid()));
create policy vertexx_runs_read on public.vertexx_runs for select to authenticated using(user_id=(select auth.uid()));
create policy vertexx_roblox_read on public.vertexx_roblox_links for select to authenticated using(user_id=(select auth.uid()));
create policy vertexx_preferences_read on public.vertexx_cloud_preferences for select to authenticated using(user_id=(select auth.uid()));
create policy vertexx_preferences_insert on public.vertexx_cloud_preferences for insert to authenticated with check(user_id=(select auth.uid()));
create policy vertexx_preferences_edit on public.vertexx_cloud_preferences for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy vertexx_script_read on public.vertexx_scripts for select to authenticated using(
 author_id=(select auth.uid()) or (visibility='public' and not exists(select 1 from public.vertexx_script_moderation m where m.script_id=id and m.hidden))
);
create policy vertexx_script_insert on public.vertexx_scripts for insert to authenticated with check(author_id=(select auth.uid()));
create policy vertexx_script_edit on public.vertexx_scripts for update to authenticated using(author_id=(select auth.uid())) with check(author_id=(select auth.uid()));
create policy vertexx_script_delete on public.vertexx_scripts for delete to authenticated using(author_id=(select auth.uid()));

create function public.vertexx_bootstrap(p_user uuid,p_username text) returns void language plpgsql security invoker set search_path='' as $$
begin
 insert into public.vertexx_members(user_id,username,display_name) values(p_user,p_username,p_username) on conflict(user_id) do nothing;
 insert into public.vertexx_member_roles(user_id) values(p_user) on conflict do nothing;
 insert into public.vertexx_wallets(user_id) values(p_user) on conflict do nothing;
 insert into public.vertexx_cloud_preferences(user_id) values(p_user) on conflict do nothing;
end $$;
create function public.vertexx_begin_run(p_user uuid,p_id uuid,p_hash text) returns jsonb language plpgsql security invoker set search_path='' as $$
declare existing public.vertexx_runs; price integer; credits integer;
begin
 select balance into credits from public.vertexx_wallets where user_id=p_user for update;
 if not found then raise exception 'Account wallet is missing'; end if;
 select * into existing from public.vertexx_runs where id=p_id;
 if found then
  if existing.user_id<>p_user or existing.source_hash<>p_hash then raise exception 'Run request conflicts'; end if;
  if existing.status='pending' then raise exception 'Run is still pending; check run history'; end if;
  return to_jsonb(existing);
 end if;
 if (select count(*) from public.vertexx_runs where user_id=p_user and created_at>now()-interval '1 minute')>=30 then raise exception 'Run limit reached; try again in a minute'; end if;
 update public.vertexx_runs set status='failed',finished_at=now(),result='{"success":false,"error":"Run expired without charge","output":""}'::jsonb where user_id=p_user and status='pending' and expires_at<now();
 if exists(select 1 from public.vertexx_runs where user_id=p_user and status='pending') then raise exception 'A run is already pending'; end if;
 price:=case when exists(select 1 from public.vertexx_member_roles where user_id=p_user and role='owner') then 0 else 1 end;
 if credits<price then raise exception 'Not enough crystals'; end if;
 insert into public.vertexx_runs(id,user_id,source_hash,cost) values(p_id,p_user,p_hash,price) returning * into existing;
 return to_jsonb(existing);
end $$;
create function public.vertexx_finish_run(p_user uuid,p_id uuid,p_success boolean,p_result jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare run public.vertexx_runs; credits integer;
begin
 select balance into credits from public.vertexx_wallets where user_id=p_user for update;
 select * into run from public.vertexx_runs where id=p_id and user_id=p_user for update;
 if not found then raise exception 'Unknown run'; end if;
 if run.status<>'pending' then return to_jsonb(run); end if;
 if octet_length(p_result::text)>1200000 then raise exception 'Run result is too large'; end if;
 if now()>run.expires_at then p_success:=false; p_result:='{"success":false,"error":"Run expired without charge","output":""}'::jsonb; end if;
 if p_success and credits<run.cost then raise exception 'Insufficient crystals'; end if;
 if p_success and run.cost>0 then
  update public.vertexx_wallets set balance=balance-run.cost,updated_at=now() where user_id=p_user;
  insert into public.vertexx_crystal_ledger(user_id,amount,reason,request_id) values(p_user,-run.cost,'successful_run',p_id);
 end if;
 update public.vertexx_runs set status=case when p_success then 'success' else 'failed' end,
 result=p_result || jsonb_build_object('charged',case when p_success then run.cost else 0 end), finished_at=now() where id=p_id returning * into run;
 return to_jsonb(run);
end $$;
create function public.vertexx_cancel_run(p_user uuid,p_id uuid) returns void language plpgsql security invoker set search_path='' as $$
begin
 perform 1 from public.vertexx_wallets where user_id=p_user for update;
 update public.vertexx_runs set status='cancelled',finished_at=now(),result='{"success":false,"charged":0,"error":"Execution stopped. No crystals charged.","output":""}'::jsonb where id=p_id and user_id=p_user and status='pending';
end $$;
create function public.vertexx_daily_crystals(p_user uuid) returns integer language plpgsql security invoker set search_path='' as $$
declare credits integer; claimed date;
begin
 select balance,daily_claimed_on into credits,claimed from public.vertexx_wallets where user_id=p_user for update;
 if not found then raise exception 'Missing wallet'; end if;
 if claimed=(now() at time zone 'utc')::date then raise exception 'Daily crystals already claimed'; end if;
 if credits>9999980 then raise exception 'Wallet limit reached'; end if;
 update public.vertexx_wallets set balance=balance+20,daily_claimed_on=(now() at time zone 'utc')::date,updated_at=now() where user_id=p_user returning balance into credits;
 insert into public.vertexx_crystal_ledger(user_id,amount,reason) values(p_user,20,'daily_claim');
 return credits;
end $$;
create function public.vertexx_owner_grant(p_actor uuid,p_user uuid,p_amount integer) returns void language plpgsql security invoker set search_path='' as $$
begin
 if not exists(select 1 from public.vertexx_member_roles where user_id=p_actor and role='owner') then raise exception 'Owner access required'; end if;
 if p_amount<1 or p_amount>10000 then raise exception 'Grant must be 1-10000 crystals'; end if;
 update public.vertexx_wallets set balance=balance+p_amount,updated_at=now() where user_id=p_user;
 if not found then raise exception 'Unknown member'; end if;
 insert into public.vertexx_crystal_ledger(user_id,amount,reason) values(p_user,p_amount,'owner_grant');
end $$;
revoke all on function public.vertexx_bootstrap(uuid,text),public.vertexx_begin_run(uuid,uuid,text),public.vertexx_finish_run(uuid,uuid,boolean,jsonb),public.vertexx_cancel_run(uuid,uuid),public.vertexx_daily_crystals(uuid),public.vertexx_owner_grant(uuid,uuid,integer) from public,anon,authenticated;
grant execute on function public.vertexx_bootstrap(uuid,text),public.vertexx_begin_run(uuid,uuid,text),public.vertexx_finish_run(uuid,uuid,boolean,jsonb),public.vertexx_cancel_run(uuid,uuid),public.vertexx_daily_crystals(uuid),public.vertexx_owner_grant(uuid,uuid,integer) to service_role;
do $$ declare name text; begin
 foreach name in array array['vertexx_members','vertexx_member_roles','vertexx_wallets','vertexx_scripts','vertexx_script_moderation','vertexx_roblox_links','vertexx_cloud_preferences'] loop
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=name) then
   execute format('alter publication supabase_realtime add table public.%I',name);
  end if;
 end loop;
end $$;

create policy vertexx_script_owner_review on public.vertexx_scripts for select to authenticated
using(visibility='public' and exists(select 1 from public.vertexx_member_roles r where r.user_id=(select auth.uid()) and r.role='owner'));
create function public.vertexx_script_guard() returns trigger language plpgsql security invoker set search_path='' as $$
declare max_count integer;
begin
 if tg_op='INSERT' then
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.author_id::text,0));
  max_count:=case when exists(select 1 from public.vertexx_member_roles where user_id=new.author_id and role='owner') then 1000 else 100 end;
  if (select count(*) from public.vertexx_scripts where author_id=new.author_id)>=max_count then raise exception 'Script upload limit reached';end if;
 end if;
 new.updated_at:=now();return new;
end $$;
revoke all on function public.vertexx_script_guard() from public,anon,authenticated;
create trigger vertexx_script_write_guard before insert or update on public.vertexx_scripts for each row execute function public.vertexx_script_guard();

create index vertexx_moderation_actor on public.vertexx_script_moderation(updated_by);
