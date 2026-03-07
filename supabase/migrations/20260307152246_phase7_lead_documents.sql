-- Lead-specific uploaded documents
-- These are NOT part of the reusable document library.

create table if not exists public.lead_uploaded_documents (
  id uuid primary key default gen_random_uuid(),

  lead_id uuid not null
    references public.leads(id)
    on delete cascade,

  filename text not null,
  storage_bucket text not null default 'lead_uploads',
  storage_path text not null,

  content_type text,
  size_bytes bigint,

  uploaded_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null default now()
);

create index if not exists idx_lead_uploaded_documents_lead
on public.lead_uploaded_documents (lead_id);

create index if not exists idx_lead_uploaded_documents_created
on public.lead_uploaded_documents (created_at desc);

-- Enable RLS
alter table public.lead_uploaded_documents enable row level security;

-- Allow users who can see the lead to see documents
create policy "lead_documents_select"
on public.lead_uploaded_documents
for select
using (
  exists (
    select 1
    from public.leads
    where leads.id = lead_uploaded_documents.lead_id
  )
);

-- Allow upload
create policy "lead_documents_insert"
on public.lead_uploaded_documents
for insert
with check (auth.uid() is not null);

-- Allow delete by uploader OR admin
create policy "lead_documents_delete"
on public.lead_uploaded_documents
for delete
using (
  uploaded_by = auth.uid()
  or exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  )
);
