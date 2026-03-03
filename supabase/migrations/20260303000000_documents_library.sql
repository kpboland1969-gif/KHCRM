-- PHASE 5 FOUNDATION: Reusable Document Library (private bucket)
-- Goal:
-- - Store files in a private bucket
-- - Only admins can upload/update/delete
-- - Any authenticated user can view/download
-- - Documents are NOT tied to a lead (reusable library)

-- 0) Helper admin check (works with either role='admin' OR is_admin=true)
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (coalesce(p.is_admin,false) = true or p.role = 'admin')
  );
$$;

-- 1) Table: documents (library metadata)
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  storage_bucket text not null default 'documents_library',
  storage_path text not null unique,
  content_type text,
  size_bytes bigint,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_documents_created_at on public.documents(created_at desc);

alter table public.documents enable row level security;

-- 2) RLS: documents
-- Everyone logged in can list/read document metadata
drop policy if exists "documents_select_authenticated" on public.documents;
create policy "documents_select_authenticated"
on public.documents
for select
using (auth.role() = 'authenticated');

-- Only admins can insert
drop policy if exists "documents_insert_admin" on public.documents;
create policy "documents_insert_admin"
on public.documents
for insert
with check (public.is_admin());

-- Only admins can update
drop policy if exists "documents_update_admin" on public.documents;
create policy "documents_update_admin"
on public.documents
for update
using (public.is_admin())
with check (public.is_admin());

-- Only admins can delete
drop policy if exists "documents_delete_admin" on public.documents;
create policy "documents_delete_admin"
on public.documents
for delete
using (public.is_admin());

-- 3) Storage bucket: documents_library (private)
-- Note: in Supabase, you can create bucket via SQL by inserting into storage.buckets
insert into storage.buckets (id, name, public)
values ('documents_library', 'documents_library', false)
on conflict (id) do update set public = false;

-- 4) Storage RLS policies (storage.objects)
-- Allow authenticated users to read/download objects in documents_library
drop policy if exists "documents_library_read_authenticated" on storage.objects;
create policy "documents_library_read_authenticated"
on storage.objects
for select
using (
  bucket_id = 'documents_library'
  and auth.role() = 'authenticated'
);

-- Allow only admins to upload objects to documents_library
drop policy if exists "documents_library_insert_admin" on storage.objects;
create policy "documents_library_insert_admin"
on storage.objects
for insert
with check (
  bucket_id = 'documents_library'
  and public.is_admin()
);

-- Allow only admins to update objects in documents_library
drop policy if exists "documents_library_update_admin" on storage.objects;
create policy "documents_library_update_admin"
on storage.objects
for update
using (
  bucket_id = 'documents_library'
  and public.is_admin()
)
with check (
  bucket_id = 'documents_library'
  and public.is_admin()
);

-- Allow only admins to delete objects in documents_library
drop policy if exists "documents_library_delete_admin" on storage.objects;
create policy "documents_library_delete_admin"
on storage.objects
for delete
using (
  bucket_id = 'documents_library'
  and public.is_admin()
);