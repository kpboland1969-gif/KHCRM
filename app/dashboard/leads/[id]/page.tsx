import { getUserProfile } from '@/lib/getUserProfile';
import { getLeadById } from '@/lib/leads';
import { getLeadNotes, addSystemNote } from '@/lib/notes';
import NotesPanel from '../../../components/leads/NotesPanel';

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const profile = await getUserProfile();
  if (!profile) return null;
  const { data: lead } = await getLeadById(params.id, profile.id, profile.role);
  if (!lead) return <div>Lead not found</div>;

  // Add system note on view
  await addSystemNote(lead.id, profile.id, `Lead accessed by ${profile.username}`);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div>
        <div className="mb-4">
          <h2 className="text-lg font-bold mb-2">{lead.company_name}</h2>
          <div className="mb-2">Contact: {lead.contact_person} ({lead.contact_title})</div>
          <div className="mb-2">Phone: {lead.phone}</div>
          <div className="mb-2">Email: {lead.email}</div>
          <div className="mb-2">Website: {lead.website}</div>
          <div className="mb-2">Address: {lead.address_line1} {lead.address_line2}, {lead.city}, {lead.state} {lead.zip}</div>
          <div className="mb-2">Industry: {lead.industry}</div>
          <div className="mb-2">Status: {lead.status.replace('_', ' ')}</div>
          <div className="mb-2">Follow-up: {lead.follow_up_date ? new Date(lead.follow_up_date).toLocaleDateString() : '-'}</div>
        </div>
      </div>
      <div>
        <NotesPanel leadId={lead.id} userId={profile.id} username={profile.username} />
      </div>
    </div>
  );
}
