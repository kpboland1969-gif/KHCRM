begin;

-- Expand allowed activity types beyond note/view so Phase 4 can log edits.
-- We try to drop any existing CHECK constraint that enforces a limited type set,
-- then add a new constraint with a broader allowed list.

do $$
declare
  r record;
begin
  -- Drop existing CHECK constraints on lead_activity that mention the "type" column
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

-- Add a single canonical constraint for allowed types.
alter table public.lead_activity
  add constraint lead_activity_type_check
  check (type in ('note', 'view', 'status_change', 'followup_change'));

commit;
