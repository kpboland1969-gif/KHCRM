import "server-only";

import type { createSupabaseServerClient } from "@/lib/supabase/server";

export type LeadActivityType = "note" | "view";

export type LeadActivityRow = {
  id: string;
  lead_id: string;
  user_id: string | null;
  type: LeadActivityType | string;
  body: string | null;
  created_at: string;
};

export type LeadActivityDisplayRow = LeadActivityRow & {
  actor_label: string; // "You", profile name/email, short id, or "System"
};

type SupabaseServer = Awaited<ReturnType<typeof createSupabaseServerClient>>;

function shortId(id: string) {
  if (!id) return "";
  if (id.length <= 12) return id;
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}

function errToText(err: any) {
  if (!err) return "";
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
 * Phase 4 contract (explicit):
 * Table: public.lead_activity
 * Columns: id, lead_id, user_id, type, body, created_at
 */
export async function fetchLeadActivity(args: {
  supabase: SupabaseServer;
  leadId: string;
  limit?: number;
}) {
  const { supabase, leadId, limit = 50 } = args;

  const { data, error } = await supabase
    .from("lead_activity")
    .select("id,lead_id,user_id,type,body,created_at")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return { rows: [] as LeadActivityRow[], error };

  const rows: LeadActivityRow[] = (Array.isArray(data) ? data : []).map((r: any) => ({
    id: String(r.id),
    lead_id: String(r.lead_id),
    user_id: r.user_id ? String(r.user_id) : null,
    type: r.type ? String(r.type) : "unknown",
    body: r.body ? String(r.body) : null,
    created_at: r.created_at ? String(r.created_at) : new Date().toISOString(),
  }));

  return { rows, error: null as any };
}

export async function insertLeadNote(args: {
  supabase: SupabaseServer;
  leadId: string;
  userId: string;
  body: string;
}) {
  const { supabase, leadId, userId, body } = args;

  const { error } = await supabase.from("lead_activity").insert({
    lead_id: leadId,
    user_id: userId,
    type: "note",
    body,
  });

  return { error: error ?? null };
}

/**
 * Log a view event with 10-minute dedupe per (lead_id, user_id).
 * Never throws; returns error so caller can log without breaking the page.
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
    .from("lead_activity")
    .select("id")
    .eq("lead_id", leadId)
    .eq("user_id", userId)
    .eq("type", "view")
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(1);

  if (recentError) return { error: recentError };

  if (Array.isArray(recent) && recent.length > 0) {
    return { error: null as any };
  }

  const { error: insertError } = await supabase.from("lead_activity").insert({
    lead_id: leadId,
    user_id: userId,
    type: "view",
    body: null,
  });

  return { error: insertError ?? null };
}

/**
 * Actor labels:
 * - If profiles table exists and is readable, use profiles.full_name or profiles.email.
 * - Otherwise fall back to short user ids.
 *
 * (We avoid introducing new schema here; profiles can be formalized later if needed.)
 */
export async function getActorLabelMap(args: {
  supabase: SupabaseServer;
  userIds: string[];
}) {
  const { supabase } = args;

  const ids = Array.from(new Set(args.userIds.filter(Boolean)));
  const map = new Map<string, string>();

  if (ids.length === 0) return map;

  // Default to short ids
  for (const id of ids) map.set(id, shortId(id));

  const { data, error } = await supabase.from("profiles").select("id,full_name,email").in("id", ids);

  if (error) {
    // profiles missing or RLS denied — return short ids map
    return map;
  }

  for (const row of Array.isArray(data) ? (data as any[]) : []) {
    const id = row?.id ? String(row.id) : "";
    if (!id) continue;
    const fullName = row?.full_name ? String(row.full_name).trim() : "";
    const email = row?.email ? String(row.email).trim() : "";
    map.set(id, fullName || email || shortId(id));
  }

  return map;
}

export function attachActorLabels(args: {
  rows: LeadActivityRow[];
  currentUserId: string;
  labelMap: Map<string, string>;
}) {
  const { rows, currentUserId, labelMap } = args;

  const out: LeadActivityDisplayRow[] = rows.map((r) => {
    if (!r.user_id) return { ...r, actor_label: "System" };
    if (r.user_id === currentUserId) return { ...r, actor_label: "You" };
    return { ...r, actor_label: labelMap.get(r.user_id) ?? shortId(r.user_id) };
  });

  return out;
}

export function logServerError(prefix: string, error: any) {
  // eslint-disable-next-line no-console
  console.error(prefix, errToText(error));
}
