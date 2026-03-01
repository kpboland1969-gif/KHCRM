import { getUserProfile } from '@/lib/getUserProfile';
import { getAssignedLeads } from '@/lib/leads';
import { LeadTable } from '../../components/leads/LeadTable';
import FollowUpBadge from '@/app/components/leads/FollowUpBadge';

export default async function LeadsPage() {
  const profile = await getUserProfile();
  if (!profile) return null;
  const { data: leads } = await getAssignedLeads(profile.id, profile.role);
  // Sort leads: due/overdue first, then upcoming/nulls
  const sortedLeads = (leads || []).slice().sort((a, b) => {
    if (!a.follow_up_date) return 1;
    if (!b.follow_up_date) return -1;
    return new Date(a.follow_up_date).getTime() - new Date(b.follow_up_date).getTime();
  });
  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Leads</h1>
      <LeadTable leads={sortedLeads || []} />
    </div>
  );
}
