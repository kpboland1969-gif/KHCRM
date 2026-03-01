import { getUserProfile } from '@/lib/getUserProfile';
import { getAssignedLeads } from '@/lib/leads';
import { LeadTable } from '../../components/leads/LeadTable';
import LeadsFiltersClient from '@/app/components/leads/LeadsFiltersClient';
import Link from "next/link";
import { Button } from "@/components/ui/button";

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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
            {/* keep any existing subtitle/description if you have it */}
          </div>

          {/* NEW: Entry point to create a lead */}
          <Link href="/dashboard/leads/new">
            <Button type="button">New Lead</Button>
          </Link>
        </div>

        {/* ...keep the rest of your existing Leads page UI:
            - filters/search client component
            - table
            - pagination
        */}
        <LeadsFiltersClient />
        <LeadTable leads={sortedLeads || []} />
      </div>
    );
}
