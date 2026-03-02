import { SupabaseClient } from "@supabase/supabase-js";

const TEN_MIN_MS = 10 * 60 * 1000;

export async function logLeadViewIfNeeded(params: {
  supabase: SupabaseClient;
  leadId: string;
  userId: string;
  path?: string;
  userAgent?: string;
}) {
  const { supabase, leadId, userId, path, userAgent } = params;

  // 1. Query for last view
  const { data: last, error } = await supabase
    .from("lead_activity")
    .select("created_at")
    .eq("lead_id", leadId)
    .eq("type", "view")
    .eq("created_by", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (last && last.created_at) {
    const lastTime = new Date(last.created_at).getTime();
    if (Date.now() - lastTime < TEN_MIN_MS) {
      return; // Too soon, skip logging
    }
  }

  // 2. Insert new view log
  await supabase.from("lead_activity").insert([
    {
      lead_id: leadId,
      type: "view",
      message: "Viewed lead",
      metadata: { path: path ?? null, user_agent: userAgent ?? null },
      created_by: userId,
    },
  ]);
}
