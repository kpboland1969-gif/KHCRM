import Link from 'next/link';
import { getFollowUpQueue } from '@/lib/followups';
import FollowUpBadge from './FollowUpBadge';

export default async function FollowUpQueue({ userId, role }: { userId: string; role: string }) {
  const leads = await getFollowUpQueue(userId, role);
  if (!leads.length) return null;
  return (
    <div className="rounded-[var(--radius-card)] bg-[var(--card)] p-4 shadow-soft mb-6">
      <div className="font-semibold mb-2">Follow-Ups Due</div>
      <ul className="divide-y divide-[var(--border)]">
        {leads.map((lead: any) => (
          <li key={lead.id} className="py-2 flex items-center justify-between">
            <Link href={`/dashboard/leads/${lead.id}`} className="hover:underline">
              {lead.company_name}
            </Link>
            <FollowUpBadge followUpDate={lead.follow_up_date} />
          </li>
        ))}
      </ul>
    </div>
  );
}
