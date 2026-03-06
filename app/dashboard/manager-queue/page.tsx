import 'server-only';

import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/getUserProfile';

type LeadRow = {
  id: string;
  company_name: string | null;
  contact_person: string | null;
  status: string | null;
  follow_up_date: string | null;
  assigned_user_id: string | null;
};

function startOfTodayLocal() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function isOverdue(value: string | null | undefined) {
  if (!value) return false;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() < startOfTodayLocal().getTime();
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString();
}

function formatStatusLabel(value: string | null | undefined) {
  if (!value) return 'Unknown';
  return value
    .trim()
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

export default async function ManagerQueuePage() {
  const profile = await getUserProfile();

  if (!profile) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold text-white">Missed Follow-Ups (Manager Queue)</h1>
        <p className="mt-3 text-sm text-red-200">
          No dashboard profile could be loaded on the server.
        </p>
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();
  const isAdmin = profile.role === 'admin';

  let leadsQuery = supabase
    .from('leads')
    .select('id,company_name,contact_person,status,follow_up_date,assigned_user_id')
    .not('follow_up_date', 'is', null)
    .order('follow_up_date', { ascending: true });

  if (!isAdmin) {
    leadsQuery = leadsQuery.eq('assigned_user_id', profile.id);
  }

  const { data, error } = await leadsQuery;

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold text-white">Missed Follow-Ups (Manager Queue)</h1>
        <p className="mt-3 text-sm text-red-200">
          Failed to load missed follow-ups: {error.message}
        </p>
      </div>
    );
  }

  const leads = Array.isArray(data) ? (data as LeadRow[]) : [];

  const overdueLeads = leads
    .filter((lead) => isOverdue(lead.follow_up_date))
    .filter((lead) => {
      const status = (lead.status ?? '').trim().toLowerCase();
      return !['closed', 'won', 'lost', 'archived'].includes(status);
    });

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Missed Follow-Ups (Manager Queue)</h1>
        <p className="mt-1 text-sm text-white/60">
          {isAdmin ? 'All overdue follow-ups across the CRM.' : 'Your overdue assigned follow-ups.'}
        </p>
      </div>

      {overdueLeads.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <p className="text-sm text-white/80">No missed follow-ups.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
          <table className="min-w-full divide-y divide-white/10">
            <thead className="bg-white/[0.04]">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-white/70">Company</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-white/70">Contact</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-white/70">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-white/70">Follow-up</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-white/70">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 bg-white/[0.02]">
              {overdueLeads.map((lead) => (
                <tr key={lead.id}>
                  <td className="px-4 py-3 text-sm text-white/90">{lead.company_name || '—'}</td>
                  <td className="px-4 py-3 text-sm text-white/70">{lead.contact_person || '—'}</td>
                  <td className="px-4 py-3 text-sm text-white/70">
                    {formatStatusLabel(lead.status)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className="rounded-full bg-red-500/15 px-2 py-1 text-xs font-medium text-red-200">
                      {formatDate(lead.follow_up_date)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <Link
                      href={`/dashboard/leads/${lead.id}`}
                      className="inline-flex items-center rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white hover:bg-white/[0.08]"
                    >
                      Open Lead
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
