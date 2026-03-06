import 'server-only';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import FollowUpsFiltersClient from '@/components/followups/FollowUpsFiltersClient';

function formatDate(dt: string | null) {
  if (!dt) return '';
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString();
}

export default async function FollowUpsPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
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

  // Query params
  const scope = isAdmin ? (searchParams.scope === 'all' ? 'all' : 'mine') : 'mine';
  const range = searchParams.range ?? 'all';
  const q = (searchParams.q ?? '').trim().toLowerCase();
  const assignee = isAdmin ? (searchParams.assignee ?? undefined) : undefined;

  // Build filters
  let leadsQuery = supabase
    .from('leads')
    .select('*')
    .not('follow_up_date', 'is', null)
    .order('follow_up_date', { ascending: true })
    .limit(200);

  if (!isAdmin) {
    leadsQuery = leadsQuery.eq('assigned_user_id', user.id);
  } else if (scope === 'mine') {
    leadsQuery = leadsQuery.eq('assigned_user_id', user.id);
  } else if (assignee) {
    leadsQuery = leadsQuery.eq('assigned_user_id', assignee);
  }

  const { data: leadsRaw, error: leadsErr } = await leadsQuery;
  if (leadsErr) {
    return <div className="p-6">Error loading leads: {leadsErr.message}</div>;
  }
  let leads = Array.isArray(leadsRaw) ? leadsRaw : [];

  // Range filter
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const next7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const next30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  leads = leads.filter((lead) => {
    const dt = lead.follow_up_date;
    if (!dt) return false;
    const d = new Date(dt);
    if (range === 'overdue') return d < now;
    if (range === 'today') return d.toISOString().slice(0, 10) === todayStr;
    if (range === 'next7') return d > now && d <= next7;
    if (range === 'next30') return d > now && d <= next30;
    return true;
  });

  // Search filter
  if (q) {
    leads = leads.filter((lead) => {
      return (
        (lead.company_name ?? '').toLowerCase().includes(q) ||
        (lead.contact_person ?? '').toLowerCase().includes(q) ||
        (lead.email ?? '').toLowerCase().includes(q)
      );
    });
  }

  // Assigned user label mapping (admin view)
  const userLabels: Record<string, string> = {};
  if (isAdmin && (scope === 'all' || assignee)) {
    const userIds = Array.from(new Set(leads.map((l) => l.assigned_user_id).filter(Boolean)));
    if (userIds.length > 0) {
      const { data: profilesRaw } = await supabase
        .from('profiles')
        .select('id,full_name,email')
        .in('id', userIds);
      if (Array.isArray(profilesRaw)) {
        for (const p of profilesRaw) {
          userLabels[p.id] = p.full_name || p.email || p.id;
        }
      }
    }
  }

  // Bucketing
  const overdue = [];
  const today = [];
  const upcoming = [];
  for (const lead of leads) {
    const d = new Date(lead.follow_up_date);
    if (d < now) overdue.push(lead);
    else if (d.toISOString().slice(0, 10) === todayStr) today.push(lead);
    else upcoming.push(lead);
  }

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-semibold">Follow-ups</h1>
      <FollowUpsFiltersClient
        isAdmin={isAdmin}
        scope={scope}
        range={range}
        search={q}
        assignee={assignee}
      />
      <div className="space-y-8">
        {[
          { label: 'Overdue', items: overdue, badge: 'Overdue', color: 'bg-red-500/10' },
          { label: 'Today', items: today, badge: 'Today', color: 'bg-yellow-400/10' },
          { label: 'Upcoming', items: upcoming, badge: 'Upcoming', color: 'bg-emerald-500/10' },
        ].map(({ label, items, badge, color }) =>
          items.length > 0 ? (
            <div key={label}>
              <div className="text-lg font-semibold mb-2">{label}</div>
              <div className="space-y-2">
                {items.map((lead) => (
                  <div
                    key={lead.id}
                    className={`rounded-xl border border-white/10 ${color} p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white/90">
                          {lead.company_name || '(No company)'}
                        </span>
                        <span className="inline-block rounded bg-white/10 px-2 py-0.5 text-xs text-white/60">
                          {badge}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-white/80">
                        Contact: {lead.contact_person || '(No contact)'}
                      </div>
                      <div className="mt-1 text-xs text-white/80">
                        Status: {lead.status || '(No status)'}
                      </div>
                      <div className="mt-1 text-xs text-white/80">
                        Follow-up: {formatDate(lead.follow_up_date)}
                      </div>
                      {isAdmin && (scope === 'all' || assignee) ? (
                        <div className="mt-1 text-xs text-white/80">
                          Assigned: {userLabels[lead.assigned_user_id] || lead.assigned_user_id}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex-shrink-0">
                      <Link
                        href={`/dashboard/leads/${lead.id}`}
                        className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.08] px-3 py-1 text-xs font-medium text-white hover:bg-white/[0.15]"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null,
        )}
      </div>
    </div>
  );
}
