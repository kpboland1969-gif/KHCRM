create extension if not exists pgcrypto;

create table if not exists public.imports (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  uploaded_by uuid references public.profiles(id) on delete set null,
  status text not null default 'uploaded',
  row_count integer not null default 0,
  valid_row_count integer not null default 0,
  invalid_row_count integer not null default 0,
  error_message text,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.import_rows (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.imports(id) on delete cascade,
  row_number integer not null,

  company_name text,
  contact_person text,
  title text,

  email text,
  phone text,
  website text,

  address1 text,
  address2 text,
  city text,
  state text,
  zip text,

  industry text,
  status text,

  assigned_user_id uuid references public.profiles(id) on delete set null,
  follow_up_date timestamptz,

  notes text,

  raw_data jsonb not null default '{}'::jsonb,
  validation_error text,

  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_import_rows_import_id
  on public.import_rows(import_id);

create index if not exists idx_import_rows_import_id_row_number
  on public.import_rows(import_id, row_number);

create index if not exists idx_imports_uploaded_by_created_at
  on public.imports(uploaded_by, created_at desc);

alter table public.imports enable row level security;
alter table public.import_rows enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'imports'
      and policyname = 'imports_admin_all'
  ) then
    create policy imports_admin_all
      on public.imports
      for all
      using (
        exists (
          select 1
          from public.profiles
          where profiles.id = auth.uid()
            and profiles.role = 'admin'
        )
      )
      with check (
        exists (
          select 1
          from public.profiles
          where profiles.id = auth.uid()
            and profiles.role = 'admin'
        )
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'import_rows'
      and policyname = 'import_rows_admin_all'
  ) then
    create policy import_rows_admin_all
      on public.import_rows
      for all
      using (
        exists (
          select 1
          from public.profiles
          where profiles.id = auth.uid()
            and profiles.role = 'admin'
        )
      )
      with check (
        exists (
          select 1
          from public.profiles
          where profiles.id = auth.uid()
            and profiles.role = 'admin'
        )
      );
  end if;
end
$$;
