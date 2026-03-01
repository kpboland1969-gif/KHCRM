import { Card } from '@/lib/ui/Card';
import { format } from 'date-fns';
import React from 'react';

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
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => {
            const overdue = lead.follow_up_date && new Date(lead.follow_up_date) < new Date();
            return (
              <tr key={lead.id} className={overdue ? 'bg-[#f7b26722]' : ''}>
                <td className="font-semibold">{lead.company_name}</td>
                <td>{lead.contact_person}</td>
                <td>{lead.status.replace('_', ' ')}</td>
                <td>{lead.follow_up_date ? format(new Date(lead.follow_up_date), 'yyyy-MM-dd') : '-'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}
