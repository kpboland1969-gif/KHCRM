import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile?.is_admin) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }
  const { id: leadId } = await params;
  const body = await req.json().catch(() => null);
  const assigned_user_id = body?.assigned_user_id ?? null;

  // Step 1: Fetch current assigned_user_id
  const { data: lead, error: leadErr } = await supabase
    .from('leads')
    .select('assigned_user_id')
    .eq('id', leadId)
    .maybeSingle();
  if (leadErr || !lead) {
    return NextResponse.json({ ok: false, error: 'Lead not found' }, { status: 404 });
  }
  const oldAssignedUserId = lead.assigned_user_id;

  // Step 2: Perform assignment update
  let updateErr;
  if (oldAssignedUserId !== assigned_user_id) {
    // Assignment changed: update both assigned_user_id and last_touched_at
    const { error } = await supabase
      .from('leads')
      .update({ assigned_user_id, last_touched_at: new Date().toISOString() })
      .eq('id', leadId);
    updateErr = error;
  } else {
    // Assignment unchanged: only update assigned_user_id (no-op, but preserves logic)
    const { error } = await supabase.from('leads').update({ assigned_user_id }).eq('id', leadId);
    updateErr = error;
  }
  if (updateErr) {
    return NextResponse.json({ ok: false, error: updateErr.message }, { status: 500 });
  }

  // Step 3: Audit trail if changed
  if (oldAssignedUserId !== assigned_user_id) {
    try {
      // Prepare ids for profile lookup
      const idsToLookup = [oldAssignedUserId, assigned_user_id].filter(Boolean);
      const profilesMap: Record<string, any> = {};
      if (idsToLookup.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, username, email')
          .in('id', idsToLookup);
        if (profiles) {
          profiles.forEach((p: any) => {
            profilesMap[p.id] = p;
          });
        }
      }
      // Helper to get display name
      function displayName(id: string | null): string {
        if (!id) return 'None';
        const p = profilesMap[id];
        if (!p) return id.slice(0, 8);
        return p.full_name || p.username || p.email || id.slice(0, 8);
      }
      const oldName = displayName(oldAssignedUserId);
      const newName = displayName(assigned_user_id);
      let activityBody = '';
      if (assigned_user_id) {
        activityBody = `Assigned lead to ${newName} (from ${oldName})`;
      } else {
        activityBody = `Unassigned lead (from ${oldName})`;
      }
      // Insert lead_activity
      const { error: activityErr } = await supabase.from('lead_activity').insert({
        lead_id: leadId,
        user_id: user.id,
        type: 'assignment_changed',
        body: activityBody,
      });
      if (activityErr) {
        console.error('Failed to log assignment change activity:', activityErr.message);
      }
    } catch (err) {
      console.error('Error logging assignment change activity:', err);
    }
  }

  // Step 4: Return unchanged payload
  return NextResponse.json({ ok: true });
}
