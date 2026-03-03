begin;

-- Expand lead_activity allowed types to include email events.
-- We drop any existing type check constraints that mention "type" then re-add.

do $$
declare
  r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'lead_activity'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%type%'
  loop
    execute format('alter table public.lead_activity drop constraint if exists %I', r.conname);
  end loop;
end $$;

alter table public.lead_activity
  add constraint lead_activity_type_check
  check (type in ('note', 'view', 'status_change', 'followup_change', 'email_sent'));

commit;
