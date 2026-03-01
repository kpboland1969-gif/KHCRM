-- PHASE 6: Performance, Indexing, Pagination

-- Indexes for leads list queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_assigned_followup_id ON leads (assigned_user_id, follow_up_date, id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_assigned_status_id ON leads (assigned_user_id, status, id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_assigned_industry_id ON leads (assigned_user_id, industry, id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_followup_id ON leads (follow_up_date, id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_created_id ON leads (created_at DESC, id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_company_id ON leads (company_name, id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_lasttouched_id ON leads (last_touched_at, id);

-- Optional: Enable pg_trgm for better ILIKE performance (if allowed)
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_company_trgm ON leads USING gin (lower(company_name) gin_trgm_ops);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_contact_trgm ON leads USING gin (lower(contact_person) gin_trgm_ops);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_email_trgm ON leads USING gin (lower(email) gin_trgm_ops);
