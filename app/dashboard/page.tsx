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
          No server-side session found. You appear to be signed out on the server.
        </p>
      </div>
    );
  }
  const stats = await getDashboardStats(profile.id, profile.role);
  const { data: leads } = await getAssignedLeads(profile.id, profile.role);
  const topLeads = (leads || []).slice(0, 10);

  return (
    <div className="space-y-8">
      <StatsCards stats={stats} />
      <FollowUpQueue userId={profile.id} role={profile.role as UserRole} />
      <h2 className="text-lg font-bold mb-2">Top 10 Leads (by Follow-up)</h2>
      <LeadTable leads={topLeads} />
    </div>
  );
}
