import 'server-only';

import type { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * STRICT Phase 4 schema contract for public.lead_activity:
 * - id (uuid)
 * - lead_id (uuid)
 * - user_id (uuid, nullable)
 * - type (text)  -- at least: 'note', 'view'
 * - body (text, nullable)
 * - created_at (timestamptz)
 *
 * This file MUST NOT reference legacy columns:
 * - metadata
 * - message
 * - created_by
 */

export type LeadActivityRow = {
  id: string;
  lead_id: string;
  user_id: string | null;
  type: string;
  body: string | null;
  created_at: string;
};

export type LeadActivityDisplayRow = LeadActivityRow & {
  actor_label: string; // "You" | "System" | profile name/email | short id
};

type SupabaseServer = Awaited<ReturnType<typeof createSupabaseServerClient>>;

function shortId(id: string) {
  if (!id) return '';
  if (id.length <= 12) return id;
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}

function errToText(err: any) {
  if (!err) return '';
  try {
    const e = err as any;
    return JSON.stringify({
      message: e.message,
      details: e.details,
      hint: e.hint,
      code: e.code,
    });
  } catch {
    try {
      return JSON.stringify(err);
    } catch {
      return String(err);
    }
  }
}

/**
 * Non-throwing server error logger (never breaks rendering).
 */
export function logServerError(prefix: string, error: any) {
  console.error(prefix, errToText(error));
}

/**
 * Fetch lead activity newest-first.
 */
export async function fetchLeadActivity(args: {
  supabase: SupabaseServer;
  leadId: string;
  limit?: number;
}) {
  const { supabase, leadId, limit = 50 } = args;

  const { data, error } = await supabase
    .from('lead_activity')
    .select('id,lead_id,user_id,type,body,created_at')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return { rows: [] as LeadActivityRow[], error };

  const rows: LeadActivityRow[] = (Array.isArray(data) ? data : []).map((r: any) => ({
    id: String(r.id),
    lead_id: String(r.lead_id),
    user_id: r.user_id ? String(r.user_id) : null,
    type: r.type ? String(r.type) : 'unknown',
    body: r.body !== null && r.body !== undefined ? String(r.body) : null,
    created_at: r.created_at ? String(r.created_at) : new Date().toISOString(),
  }));

  return { rows, error: null as any };
}

/**
 * Insert a note into lead_activity.
 */
export async function insertLeadNote(args: {
  supabase: SupabaseServer;
  leadId: string;
  userId: string;
  body: string;
}) {
  const { supabase, leadId, userId, body } = args;

  const { error } = await supabase.from('lead_activity').insert({
    lead_id: leadId,
    user_id: userId,
    type: 'note',
    body,
  });

  return { error: error ?? null };
}

/**
 * Log a view event with a dedupe window per (lead_id, user_id).
 * Returns { error } but never throws.
 */
export async function logLeadViewIfNeededServer(args: {
  supabase: SupabaseServer;
  leadId: string;
  userId: string;
  dedupeMinutes?: number;
}) {
  const { supabase, leadId, userId, dedupeMinutes = 10 } = args;

  const cutoff = new Date(Date.now() - dedupeMinutes * 60 * 1000).toISOString();

  const { data: recent, error: recentError } = await supabase
    .from('lead_activity')
    .select('id')
    .eq('lead_id', leadId)
    .eq('user_id', userId)
    .eq('type', 'view')
    .gte('created_at', cutoff)
    .order('created_at', { ascending: false })
    .limit(1);

  if (recentError) return { error: recentError };

  if (Array.isArray(recent) && recent.length > 0) {
    return { error: null as any };
  }

  const { error: insertError } = await supabase.from('lead_activity').insert({
    lead_id: leadId,
    user_id: userId,
    type: 'view',
    body: null,
  });

  return { error: insertError ?? null };
}

/**
 * Optional: Map user ids -> human labels via profiles.
 * If profiles doesn't exist or is blocked by RLS, falls back to short ids.
 */
export async function getActorLabelMap(args: { supabase: SupabaseServer; userIds: string[] }) {
  const { supabase } = args;
  const ids = Array.from(new Set(args.userIds.filter(Boolean)));

  const map = new Map<string, string>();
  if (ids.length === 0) return map;

  for (const id of ids) map.set(id, shortId(id));

  const { data, error } = await supabase
    .from('profiles')
    .select('id,full_name,email')
    .in('id', ids);

  if (error) return map;

  for (const row of Array.isArray(data) ? (data as any[]) : []) {
    const id = row?.id ? String(row.id) : '';
    if (!id) continue;

    const fullName = row?.full_name ? String(row.full_name).trim() : '';
    const email = row?.email ? String(row.email).trim() : '';

    map.set(id, fullName || email || shortId(id));
  }

  return map;
}

/**
 * Attach actor_label onto each activity row:
 * - null user_id => "System"
 * - current user => "You"
 * - else => profile name/email/short id
 */
export function attachActorLabels(args: {
  rows: LeadActivityRow[];
  currentUserId: string;
  labelMap: Map<string, string>;
}) {
  const { rows, currentUserId, labelMap } = args;

  const out: LeadActivityDisplayRow[] = rows.map((r) => {
    if (!r.user_id) return { ...r, actor_label: 'System' };
    if (r.user_id === currentUserId) return { ...r, actor_label: 'You' };
    return { ...r, actor_label: labelMap.get(r.user_id) ?? shortId(r.user_id) };
  });

  return out;
}
