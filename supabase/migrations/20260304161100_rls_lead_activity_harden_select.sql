-- KHCRM Phase 9.4B: Harden lead_activity SELECT RLS
-- Replace indirect policy with explicit admin/assigned owner check

drop policy if exists "Users can read activity for leads they can read" on public.lead_activity;

create policy "lead_activity_select_scoped"
on public.lead_activity
as permissive
for select
to authenticated
using (
  exists (
    select 1
    from public.leads l
    where l.id = lead_activity.lead_id
      and (
        l.assigned_user_id = auth.uid()
        or exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.is_admin = true
        )
      )
  )
);
