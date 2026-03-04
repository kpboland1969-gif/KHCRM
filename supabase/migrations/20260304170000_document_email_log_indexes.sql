-- KHCRM Phase 9.7: document_email_log indexing for performance

-- Optimize Email History panel queries (by lead, newest first)
CREATE INDEX IF NOT EXISTS idx_document_email_log_lead_sent_at_desc
ON public.document_email_log (lead_id, sent_at DESC);

-- Optimize analytics and user-based queries (by sender, newest first)
CREATE INDEX IF NOT EXISTS idx_document_email_log_sent_by_sent_at_desc
ON public.document_email_log (sent_by, sent_at DESC);
