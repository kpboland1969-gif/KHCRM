-- Phase 11: Leads schema sync / consolidation
-- Safe, non-destructive standardization pass.
-- This migration keeps old columns in place for now and backfills canonical columns
-- only when legacy columns exist.

alter table public.leads
  add column if not exists contact_person text;

alter table public.leads
  add column if not exists assigned_user_id uuid references public.profiles(id) on delete set null;

alter table public.leads
  add column if not exists follow_up_date timestamptz;

alter table public.leads
  add column if not exists address1 text;

alter table public.leads
  add column if not exists address2 text;

alter table public.leads
  add column if not exists website text;

alter table public.leads
  add column if not exists updated_at timestamptz default now();

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'leads'
      and column_name = 'contact_name'
  ) then
    update public.leads
    set contact_person = contact_name
    where contact_person is null
      and contact_name is not null;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'leads'
      and column_name = 'assigned_to'
  ) then
    update public.leads
    set assigned_user_id = assigned_to
    where assigned_user_id is null
      and assigned_to is not null;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'leads'
      and column_name = 'followup_at'
  ) then
    update public.leads
    set follow_up_date = followup_at
    where follow_up_date is null
      and followup_at is not null;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'leads'
      and column_name = 'followup_date'
  ) then
    update public.leads
    set follow_up_date = followup_date
    where follow_up_date is null
      and followup_date is not null;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'leads'
      and column_name = 'address_1'
  ) then
    update public.leads
    set address1 = address_1
    where address1 is null
      and address_1 is not null;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'leads'
      and column_name = 'address_2'
  ) then
    update public.leads
    set address2 = address_2
    where address2 is null
      and address_2 is not null;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'leads'
      and column_name = 'url'
  ) then
    update public.leads
    set website = url
    where website is null
      and url is not null;
  end if;
end
$$;

create index if not exists idx_leads_assigned_user_id
  on public.leads (assigned_user_id);

create index if not exists idx_leads_follow_up_date
  on public.leads (follow_up_date);

create index if not exists idx_leads_status
  on public.leads (status);

create index if not exists idx_leads_company_name
  on public.leads (company_name);

create index if not exists idx_leads_contact_person
  on public.leads (contact_person);
