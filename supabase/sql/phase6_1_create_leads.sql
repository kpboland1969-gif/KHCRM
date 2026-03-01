-- PHASE 6.1: Create Leads table (sales CRM only)

create extension if not exists "pgcrypto";

-- Leads table
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),

  -- Ownership / assignment
  assigned_user_id uuid null,

  -- Required lead identity fields
  company_name text not null,
  contact_person text not null,
  title text null,
  phone text null,
  email text null,
  website text null,

  -- Address fields
  address1 text null,
  address2 text null,
  city text null,
  state text null,
  zip text null,

  -- Dropdowns
  industry text not null check (industry in ('construction', 'subcontractor', 'manufacturing', 'wholesale')),
  status text not null check (status in ('new_lead', 'email_campaign', 'warm_lead', 'assessment_stage', 'onboarding', 'client')) default 'new_lead',

  -- Follow-up workflow
  follow_up_date timestamptz null,
  last_touched_at timestamptz null,

  -- Audit timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Basic updated_at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_leads_updated_at on public.leads;
create trigger trg_leads_updated_at
before update on public.leads
for each row execute function public.set_updated_at();

-- Helpful indexes (non-concurrently for Supabase SQL editor safety)
create index if not exists idx_leads_assigned_user on public.leads (assigned_user_id);
create index if not exists idx_leads_follow_up_date on public.leads (follow_up_date);
create index if not exists idx_leads_created_at on public.leads (created_at desc);

-- RLS on (you can tighten later; minimum needed so app isn't wide open)
alter table public.leads enable row level security;

-- Policy: users can read their assigned leads; admins handled at app layer for now
-- NOTE: This assumes you are using auth.uid() and storing assigned_user_id = auth.uid().
drop policy if exists "leads_select_assigned" on public.leads;
create policy "leads_select_assigned"
on public.leads for select
using (assigned_user_id = auth.uid());

-- Policy: allow insert if assigning to self (admin insert can be done via service role later)
drop policy if exists "leads_insert_self" on public.leads;
create policy "leads_insert_self"
on public.leads for insert
with check (assigned_user_id = auth.uid());

-- Policy: allow update if assigned to self
drop policy if exists "leads_update_assigned" on public.leads;
create policy "leads_update_assigned"
on public.leads for update
using (assigned_user_id = auth.uid())
with check (assigned_user_id = auth.uid());
