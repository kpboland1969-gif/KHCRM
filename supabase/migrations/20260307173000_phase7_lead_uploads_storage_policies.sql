-- Phase 7: Storage policies for lead-specific uploaded documents
-- Bucket: lead_uploads

insert into storage.buckets (id, name, public)
values ('lead_uploads', 'lead_uploads', false)
on conflict (id) do nothing;

drop policy if exists "lead_uploads_select" on storage.objects;
drop policy if exists "lead_uploads_insert" on storage.objects;
drop policy if exists "lead_uploads_delete" on storage.objects;

create policy "lead_uploads_select"
on storage.objects
for select
using (
  bucket_id = 'lead_uploads'
  and auth.uid() is not null
);

create policy "lead_uploads_insert"
on storage.objects
for insert
with check (
  bucket_id = 'lead_uploads'
  and auth.uid() is not null
);

create policy "lead_uploads_delete"
on storage.objects
for delete
using (
  bucket_id = 'lead_uploads'
  and auth.uid() is not null
);
