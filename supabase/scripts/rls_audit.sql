-- KHCRM Phase 9.4A: RLS Policy Audit Script
-- Prints RLS enabled state and all policies for key tables

-- Section 1: RLS enabled state for each table
SELECT
  c.relname AS tablename,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('leads', 'lead_activity', 'document_email_log', 'documents', 'profiles');

-- Section 2: RLS policy details
SELECT
  p.tablename,
  p.policyname,
  p.cmd,
  p.roles,
  p.qual,
  p.with_check,
  p.permissive
FROM pg_policies p
WHERE p.schemaname = 'public'
  AND p.tablename IN ('leads', 'lead_activity', 'document_email_log', 'documents', 'profiles')
ORDER BY p.tablename, p.policyname, p.cmd;
