-- KHCRM Phase 9.4B: Standardize admin SELECT on is_admin for leads
-- Add admin select policy using is_admin = true

create policy "leads_select_admin_is_admin"
on public.leads
as permissive
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_admin = true
  )
);
