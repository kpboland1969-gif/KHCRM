import { Card } from '@/lib/ui/Card';
import { format } from 'date-fns';
import React from 'react';
import Link from 'next/link';

export function LeadTable({ leads, currentUserId }: { leads: any[]; currentUserId?: string }) {
  return (
    <Card className="overflow-x-auto p-0">
      <table className="min-w-full text-sm">
        <thead>
          <tr>
            <th>Company</th>
            <th>Contact</th>
            <th>Status</th>
            <th>Follow-up</th>
            <th>Assigned</th>
          </tr>
        </thead>

        <tbody>
          {leads.map((lead) => {
            const overdue = lead.follow_up_date && new Date(lead.follow_up_date) < new Date();

            const isMine =
              currentUserId && lead.assigned_user_id && lead.assigned_user_id === currentUserId;

            const assignedLabel =
              lead.assigned_user?.full_name ||
              lead.assigned_user?.username ||
              lead.assigned_user?.email ||
              null;

            return (
              <tr
                key={lead.id}
                className={`
                  ${overdue ? 'bg-[#f7b26722]' : ''}
                  ${isMine ? 'border-l-4 border-blue-500' : ''}
                `}
              >
                <td className="font-semibold">
                  <Link
                    href={`/dashboard/leads/${lead.id}`}
                    className="hover:underline text-blue-700"
                  >
                    {lead.company_name}
                  </Link>
                </td>

                <td>{lead.contact_person}</td>

                <td>{lead.status?.replace('_', ' ')}</td>

                <td>
                  {lead.follow_up_date ? format(new Date(lead.follow_up_date), 'yyyy-MM-dd') : '-'}
                </td>

                <td>
                  {assignedLabel ? (
                    assignedLabel
                  ) : (
                    <span className="text-yellow-400 font-medium">Unassigned</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}
