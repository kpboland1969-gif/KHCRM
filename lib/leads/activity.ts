import { SupabaseClient } from "@supabase/supabase-js";

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
  const msg = (err?.message ?? "").toLowerCase();
  const code = (err?.code ?? "").toLowerCase();
  return (
    code === "42703" ||
    msg.includes("does not exist") ||
    msg.includes("column") ||
    msg.includes("schema cache")
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

  // 1) Query last view (prefer user_id, fallback to created_by)
  // Try NEW schema first
  {
    const { data: lastNew, error: errNew } = await supabase
      .from("lead_activity")
      .select("created_at")
      .eq("lead_id", leadId)
      .eq("type", "view")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!errNew) {
      if (lastNew?.created_at) {
        const lastTime = new Date(lastNew.created_at).getTime();
        if (Date.now() - lastTime < TEN_MIN_MS) return;
      }

      // Insert NEW schema view row
      const { error: insertErrNew } = await supabase.from("lead_activity").insert([
        {
          lead_id: leadId,
          type: "view",
          body: null,
          user_id: userId,
        },
      ]);

      // If insert succeeded, we're done.
      if (!insertErrNew) return;

      // If insert failed for reasons other than missing columns, don't silently retry old schema.
      if (!isMissingColumnError(insertErrNew as AnyError)) {
        throw insertErrNew;
      }
      // else: fall through to old schema retry
    } else if (!isMissingColumnError(errNew as AnyError)) {
      // Query failed for a real reason (RLS, network, etc.) — surface it.
      throw errNew;
    }
    // else: missing column/table mismatch, fall through to old schema
  }

  // OLD schema fallback: created_by/message/metadata
  const { data: lastOld, error: errOld } = await supabase
    .from("lead_activity")
    .select("created_at")
    .eq("lead_id", leadId)
    .eq("type", "view")
    .eq("created_by", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (errOld) {
    throw errOld;
  }

  if (lastOld?.created_at) {
    const lastTime = new Date(lastOld.created_at).getTime();
    if (Date.now() - lastTime < TEN_MIN_MS) {
      return; // Too soon, skip logging
    }
  }

  const { error: insertErrOld } = await supabase.from("lead_activity").insert([
    {
      lead_id: leadId,
      type: "view",
      message: "Viewed lead",
      metadata: { path: path ?? null, user_agent: userAgent ?? null },
      created_by: userId,
    },
  ]);

  if (insertErrOld) {
    throw insertErrOld;
  }
}
