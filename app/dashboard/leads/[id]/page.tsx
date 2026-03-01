import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getLeadById } from '@/lib/server/leads/getLeadById';
import { LeadRow } from '@/types/leads';

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const lead = await getLeadById(params.id);
  if (!lead) return notFound();

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">{lead.company_name}</h1>
          <span className="inline-block px-2 py-1 text-xs rounded bg-gray-100 text-gray-700">
            {lead.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
          </span>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/leads" className="underline text-sm">Back to Leads</Link>
          <Link href={`/dashboard/leads/${lead.id}/edit`} className="underline text-sm">Edit</Link>
          {/* Add Follow-up button (Phase 7.5) */}
        </div>
      </div>

      {/* Two-column grid for details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white rounded shadow p-6">
        <div>
          <div className="mb-2"><span className="font-semibold">Contact:</span> {lead.contact_person}</div>
          {lead.title && <div className="mb-2"><span className="font-semibold">Title:</span> {lead.title}</div>}
          {lead.phone && <div className="mb-2"><span className="font-semibold">Phone:</span> {lead.phone}</div>}
          {lead.email && <div className="mb-2"><span className="font-semibold">Email:</span> {lead.email}</div>}
          {lead.website && <div className="mb-2"><span className="font-semibold">Website:</span> {lead.website}</div>}
        </div>
        <div>
          {lead.address1 && <div className="mb-2"><span className="font-semibold">Address 1:</span> {lead.address1}</div>}
          {lead.address2 && <div className="mb-2"><span className="font-semibold">Address 2:</span> {lead.address2}</div>}
          {lead.city && <div className="mb-2"><span className="font-semibold">City:</span> {lead.city}</div>}
          {lead.state && <div className="mb-2"><span className="font-semibold">State:</span> {lead.state}</div>}
          {lead.zip && <div className="mb-2"><span className="font-semibold">Zip:</span> {lead.zip}</div>}
          <div className="mb-2"><span className="font-semibold">Industry:</span> {lead.industry}</div>
        </div>
      </div>

      {/* Activity summary */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-2">Activity</h2>
        <div className="mb-1"><span className="font-semibold">Last touched:</span> {lead.last_touched_at ? new Date(lead.last_touched_at).toLocaleString() : 'Never'}</div>
        <div className="mb-1"><span className="font-semibold">Next follow-up:</span> {lead.follow_up_date ? new Date(lead.follow_up_date).toLocaleString() : 'None'}</div>
        <div className="mb-1"><span className="font-semibold">Created at:</span> {new Date(lead.created_at).toLocaleString()}</div>
      </div>
    </div>
  );
}
