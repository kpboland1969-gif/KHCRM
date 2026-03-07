alter table public.leads enable row level security;

drop policy if exists leads_insert_admin on public.leads;

create policy leads_insert_admin
  on public.leads
  for insert
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
        and coalesce(profiles.disabled, false) = false
    )
  );
