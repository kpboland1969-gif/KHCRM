import { getUserProfile } from '@/lib/getUserProfile';
import { getAssignedLeads } from '@/lib/leads';
import { LeadTable } from '../../components/leads/LeadTable';

export default async function LeadsPage() {
  const profile = await getUserProfile();
  if (!profile) return null;
  const { data: leads } = await getAssignedLeads(profile.id, profile.role);
  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Leads</h1>
      <LeadTable leads={leads || []} />
    </div>
  );
}
