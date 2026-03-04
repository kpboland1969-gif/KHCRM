import { NextRequest } from 'next/server';
import { jsonOk, jsonErr, safeErrorMessage } from '@/lib/api/response';
import { createSupabaseServerClient } from '@/lib/supabase/server';

function isUuid(str: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const leadId = id;
  if (!isUuid(leadId)) {
    return jsonErr('Invalid lead id', { status: 400, code: 'VALIDATION_ERROR' });
  }

  const { message } = await req.json();
  if (!message || typeof message !== 'string' || !message.trim() || message.length > 2000) {
    return jsonErr('Note body is required', { status: 400, code: 'VALIDATION_ERROR' });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return jsonErr('Unauthorized', { status: 401, code: 'UNAUTHORIZED' });
  }

  // Confirm lead is accessible (RLS enforced)
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('id')
    .eq('id', leadId)
    .single();
  if (leadError || !lead) {
    return jsonErr('Lead not found', { status: 404, code: 'NOT_FOUND' });
  }

  // Insert note
  try {
    const { error: insertError } = await supabase.from('lead_activity').insert([
      {
        lead_id: leadId,
        type: 'note',
        body: message.trim(),
        user_id: user.id,
      },
    ]);
    if (insertError) {
      // Map forbidden errors if possible
      if (insertError.message && insertError.message.toLowerCase().includes('rls')) {
        return jsonErr('Forbidden', { status: 403, code: 'FORBIDDEN' });
      }
      return jsonErr(safeErrorMessage(insertError), { status: 500, code: 'INTERNAL_ERROR' });
    }
    return jsonOk({});
  } catch (e) {
    return jsonErr(safeErrorMessage(e), { status: 500, code: 'INTERNAL_ERROR' });
  }
}
