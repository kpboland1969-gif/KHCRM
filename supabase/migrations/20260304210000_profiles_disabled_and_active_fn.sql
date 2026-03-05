-- Add disabled column to profiles
alter table public.profiles
add column if not exists disabled boolean not null default false;

-- Create is_active_user() helper
create or replace function public.is_active_user()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and coalesce(p.disabled, false) = false
  );
$$;
