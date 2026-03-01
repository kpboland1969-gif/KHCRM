-- PHASE 4: Documents Library + Email

-- Table: documents
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  storage_path text not null unique,
  content_type text,
  size_bytes bigint,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

-- Table: lead_documents (optional, for tracking selections)
create table if not exists lead_documents (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete cascade,
  document_id uuid references documents(id) on delete cascade,
  selected_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

-- Indexes
create index if not exists idx_documents_created_at on documents(created_at desc);
create index if not exists idx_lead_documents_lead_id on lead_documents(lead_id);

-- Enable RLS
alter table documents enable row level security;
alter table lead_documents enable row level security;

-- RLS for documents
create policy "Authenticated can select documents" on documents
  for select using (auth.role() = 'authenticated');
create policy "Admin can insert/update/delete documents" on documents
  for all using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- RLS for lead_documents
create policy "User can select/insert for assigned leads" on lead_documents
  for all using (
    exists (
      select 1 from leads where id = lead_id and (assigned_user_id = auth.uid() or exists (select 1 from profiles where id = auth.uid() and role = 'admin'))
    )
  );
