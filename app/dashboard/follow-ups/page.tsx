import 'server-only';

import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/getUserProfile';

type FollowUpsPageProps = {
  searchParams?: Promise<{
    scope?: string;
    status?: string;
    q?: string;
  }>;
};

type LeadRow = {
  id: string;
  company_name: string | null;
  contact_person: string | null;
  email: string | null;
  status: string | null;
  follow_up_date: string | null;
  assigned_user_id: string | null;
};

function startOfTodayLocal() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function endOfTodayLocal() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

function classifyFollowUp(value: string | null | undefined) {
  if (!value) return 'none';
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return 'none';

  const start = startOfTodayLocal();
  const end = endOfTodayLocal();

  if (t < start) return 'overdue';
  if (t >= start && t <= end) return 'due_today';
  return 'upcoming';
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

function formatStatusLabel(value: string | null | undefined) {
  if (!value) return 'Unknown';
  return value
    .trim()
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function buildPageUrl(params: { scope: string; status: string; q: string }) {
  const sp = new URLSearchParams();
  if (params.scope) sp.set('scope', params.scope);
  if (params.status) sp.set('status', params.status);
  if (params.q) sp.set('q', params.q);
  const qs = sp.toString();
  return `/dashboard/follow-ups${qs ? `?${qs}` : ''}`;
}

export default async function FollowUpsPage({ searchParams }: FollowUpsPageProps) {
  const resolved = (await searchParams) ?? {};
  const profile = await getUserProfile();

  if (!profile) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold text-white">Follow-ups</h1>
        <p className="mt-3 text-sm text-red-200">
          No dashboard profile could be loaded on the server.
        </p>
      </div>
    );
  }

  const isAdmin = profile.role === 'admin';
  const requestedScope = resolved.scope === 'all' ? 'all' : 'mine';
  const activeScope = isAdmin ? requestedScope : 'mine';
  const activeStatus =
    resolved.status === 'overdue' ||
    resolved.status === 'due_today' ||
    resolved.status === 'upcoming'
      ? resolved.status
      : 'all';
  const q = (resolved.q ?? '').trim();

  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from('leads')
    .select('id,company_name,contact_person,email,status,follow_up_date,assigned_user_id')
    .not('follow_up_date', 'is', null)
    .order('follow_up_date', { ascending: true });

  if (!isAdmin || activeScope === 'mine') {
    query = query.eq('assigned_user_id', profile.id);
  }

  if (q) {
    query = query.or(
      [`company_name.ilike.%${q}%`, `contact_person.ilike.%${q}%`, `email.ilike.%${q}%`].join(','),
    );
  }

  const { data, error } = await query;

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold text-white">Follow-ups</h1>
        <p className="mt-3 text-sm text-red-200">Failed to load follow-ups: {error.message}</p>
      </div>
    );
  }

  const leads = Array.isArray(data) ? (data as LeadRow[]) : [];

  const filtered = leads.filter((lead) => {
    const bucket = classifyFollowUp(lead.follow_up_date);
    if (bucket === 'none') return false;
    if (activeStatus === 'all') return true;
    return bucket === activeStatus;
  });

  const grouped = {
    overdue: filtered.filter((lead) => classifyFollowUp(lead.follow_up_date) === 'overdue'),
    due_today: filtered.filter((lead) => classifyFollowUp(lead.follow_up_date) === 'due_today'),
    upcoming: filtered.filter((lead) => classifyFollowUp(lead.follow_up_date) === 'upcoming'),
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Follow-ups</h1>
      </div>

      <form
        method="GET"
        action="/dashboard/follow-ups"
        className="flex flex-wrap items-center gap-2"
      >
        <select
          name="scope"
          defaultValue={activeScope}
          className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white"
        >
          <option value="mine">Mine</option>
          {isAdmin ? <option value="all">All</option> : null}
        </select>

        <select
          name="status"
          defaultValue={activeStatus}
          className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white"
        >
          <option value="all">All</option>
          <option value="overdue">Overdue</option>
          <option value="due_today">Due Today</option>
          <option value="upcoming">Upcoming</option>
        </select>

        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search company/contact/email"
          className="min-w-[240px] rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40"
        />

        <button
          type="submit"
          className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/15"
        >
          Apply
        </button>

        <Link
          href={buildPageUrl({
            scope: activeScope,
            status: 'all',
            q: '',
          })}
          className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/80 hover:bg-white/[0.08]"
        >
          Clear
        </Link>
      </form>

      {activeStatus === 'all' || activeStatus === 'overdue' ? (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">Overdue</h2>
          {grouped.overdue.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-sm text-white/60">
              No overdue follow-ups.
            </div>
          ) : (
            grouped.overdue.map((lead) => (
              <div
                key={lead.id}
                className="flex items-center justify-between gap-4 rounded-2xl border border-red-400/20 bg-red-500/10 p-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <div className="text-lg font-semibold text-white">
                      {lead.company_name || '—'}
                    </div>
                    <span className="rounded-full bg-red-500/15 px-2 py-1 text-xs font-medium text-red-200">
                      Overdue
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-white/80">
                    Contact: {lead.contact_person || '—'}
                  </div>
                  <div className="text-sm text-white/70">
                    Status: {formatStatusLabel(lead.status)}
                  </div>
                  <div className="text-sm text-white/70">
                    Follow-up: {formatDateTime(lead.follow_up_date)}
                  </div>
                </div>

                <Link
                  href={`/dashboard/leads/${lead.id}`}
                  className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15"
                >
                  View
                </Link>
              </div>
            ))
          )}
        </section>
      ) : null}

      {activeStatus === 'all' || activeStatus === 'due_today' ? (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">Due Today</h2>
          {grouped.due_today.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-sm text-white/60">
              No follow-ups due today.
            </div>
          ) : (
            grouped.due_today.map((lead) => (
              <div
                key={lead.id}
                className="flex items-center justify-between gap-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <div className="text-lg font-semibold text-white">
                      {lead.company_name || '—'}
                    </div>
                    <span className="rounded-full bg-amber-500/15 px-2 py-1 text-xs font-medium text-amber-200">
                      Due Today
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-white/80">
                    Contact: {lead.contact_person || '—'}
                  </div>
                  <div className="text-sm text-white/70">
                    Status: {formatStatusLabel(lead.status)}
                  </div>
                  <div className="text-sm text-white/70">
                    Follow-up: {formatDateTime(lead.follow_up_date)}
                  </div>
                </div>

                <Link
                  href={`/dashboard/leads/${lead.id}`}
                  className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15"
                >
                  View
                </Link>
              </div>
            ))
          )}
        </section>
      ) : null}

      {activeStatus === 'all' || activeStatus === 'upcoming' ? (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">Upcoming</h2>
          {grouped.upcoming.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-sm text-white/60">
              No upcoming follow-ups.
            </div>
          ) : (
            grouped.upcoming.map((lead) => (
              <div
                key={lead.id}
                className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4"
              >
                <div>
                  <div className="text-lg font-semibold text-white">{lead.company_name || '—'}</div>
                  <div className="mt-1 text-sm text-white/80">
                    Contact: {lead.contact_person || '—'}
                  </div>
                  <div className="text-sm text-white/70">
                    Status: {formatStatusLabel(lead.status)}
                  </div>
                  <div className="text-sm text-white/70">
                    Follow-up: {formatDateTime(lead.follow_up_date)}
                  </div>
                </div>

                <Link
                  href={`/dashboard/leads/${lead.id}`}
                  className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15"
                >
                  View
                </Link>
              </div>
            ))
          )}
        </section>
      ) : null}
    </div>
  );
}
