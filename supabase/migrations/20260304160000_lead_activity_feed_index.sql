-- KHCRM Phase 9.3: lead_activity feed index
-- Improves queries for activity feed by lead_id ordered by created_at desc

create index if not exists lead_activity_lead_id_created_at_idx
  on public.lead_activity (lead_id, created_at desc);
