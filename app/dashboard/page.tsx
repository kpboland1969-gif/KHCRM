import { getUserProfile } from '@/lib/getUserProfile';
import { getDashboardStats, getAssignedLeads } from '@/lib/leads';
import { StatsCards } from '../components/dashboard/StatsCards';
import { LeadTable } from '../components/leads/LeadTable';
import FollowUpQueue from '@/app/components/leads/FollowUpQueue';

export default async function DashboardPage() {
  const profile = await getUserProfile();
  if (!profile) return null;
  const stats = await getDashboardStats(profile.id, profile.role);
  const { data: leads } = await getAssignedLeads(profile.id, profile.role);
  const topLeads = (leads || []).slice(0, 10);

  return (
    <div className="space-y-8">
      <StatsCards stats={stats} />
      <FollowUpQueue userId={profile.id} role={profile.role} />
      <h2 className="text-lg font-bold mb-2">Top 10 Leads (by Follow-up)</h2>
      <LeadTable leads={topLeads} />
    </div>
  );
}
