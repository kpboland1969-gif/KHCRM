alter table public.lead_uploaded_documents enable row level security;

drop policy if exists "lead_documents_insert" on public.lead_uploaded_documents;

create policy "lead_documents_insert"
on public.lead_uploaded_documents
for insert
with check (
  uploaded_by = auth.uid()
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and coalesce(profiles.disabled, false) = false
      and (
        profiles.role in ('admin', 'manager')
        or (
          profiles.role = 'user'
          and exists (
            select 1
            from public.leads
            where leads.id = lead_uploaded_documents.lead_id
              and leads.assigned_user_id = auth.uid()
          )
        )
      )
  )
);
