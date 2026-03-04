import 'server-only';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';

function formatDate(dt: string | null) {
  if (!dt) return '';
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString();
}

function chunk<T>(arr: T[], size: number): T[][] {
  const res: T[][] = [];
  for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size));
  return res;
}

export default async function AnalyticsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return <div className="p-6">Not authenticated</div>;
  }

  // Determine admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('id,full_name,email,is_admin')
    .eq('id', user.id)
    .maybeSingle();
  const isAdmin = !!profile?.is_admin;

  // Scope leads
  const { data: leadsRaw } = await supabase
    .from('leads')
    .select('id,assigned_user_id,follow_up_date,status,company_name,contact_person')
    .limit(500);

  const allLeads = Array.isArray(leadsRaw) ? leadsRaw : [];
  const leads = isAdmin ? allLeads : allLeads.filter((l) => l.assigned_user_id === user.id);

  // If/when the rest of analytics is restored, reintroduce leadIds:

  // Stage counts
  const stageCounts: Record<string, number> = {};
  for (const l of leads) {
    const s = l.status || '(No status)';
    stageCounts[s] = (stageCounts[s] || 0) + 1;
  }
  const sortedStages = Object.entries(stageCounts).sort((a, b) => b[1] - a[1]);

  // ...existing analytics logic from last good version...
}
