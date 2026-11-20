-- Plan it out: database setup for syncing between devices.
-- Paste this whole file into Supabase → SQL Editor → New query, then click Run.
-- It's safe to run more than once.

-- One row per account, holding the whole planner (the same JSON the app keeps in localStorage).
create table if not exists public.planner_data (
  user_id    uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  data       jsonb       not null,
  version    bigint      not null default 1,
  updated_at timestamptz not null default now(),
  constraint planner_data_is_object check (jsonb_typeof(data) = 'object'),
  constraint planner_data_max_size  check (pg_column_size(data) < 1048576)  -- 1 MB, same as backup imports
);

-- Row-level security: each signed-in account can only see and change its own row.
alter table public.planner_data enable row level security;

drop policy if exists "planner_data: read own"   on public.planner_data;
drop policy if exists "planner_data: insert own" on public.planner_data;
drop policy if exists "planner_data: update own" on public.planner_data;

create policy "planner_data: read own" on public.planner_data
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "planner_data: insert own" on public.planner_data
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "planner_data: update own" on public.planner_data
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
-- No delete policy: the app never deletes the row. Deleting your Supabase user removes it (on delete cascade).

-- Signed-out visitors get no access at all; signed-in users only what the policies above allow.
revoke all on public.planner_data from anon;
revoke all on public.planner_data from authenticated;
grant select, insert, update (data) on public.planner_data to authenticated;

-- Every save bumps the version, so two devices can't silently overwrite each other.
create or replace function public.planner_data_bump()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.version    := 1;
    new.updated_at := now();
  else
    new.user_id    := old.user_id;
    new.version    := old.version + 1;
    new.updated_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists planner_data_bump on public.planner_data;
create trigger planner_data_bump
  before insert or update on public.planner_data
  for each row execute function public.planner_data_bump();
