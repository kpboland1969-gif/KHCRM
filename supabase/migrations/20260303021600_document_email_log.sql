begin;

-- Global document email audit log (recommended)
create table if not exists public.document_email_log (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete set null,
  document_ids uuid[] not null default '{}',
  to_email text not null,
  subject text not null,
  body text not null,
  sent_by uuid references auth.users(id) on delete set null,
  status text not null default 'sent',
  provider_message_id text,
  error text,
  sent_at timestamptz not null default now()
);

create index if not exists idx_document_email_log_sent_at on public.document_email_log(sent_at desc);

alter table public.document_email_log enable row level security;

-- Authenticated can read logs (optional; tighten later if needed)
drop policy if exists "document_email_log_select_authenticated" on public.document_email_log;
create policy "document_email_log_select_authenticated"
on public.document_email_log
for select
to authenticated
using (true);

-- Authenticated can insert their own logs (we insert server-side as authed user anyway)
drop policy if exists "document_email_log_insert_authenticated" on public.document_email_log;
create policy "document_email_log_insert_authenticated"
on public.document_email_log
for insert
to authenticated
with check (auth.uid() is not null);

commit;
