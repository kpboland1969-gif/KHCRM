import Link from 'next/link';

export default function ManagerQueueTable({ leads }: { leads: any[] }) {
  if (!leads.length) return <div>No missed follow-ups.</div>;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr>
            <th className="text-left p-2">Company</th>
            <th className="text-left p-2">Assigned User</th>
            <th className="text-left p-2">Follow-Up Date</th>
            <th className="text-left p-2">Days Overdue</th>
            <th className="text-left p-2">Last Touched</th>
            <th className="text-left p-2">Link</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.lead_id}>
              <td className="p-2">{lead.company_name}</td>
              <td className="p-2">{lead.assigned_user_id}</td>
              <td className="p-2">{lead.follow_up_date ? new Date(lead.follow_up_date).toLocaleDateString() : '-'}</td>
              <td className="p-2">{lead.days_overdue}</td>
              <td className="p-2">{lead.last_touched_at ? new Date(lead.last_touched_at).toLocaleString() : '-'}</td>
              <td className="p-2">
                <Link href={`/dashboard/leads/${lead.lead_id}`} className="text-[var(--primary)] hover:underline">View</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
