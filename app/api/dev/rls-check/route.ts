import 'server-only';
import { NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { jsonOk, jsonErr } from '@/lib/api/response';

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return jsonErr('Unauthorized', { status: 401, code: 'UNAUTHORIZED' });
  }
  const userId = user.id;
  const results: any = { userId };

  // Query 1: leads visible count
  try {
    const { data: leads, error: leadsErr } = await supabase
      .from('leads')
      .select('id, assigned_user_id')
      .limit(50);
    results.leadsCount = Array.isArray(leads) ? leads.length : 0;
    results.leadIds = Array.isArray(leads) ? leads.map((l) => l.id) : [];
    if (leadsErr) results.leadsError = leadsErr.message;
  } catch (err: any) {
    results.leadsError = err.message || 'Query error';
  }

  // Query 2: lead_activity visible count
  try {
    const { data: activity, error: activityErr } = await supabase
      .from('lead_activity')
      .select('id, lead_id, type, created_at')
      .limit(50);
    results.activityCount = Array.isArray(activity) ? activity.length : 0;
    if (activityErr) results.activityError = activityErr.message;
  } catch (err: any) {
    results.activityError = err.message || 'Query error';
  }

  // Query 3: document_email_log visible count
  try {
    const { data: emailLog, error: emailLogErr } = await supabase
      .from('document_email_log')
      .select('id, lead_id, to_email, sent_at, status, error')
      .limit(50);
    results.emailLogCount = Array.isArray(emailLog) ? emailLog.length : 0;
    if (emailLogErr) results.emailLogError = emailLogErr.message;
  } catch (err: any) {
    results.emailLogError = err.message || 'Query error';
  }

  // Query 4: explicit lead check
  const { searchParams } = new URL(req.url);
  const leadId = searchParams.get('leadId');
  if (leadId) {
    try {
      const { data: explicitLead, error: explicitLeadErr } = await supabase
        .from('leads')
        .select('id, assigned_user_id')
        .eq('id', leadId)
        .limit(1)
        .maybeSingle();
      results.explicitLeadCheck = {
        leadId,
        found: !!explicitLead,
      };
      if (explicitLeadErr) results.explicitLeadCheckError = explicitLeadErr.message;
    } catch (err: any) {
      results.explicitLeadCheckError = err.message || 'Query error';
    }
  }

  return jsonOk(results);
}
