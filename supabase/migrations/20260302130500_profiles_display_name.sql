-- Phase 4 support: show actor names in lead activity feed
-- We create a public.profiles table keyed by auth.users.id and keep it populated.
-- This avoids querying auth.users from the client and gives us an RLS-friendly place for display names.

begin;

-- 1) Create profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure full_name isn't blank
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_full_name_not_blank'
  ) then
    alter table public.profiles
      add constraint profiles_full_name_not_blank
      check (length(trim(full_name)) > 0);
  end if;
end $$;

-- 2) Keep updated_at current
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_set_updated_at on public.profiles;
create trigger trg_profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

-- 3) Helper: derive a reasonable display name from auth.users
-- Prefer: full_name/name/display_name in raw_user_meta_data
-- Fallback: email (or "User" if missing)
create or replace function public.derive_display_name(u auth.users)
returns text
language sql
stable
as $$
  select coalesce(
    nullif(trim(u.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(u.raw_user_meta_data->>'name'), ''),
    nullif(trim(u.raw_user_meta_data->>'display_name'), ''),
    nullif(trim(u.email), ''),
    'User'
  );
$$;

-- 4) Trigger: auto-create profile row whenever a new auth user is created
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, public.derive_display_name(new))
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_auth_user();

-- 5) Backfill: create profiles for existing auth users
insert into public.profiles (id, email, full_name)
select
  u.id,
  u.email,
  public.derive_display_name(u)
from auth.users u
on conflict (id) do nothing;

-- 6) RLS: allow authenticated users to read profiles (needed for activity feed names)
alter table public.profiles enable row level security;

drop policy if exists "profiles_read_all_authenticated" on public.profiles;
create policy "profiles_read_all_authenticated"
on public.profiles
for select
to authenticated
using (true);

-- Allow users to update their own profile (so John Kendrick can set his name in-app later)
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

commit;
