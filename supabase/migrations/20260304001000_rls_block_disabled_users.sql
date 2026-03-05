-- Update RLS policies to block disabled users using is_active_user()
-- Example for leads table

-- Drop and recreate policies as needed

-- leads: allow assigned user if active
drop policy if exists leads_select_own on public.leads;
create policy leads_select_own on public.leads
  for select
  using (public.is_active_user() AND assigned_user_id = auth.uid());

-- leads: allow admin if active
-- (repeat for other tables as needed)
drop policy if exists leads_select_admin on public.leads;
create policy leads_select_admin on public.leads
  for select
  using (public.is_active_user() AND is_admin());

-- profiles: allow read all authenticated if active
-- (repeat for other tables as needed)
drop policy if exists profiles_read_all_authenticated on public.profiles;
create policy profiles_read_all_authenticated on public.profiles
  for select
  using (public.is_active_user());

-- profiles: allow select own if active
-- (repeat for other tables as needed)
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select
  using (public.is_active_user() AND id = auth.uid());

-- profiles: allow update own if active
-- (repeat for other tables as needed)
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update
  using (public.is_active_user() AND auth.uid() = id)
  with check (public.is_active_user() AND auth.uid() = id);

-- Repeat similar updates for lead_activity, document_email_log, documents, etc.
-- Make sure all policies AND in public.is_active_user() for user access.
