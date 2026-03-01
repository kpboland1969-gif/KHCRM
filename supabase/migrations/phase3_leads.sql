-- PHASE 3: Sales Leads System

-- Table: leads
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  assigned_user_id uuid references auth.users(id) on delete set null,
  company_name text not null,
  contact_person text not null,
  contact_title text,
  phone text,
  email text,
  website text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  zip text,
  industry text check (industry in ('construction','subcontractor','manufacturing','wholesale')),
  status text check (status in ('new_lead','email_campaign','warm_lead','assessment_stage','onboarding','client')) default 'new_lead',
  follow_up_date timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Table: lead_notes
create table if not exists lead_notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  type text not null check (type in ('system','manual','email','document')),
  content text not null,
  created_at timestamp with time zone default now()
);

-- Indexes
create index if not exists idx_leads_assigned_user_id on leads(assigned_user_id);
create index if not exists idx_leads_follow_up_date on leads(follow_up_date);

-- Enable RLS
alter table leads enable row level security;
alter table lead_notes enable row level security;

-- RLS Policies for leads
-- SELECT: Users can select their own, admins can select all
create policy "Users can select their assigned leads" on leads
  for select using (assigned_user_id = auth.uid() or exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  ));

-- INSERT: Only admin can insert with arbitrary assigned_user_id, users only for themselves
create policy "Admin can insert any lead" on leads
  for insert with check (exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  ));
create policy "User can insert own assigned lead" on leads
  for insert with check (assigned_user_id = auth.uid());

-- UPDATE: Users can update their own, admins can update all
create policy "User can update own assigned lead" on leads
  for update using (assigned_user_id = auth.uid());
create policy "Admin can update any lead" on leads
  for update using (exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  ));

-- RLS Policies for lead_notes
-- SELECT: Users can select notes for leads they have access to, admins can select all
create policy "User can select notes for assigned leads" on lead_notes
  for select using (exists (
    select 1 from leads where id = lead_id and (assigned_user_id = auth.uid() or exists (
      select 1 from profiles where id = auth.uid() and role = 'admin'
    ))
  ));

-- INSERT: Users can insert notes only for leads they are assigned to, admins can insert all
create policy "User can insert note for assigned lead" on lead_notes
  for insert with check (exists (
    select 1 from leads where id = lead_id and (assigned_user_id = auth.uid() or exists (
      select 1 from profiles where id = auth.uid() and role = 'admin'
    ))
  ));
