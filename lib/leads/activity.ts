import { SupabaseClient } from '@supabase/supabase-js';

const TEN_MIN_MS = 10 * 60 * 1000;

type AnyError = {
  message?: string;
  details?: string | null;
  hint?: string | null;
  code?: string | null;
};

function isMissingColumnError(err: AnyError | null | undefined) {
  // PostgREST common codes/messages when a column doesn't exist:
  // - code "42703" may appear in some contexts
  // - message often includes 'column "<name>" of relation "<table>" does not exist'
  const msg = (err?.message ?? '').toLowerCase();
  const code = (err?.code ?? '').toLowerCase();
  return (
    code === '42703' ||
    msg.includes('does not exist') ||
    msg.includes('column') ||
    msg.includes('schema cache')
  );
}

/**
 * Client/Shared helper for Phase 4 view logging.
 *
 * IMPORTANT:
 * - Newer schema: lead_activity.user_id + body
 * - Older schema (some earlier code): lead_activity.created_by + message + metadata
 *
 * We keep this function backward-compatible to avoid breaking any existing call sites.
 */
export async function logLeadViewIfNeeded(params: {
  supabase: SupabaseClient;
  leadId: string;
  userId: string;
  path?: string;
  userAgent?: string;
}) {
  const { supabase, leadId, userId, path, userAgent } = params;

  // Query last view (user_id only)
  const { data: last, error } = await supabase
    .from('lead_activity')
    .select('created_at')
    .eq('lead_id', leadId)
    .eq('type', 'view')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (last?.created_at) {
    const lastTime = new Date(last.created_at).getTime();
    if (Date.now() - lastTime < TEN_MIN_MS) {
      return; // Too soon, skip logging
    }
  }

  const { error: insertErr } = await supabase.from('lead_activity').insert([
    {
      lead_id: leadId,
      type: 'view',
      body: null,
      user_id: userId,
    },
  ]);

  if (insertErr) {
    throw insertErr;
  }
}
