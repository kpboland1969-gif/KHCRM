-- Harden RLS policies to block disabled users via public.is_active_user()
-- For each table, drop and recreate policies with public.is_active_user() added

-- leads
DROP POLICY IF EXISTS leads_select_own ON public.leads;
CREATE POLICY leads_select_own ON public.leads
  FOR SELECT USING (public.is_active_user() AND assigned_user_id = auth.uid());

DROP POLICY IF EXISTS leads_update_own ON public.leads;
CREATE POLICY leads_update_own ON public.leads
  FOR UPDATE USING (public.is_active_user() AND assigned_user_id = auth.uid())
  WITH CHECK (public.is_active_user() AND assigned_user_id = auth.uid());

-- lead_activity
DROP POLICY IF EXISTS lead_activity_select_own ON public.lead_activity;
CREATE POLICY lead_activity_select_own ON public.lead_activity
  FOR SELECT USING (public.is_active_user() AND lead_id IN (SELECT id FROM leads WHERE assigned_user_id = auth.uid()));

DROP POLICY IF EXISTS lead_activity_insert_own ON public.lead_activity;
CREATE POLICY lead_activity_insert_own ON public.lead_activity
  FOR INSERT WITH CHECK (public.is_active_user() AND lead_id IN (SELECT id FROM leads WHERE assigned_user_id = auth.uid()));

-- document_email_log
DROP POLICY IF EXISTS document_email_log_select_own ON public.document_email_log;
CREATE POLICY document_email_log_select_own ON public.document_email_log
  FOR SELECT USING (public.is_active_user() AND user_id = auth.uid());

-- documents
DROP POLICY IF EXISTS documents_select_own ON public.documents;
CREATE POLICY documents_select_own ON public.documents
  FOR SELECT USING (public.is_active_user() AND user_id = auth.uid());

DROP POLICY IF EXISTS documents_insert_own ON public.documents;
CREATE POLICY documents_insert_own ON public.documents
  FOR INSERT WITH CHECK (public.is_active_user() AND user_id = auth.uid());

-- profiles
DROP POLICY IF EXISTS profiles_read_all_authenticated ON public.profiles;
CREATE POLICY profiles_read_all_authenticated ON public.profiles
  FOR SELECT USING (public.is_active_user());

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE USING (public.is_active_user() AND auth.uid() = id)
  WITH CHECK (public.is_active_user() AND auth.uid() = id);
