import { getUserProfile, UserRole } from '@/lib/getUserProfile';
import { getDashboardStats, getAssignedLeads } from '@/lib/leads';
import { StatsCards } from '../components/dashboard/StatsCards';
import FollowUpQueue from '@/app/components/leads/FollowUpQueue';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const profile = await getUserProfile();

  if (!profile) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
        <p className="mt-3 text-sm text-red-200">
          No dashboard profile could be loaded on the server.
        </p>
        <p className="mt-2 text-xs text-white/50">
          Auth succeeded far enough to reach /dashboard, but profile lookup returned null.
        </p>
      </div>
    );
  }

  const stats = await getDashboardStats(profile.id, profile.role);
  const { data: leads } = await getAssignedLeads(profile.id, profile.role);
  const topLeads = (leads || []).slice(0, 10);

  const assignedIds = Array.from(
    new Set(
      topLeads.map((lead) => lead.assigned_user_id).filter((id): id is string => Boolean(id)),
    ),
  );

  const profileById: Record<string, string> = {};

  if (assignedIds.length > 0) {
    const supabase = await createSupabaseServerClient();

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, username, email')
      .in('id', assignedIds);

    if (Array.isArray(profiles)) {
      for (const assigneeProfile of profiles) {
        profileById[assigneeProfile.id] =
          assigneeProfile.full_name ||
          assigneeProfile.username ||
          assigneeProfile.email ||
          'Unassigned';
      }
    }
  }

  return (
    <div className="space-y-8">
      <StatsCards stats={stats} />
      <FollowUpQueue userId={profile.id} role={profile.role as UserRole} />

      <div>
        <h2 className="mb-2 text-lg font-bold">Top 10 Leads (by Follow-up)</h2>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th>Company</th>
                <th>Contact</th>
                <th>Status</th>
                <th>Follow-up</th>
              </tr>
            </thead>
            <tbody>
              {topLeads.map((lead) => {
                const overdue = lead.follow_up_date && new Date(lead.follow_up_date) < new Date();

                const assignee = lead.assigned_user_id
                  ? profileById[lead.assigned_user_id] || 'Unassigned'
                  : 'Unassigned';

                return (
                  <tr key={lead.id} className={overdue ? 'bg-[#f7b26722]' : ''}>
                    <td className="font-semibold">
                      <a
                        href={`/dashboard/leads/${lead.id}`}
                        className="text-blue-700 hover:underline"
                      >
                        {lead.company_name}
                      </a>
                      <div className="mt-1 text-xs text-white/60">Assigned: {assignee}</div>
                    </td>
                    <td>{lead.contact_person}</td>
                    <td>{lead.status?.replace('_', ' ')}</td>
                    <td>
                      {lead.follow_up_date
                        ? new Date(lead.follow_up_date).toLocaleDateString()
                        : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
