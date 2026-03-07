import { Card } from '@/lib/ui/Card';
import { format } from 'date-fns';
import React from 'react';
import Link from 'next/link';

export function LeadTable({ leads }: { leads: any[] }) {
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
          {/* Single map loop for rendering rows */}
          {leads.map((lead) => (
            <tr
              key={lead.id}
              className={
                lead.follow_up_date && new Date(lead.follow_up_date) < new Date()
                  ? 'bg-[#f7b26722]'
                  : ''
              }
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
              <td>{lead.status.replace('_', ' ')}</td>
              <td>
                {lead.follow_up_date ? format(new Date(lead.follow_up_date), 'yyyy-MM-dd') : '-'}
              </td>
              <td>
                {lead.assigned_user?.full_name || lead.assigned_user?.username || 'Unassigned'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
