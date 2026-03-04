import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: leadId } = await params;
  const supabase = await createSupabaseServerClient();

  // Authenticate user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
  }

  // Confirm lead is accessible
  const { data: lead, error: leadErr } = await supabase
    .from('leads')
    .select('id')
    .eq('id', leadId)
    .maybeSingle();
  if (leadErr) {
    return NextResponse.json({ ok: false, error: leadErr.message }, { status: 500 });
  }
  if (!lead) {
    return NextResponse.json(
      { ok: false, error: 'Lead not found or access denied' },
      { status: 404 },
    );
  }

  // Query document_email_log for recent sends
  const { data: logs, error: logsErr } = await supabase
    .from('document_email_log')
    .select('document_ids,sent_at,to_email,status,error')
    .eq('lead_id', leadId)
    .order('sent_at', { ascending: false })
    .limit(200);

  if (logsErr) {
    return NextResponse.json({ ok: false, error: logsErr.message }, { status: 500 });
  }

  // Build last sent map
  const lastSentByDocumentId: Record<string, { sent_at: string; to_email: string | null }> = {};
  for (const row of logs ?? []) {
    if (!row.sent_at) continue;
    if (row.status && row.status.toLowerCase() !== 'sent') continue;
    if (row.error) continue;
    const docIds = Array.isArray(row.document_ids) ? row.document_ids : [];
    for (const docId of docIds) {
      const key = String(docId);
      if (!lastSentByDocumentId[key]) {
        lastSentByDocumentId[key] = {
          sent_at: row.sent_at,
          to_email: row.to_email ?? null,
        };
      }
    }
  }

  return NextResponse.json({ lastSentByDocumentId });
}
