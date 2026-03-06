import 'server-only';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/getUserProfile';

type LeadRow = {
  id: string;
  company_name: string | null;
  contact_person: string | null;
  status: string | null;
  follow_up_date: string | null;
  assigned_user_id: string | null;
  created_at?: string | null;
};

type ActivityRow = {
  id: string;
  lead_id: string;
  type: string | null;
  created_at: string | null;
};

function startOfTodayIso() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
}

function endOfTodayIso() {
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  return now.toISOString();
}

function normalizeStatus(value: string | null | undefined) {
  if (!value) return 'unknown';
  return value.trim().toLowerCase();
}

function formatStatusLabel(value: string) {
  return value
    .split('_')
    .join(' ')
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString();
}

function isOverdue(value: string | null | undefined) {
  if (!value) return false;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() < new Date(startOfTodayIso()).getTime();
}

function isDueToday(value: string | null | undefined) {
  if (!value) return false;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;
  const start = new Date(startOfTodayIso()).getTime();
  const end = new Date(endOfTodayIso()).getTime();
  return d.getTime() >= start && d.getTime() <= end;
}

function StatCard(props: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="text-sm text-white/60">{props.label}</div>
      <div className="mt-2 text-3xl font-semibold text-white">{props.value}</div>
      {props.hint ? <div className="mt-2 text-xs text-white/40">{props.hint}</div> : null}
    </div>
  );
}

function SectionCard(props: { title: string; children: React.ReactNode; subtitle?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">{props.title}</h2>
          {props.subtitle ? <p className="mt-1 text-sm text-white/50">{props.subtitle}</p> : null}
        </div>
      </div>
      <div className="mt-5">{props.children}</div>
    </div>
  );
}

