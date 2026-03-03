begin;

-- ============================================================
-- Keep public.profiles.email in sync with auth.users.email
-- - Backfill existing rows
-- - Trigger on auth.users insert/update
-- ============================================================

-- 1) Backfill profiles.email from auth.users.email
update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id
  and (p.email is null or p.email = '');

-- 2) Function: ensure a profile exists + sync email/full_name on auth user changes
create or replace function public.handle_auth_user_upsert_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Upsert profile row
  insert into public.profiles (id, email, full_name, created_at, updated_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', null),
    now(),
    now()
  )
  on conflict (id) do update
    set email = excluded.email,
        -- Only set full_name from auth metadata if profiles.full_name is currently null/empty
        full_name = case
          when public.profiles.full_name is null or public.profiles.full_name = ''
            then excluded.full_name
          else public.profiles.full_name
        end,
        updated_at = now();

  return new;
end;
$$;

-- 3) Trigger: run on auth.users insert
drop trigger if exists on_auth_user_created_sync_profile on auth.users;
create trigger on_auth_user_created_sync_profile
after insert on auth.users
for each row execute procedure public.handle_auth_user_upsert_profile();

-- 4) Trigger: run on auth.users update (email changes, etc.)
drop trigger if exists on_auth_user_updated_sync_profile on auth.users;
create trigger on_auth_user_updated_sync_profile
after update on auth.users
for each row execute procedure public.handle_auth_user_upsert_profile();

commit;
