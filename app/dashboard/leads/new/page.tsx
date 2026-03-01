import { getUserProfile } from '@/lib/getUserProfile';
import { createLead } from '@/lib/leads';
import { LeadForm } from '../../../components/leads/LeadForm';
import { redirect } from 'next/navigation';

export default async function NewLeadPage() {

  const profile = await getUserProfile();
  if (!profile) return null;

  async function handleCreateLead(data: any) {
    if (!profile) return;
    const { data: lead } = await createLead({ ...data, assigned_user_id: profile.id });
    if (lead) {
      redirect(`/dashboard/leads/${lead.id}`);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Create New Lead</h1>
      <LeadForm onSubmit={handleCreateLead} />
    </div>
  );
}