export default async function AnalyticsPage() {
  const profile = await getUserProfile();

  if (!profile) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold text-white">Analytics</h1>
        <p className="mt-3 text-sm text-red-200">
          No dashboard profile could be loaded on the server.
        </p>
        <p className="mt-2 text-xs text-white/50">
          This page requires a valid signed-in profile before analytics can load.
        </p>
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();
  const isAdmin = profile.role === 'admin';

  let leadsQuery = supabase
    .from('leads')
    .select('id,company_name,contact_person,status,follow_up_date,assigned_user_id,created_at')
    .order('follow_up_date', { ascending: true, nullsFirst: false });

  if (!isAdmin) {
    leadsQuery = leadsQuery.eq('assigned_user_id', profile.id);
  }

  const { data: leadsData, error: leadsError } = await leadsQuery;

  if (leadsError) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold text-white">Analytics</h1>
        <p className="mt-3 text-sm text-red-200">
          Failed to load leads analytics: {leadsError.message}
        </p>
      </div>
    );
  }

  const leads = Array.isArray(leadsData) ? (leadsData as LeadRow[]) : [];
  const leadIds = leads.map((lead) => lead.id);

  let activity: ActivityRow[] = [];
  if (leadIds.length > 0) {
    const { data: activityData, error: activityError } = await supabase
      .from('lead_activity')
      .select('id,lead_id,type,created_at')
      .in('lead_id', leadIds)
      .order('created_at', { ascending: false })
      .limit(500);

    if (activityError) {
      return (
        <div className="p-6">
          <h1 className="text-2xl font-semibold text-white">Analytics</h1>
          <p className="mt-3 text-sm text-red-200">
            Failed to load activity analytics: {activityError.message}
          </p>
        </div>
      );
    }

    activity = Array.isArray(activityData) ? (activityData as ActivityRow[]) : [];
  }

  const totalLeads = leads.length;
  const overdueCount = leads.filter((lead) => isOverdue(lead.follow_up_date)).length;
  const dueTodayCount = leads.filter((lead) => isDueToday(lead.follow_up_date)).length;
  const assignedCount = leads.filter((lead) => !!lead.assigned_user_id).length;

  const statusCounts = new Map<string, number>();
  for (const lead of leads) {
    const key = normalizeStatus(lead.status);
    statusCounts.set(key, (statusCounts.get(key) ?? 0) + 1);
  }

  const statusRows = Array.from(statusCounts.entries())
    .map(([status, count]) => ({
      status,
      count,
      pct: totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const activityCounts = new Map<string, number>();
  for (const row of activity) {
    const key = normalizeStatus(row.type);
    activityCounts.set(key, (activityCounts.get(key) ?? 0) + 1);
  }

  const activityRows = Array.from(activityCounts.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  const topFollowUps = [...leads]
    .filter((lead) => !!lead.follow_up_date)
    .sort((a, b) => {
      const av = a.follow_up_date ? new Date(a.follow_up_date).getTime() : Number.MAX_SAFE_INTEGER;
      const bv = b.follow_up_date ? new Date(b.follow_up_date).getTime() : Number.MAX_SAFE_INTEGER;
      return av - bv;
    })
    .slice(0, 10);

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Analytics</h1>
        <p className="mt-1 text-sm text-white/60">
          {isAdmin
            ? 'Organization-wide lead and activity metrics.'
            : 'Your assigned lead and activity metrics.'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Leads" value={totalLeads} />
        <StatCard label="Due Today" value={dueTodayCount} />
        <StatCard label="Overdue" value={overdueCount} />
        <StatCard
          label="Assigned"
          value={assignedCount}
          hint={isAdmin ? 'Across all users' : 'Assigned to you'}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionCard
          title="Lead Status Breakdown"
          subtitle={
            totalLeads === 0 ? 'No leads available yet.' : 'Distribution of current lead statuses.'
          }
        >
          {statusRows.length === 0 ? (
            <div className="text-sm text-white/60">No status data available yet.</div>
          ) : (
            <div className="space-y-3">
              {statusRows.map((row) => (
                <div key={row.status}>
                  <div className="mb-1 flex items-center justify-between gap-4">
                    <span className="text-sm text-white/80">{formatStatusLabel(row.status)}</span>
                    <span className="text-sm text-white/60">
                      {row.count} ({row.pct}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10">
                    <div
                      className="h-2 rounded-full bg-white/70"
                      style={{ width: `${row.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Activity Types"
          subtitle={
            activityRows.length === 0 ? 'No activity yet.' : 'Recent activity volume by type.'
          }
        >
          {activityRows.length === 0 ? (
            <div className="text-sm text-white/60">No activity data available yet.</div>
          ) : (
            <div className="space-y-3">
              {activityRows.map((row) => (
                <div
                  key={row.type}
                  className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3"
                >
                  <span className="text-sm text-white/80">{formatStatusLabel(row.type)}</span>
                  <span className="text-sm font-medium text-white">{row.count}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Upcoming Follow-ups"
        subtitle="Nearest scheduled follow-ups based on your access scope."
      >
        {topFollowUps.length === 0 ? (
          <div className="text-sm text-white/60">No scheduled follow-ups found.</div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-white/10">
            <table className="min-w-full divide-y divide-white/10">
              <thead className="bg-white/[0.04]">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-white/70">Company</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-white/70">Contact</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-white/70">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-white/70">
                    Follow-up
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-white/70">State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 bg-white/[0.02]">
                {topFollowUps.map((lead) => {
                  const state = isOverdue(lead.follow_up_date)
                    ? 'Overdue'
                    : isDueToday(lead.follow_up_date)
                      ? 'Due today'
                      : 'Scheduled';

                  return (
                    <tr key={lead.id}>
                      <td className="px-4 py-3 text-sm text-white/90">
                        {lead.company_name || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-white/70">
                        {lead.contact_person || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-white/70">
                        {formatStatusLabel(normalizeStatus(lead.status))}
                      </td>
                      <td className="px-4 py-3 text-sm text-white/70">
                        {formatDate(lead.follow_up_date)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={
                            state === 'Overdue'
                              ? 'rounded-full bg-red-500/15 px-2 py-1 text-xs font-medium text-red-200'
                              : state === 'Due today'
                                ? 'rounded-full bg-amber-500/15 px-2 py-1 text-xs font-medium text-amber-200'
                                : 'rounded-full bg-white/10 px-2 py-1 text-xs font-medium text-white/70'
                          }
                        >
                          {state}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
