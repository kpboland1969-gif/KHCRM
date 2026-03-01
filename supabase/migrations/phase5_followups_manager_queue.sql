-- PHASE 5: Follow-Up Engine, Manager Queue, Missed Follow-Up Reporting

-- 1. Add last_touched_at and last_touched_by to leads
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS last_touched_at timestamptz,
ADD COLUMN IF NOT EXISTS last_touched_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Backfill last_touched_at for existing leads
UPDATE leads SET last_touched_at = created_at WHERE last_touched_at IS NULL;

-- 3. Create missed_followups view
CREATE OR REPLACE VIEW missed_followups AS
SELECT
  l.id AS lead_id,
  l.assigned_user_id,
  l.company_name,
  l.follow_up_date,
  l.last_touched_at,
  GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (now() - l.follow_up_date)) / 86400)) AS days_overdue,
  (l.follow_up_date < now() AND (l.last_touched_at IS NULL OR l.last_touched_at < l.follow_up_date)) AS missed
FROM leads l
WHERE l.follow_up_date IS NOT NULL;

-- 4. RLS: Allow manager to select missed followups
-- (Assumes profiles table with role, and leads.assigned_user_id)
-- Policy: managers can select leads where missed_followups.missed = true
-- (RLS policies must be updated in leads table, not in view)
-- Example (add to leads RLS):
-- CREATE POLICY "Managers can select missed followups" ON leads
--   FOR SELECT USING (
--     EXISTS (
--       SELECT 1 FROM profiles p
--       WHERE p.id = auth.uid() AND p.role = 'manager'
--     )
--     AND (EXISTS (
--       SELECT 1 FROM missed_followups mf
--       WHERE mf.lead_id = leads.id AND mf.missed = true
--     ))
--   );
-- (Admins can select all, users can select assigned leads as before)
