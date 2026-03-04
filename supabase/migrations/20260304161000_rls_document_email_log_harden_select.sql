-- KHCRM Phase 9.4B: Harden document_email_log SELECT RLS
-- Remove open select policy and scope to admin or assigned lead owner

drop policy if exists "document_email_log_select_authenticated" on public.document_email_log;

create policy "document_email_log_select_scoped"
on public.document_email_log
as permissive
for select
to authenticated
using (
  exists (
    select 1
    from public.leads l
    where l.id = document_email_log.lead_id
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
