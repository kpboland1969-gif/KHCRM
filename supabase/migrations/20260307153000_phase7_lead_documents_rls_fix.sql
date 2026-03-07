alter table public.lead_uploaded_documents enable row level security;

drop policy if exists "lead_documents_select" on public.lead_uploaded_documents;
drop policy if exists "lead_documents_insert" on public.lead_uploaded_documents;
drop policy if exists "lead_documents_delete" on public.lead_uploaded_documents;

create policy "lead_documents_select"
on public.lead_uploaded_documents
for select
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and coalesce(profiles.disabled, false) = false
      and profiles.role in ('admin', 'manager')
  )
  or exists (
    select 1
    from public.leads
    join public.profiles
      on profiles.id = auth.uid()
    where leads.id = lead_uploaded_documents.lead_id
      and leads.assigned_user_id = auth.uid()
      and coalesce(profiles.disabled, false) = false
      and profiles.role = 'user'
  )
);

create policy "lead_documents_insert"
on public.lead_uploaded_documents
for insert
with check (
  auth.uid() is not null
);

create policy "lead_documents_delete"
on public.lead_uploaded_documents
for delete
using (
  uploaded_by = auth.uid()
  or exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and coalesce(profiles.disabled, false) = false
      and profiles.role in ('admin', 'manager')
  )
);
