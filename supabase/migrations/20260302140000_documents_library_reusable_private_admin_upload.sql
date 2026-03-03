begin;

-- ============================================================
-- Phase 5: Reusable Document Library (private bucket)
-- Requirements:
-- - Reusable document objects (uploaded once, attach to many leads)
-- - Storage bucket is private
-- - Only admins can upload/attach/delete
-- - All authenticated users can access documents linked to leads they can access
-- ============================================================

-- 0) Ensure profiles has is_admin (minimal RBAC primitive)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'is_admin'
  ) then
    alter table public.profiles add column is_admin boolean not null default false;
  end if;
end $$;

-- 1) Helper function to check admin status
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

-- 2) Documents table (reusable library)
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  storage_path text not null unique,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- 3) Pivot table: attach documents to leads (many-to-many)
create table if not exists public.lead_document_links (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  added_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (lead_id, document_id)
);

create index if not exists idx_lead_document_links_lead_id
  on public.lead_document_links(lead_id);

create index if not exists idx_lead_document_links_document_id
  on public.lead_document_links(document_id);

-- 4) RLS: documents
alter table public.documents enable row level security;

-- View: authenticated users can see docs ONLY if linked to a lead they can access
-- (lead access is enforced by leads RLS when referenced in EXISTS)
drop policy if exists "documents_select_linked_to_accessible_leads" on public.documents;
create policy "documents_select_linked_to_accessible_leads"
on public.documents
for select
to authenticated
using (
  exists (
    select 1
    from public.lead_document_links ldl
    join public.leads l on l.id = ldl.lead_id
    where ldl.document_id = public.documents.id
  )
);

-- Only admins can insert/update/delete document records
drop policy if exists "documents_admin_insert" on public.documents;
create policy "documents_admin_insert"
on public.documents
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "documents_admin_update" on public.documents;
create policy "documents_admin_update"
on public.documents
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "documents_admin_delete" on public.documents;
create policy "documents_admin_delete"
on public.documents
for delete
to authenticated
using (public.is_admin());

-- 5) RLS: lead_document_links
alter table public.lead_document_links enable row level security;

-- Anyone authenticated can view links for leads they can access
drop policy if exists "lead_document_links_select_accessible_leads" on public.lead_document_links;
create policy "lead_document_links_select_accessible_leads"
on public.lead_document_links
for select
to authenticated
using (
  exists (
    select 1
    from public.leads l
    where l.id = public.lead_document_links.lead_id
  )
);

-- Only admins can attach/detach documents to leads
drop policy if exists "lead_document_links_admin_insert" on public.lead_document_links;
create policy "lead_document_links_admin_insert"
on public.lead_document_links
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "lead_document_links_admin_delete" on public.lead_document_links;
create policy "lead_document_links_admin_delete"
on public.lead_document_links
for delete
to authenticated
using (public.is_admin());

-- 6) Storage bucket (private)
-- Uses the storage schema installed by Supabase.
insert into storage.buckets (id, name, public)
values ('lead-documents', 'lead-documents', false)
on conflict (id) do update set public = false;

-- 7) Storage policies (storage.objects is RLS-protected)
-- NOTE: These policies rely on documents.storage_path = storage.objects.name.
-- We will store objects in bucket 'lead-documents' with name = documents.storage_path.

-- Allow authenticated users to download/view objects ONLY if linked to an accessible lead
drop policy if exists "lead_documents_objects_select_linked" on storage.objects;
create policy "lead_documents_objects_select_linked"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'lead-documents'
  and exists (
    select 1
    from public.documents d
    join public.lead_document_links ldl on ldl.document_id = d.id
    join public.leads l on l.id = ldl.lead_id
    where d.storage_path = storage.objects.name
  )
);

-- Allow admins to upload objects to the bucket
drop policy if exists "lead_documents_objects_insert_admin" on storage.objects;
create policy "lead_documents_objects_insert_admin"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'lead-documents'
  and public.is_admin()
);

-- Allow admins to update objects (rare; mostly not needed but included)
drop policy if exists "lead_documents_objects_update_admin" on storage.objects;
create policy "lead_documents_objects_update_admin"
on storage.objects
for update
to authenticated
using (bucket_id = 'lead-documents' and public.is_admin())
with check (bucket_id = 'lead-documents' and public.is_admin());

-- Allow admins to delete objects
drop policy if exists "lead_documents_objects_delete_admin" on storage.objects;
create policy "lead_documents_objects_delete_admin"
on storage.objects
for delete
to authenticated
using (bucket_id = 'lead-documents' and public.is_admin());

commit;
