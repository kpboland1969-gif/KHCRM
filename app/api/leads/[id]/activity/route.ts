import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ActivityRow = {
  id: string;
  type: string;
  message: string;
  metadata: any;
  created_at: string;
  created_by: string | null;
  profiles?: { username?: string | null } | { username?: string | null }[] | null;
};

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: leadId } = await context.params;

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("lead_activity")
    .select("id,type,message,metadata,created_at,created_by,profiles(username)")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  const rows = (data ?? []) as ActivityRow[];
  const items = rows.map((a) => {
    const p = Array.isArray(a.profiles) ? a.profiles[0] : a.profiles;
    return { ...a, username: p?.username ?? "—" };
  });

  return NextResponse.json({ ok: true, items });
}
