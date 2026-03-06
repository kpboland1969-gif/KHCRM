// import { LeadTable } from '../components/leads/LeadTable';
const profileById: Record<string, string> = {};
// import { LeadTable } from '../components/leads/LeadTable';
import { getUserProfile } from '@/lib/getUserProfile';
import { getDashboardStats, getAssignedLeads } from '@/lib/leads';
import { StatsCards } from '../components/dashboard/StatsCards';
import { LeadTable } from '../components/leads/LeadTable';
import FollowUpQueue from '@/app/components/leads/FollowUpQueue';
import { UserRole } from '@/lib/getUserProfile';

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

  // Fetch assignee info for top leads
  const assignedIds = Array.from(new Set(topLeads.map((l) => l.assigned_user_id).filter(Boolean)));
  const profileById: Record<string, string> = {};
  if (assignedIds.length > 0) {
    const supabase = await import('@/lib/supabase/server');
    const client = await supabase.createSupabaseServerClient();
    const { data: profiles } = await client
      .from('profiles')
      .select('id,full_name,username,email')
      .in('id', assignedIds);
    if (Array.isArray(profiles)) {
      for (const p of profiles) {
        profileById[p.id] = p.full_name || p.username || p.email || 'Unassigned';
      }
    }
  }

  return (
    <div className="space-y-8">
      <StatsCards stats={stats} />
      <FollowUpQueue userId={profile.id} role={profile.role as UserRole} />
      <h2 className="text-lg font-bold mb-2">Top 10 Leads (by Follow-up)</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              <th>Company</th>
              <th>Contact</th>
              <th>Status</th>
              <th>Follow-up</th>
              <th>Assigned To</th>
            </tr>
          </thead>
          <tbody>
            {topLeads.map((lead) => {
              const overdue = lead.follow_up_date && new Date(lead.follow_up_date) < new Date();
              return (
                <tr key={lead.id} className={overdue ? 'bg-[#f7b26722]' : ''}>
                  <td className="font-semibold">
                    <a
                      href={`/dashboard/leads/${lead.id}`}
                      className="hover:underline text-blue-700"
                    >
                      {lead.company_name}
                    </a>
                  </td>
                  <td>{lead.contact_person}</td>
                  <td>{lead.status?.replace('_', ' ')}</td>
                  <td>
                    {lead.follow_up_date ? new Date(lead.follow_up_date).toLocaleDateString() : '-'}
                  </td>
                  <td>{profileById[lead.assigned_user_id] ?? 'Unassigned'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
